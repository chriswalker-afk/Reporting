import {indexData,resultKey,finite,isDate} from './model.mjs';

export function gradeFor(percent,scheme){
  if(!finite(percent)||percent<0||percent>100||!scheme?.bands?.length)return null;
  return [...scheme.bands].reverse().find(b=>percent>=b.min)?.grade??null;
}
export function gradeDistance(current,reference,scheme){
  if(current==null||reference==null)return null;
  const labels=scheme.bands.map(b=>b.grade),i=labels.indexOf(current),j=labels.indexOf(reference);
  return i<0||j<0?null:i-j;
}
export function distanceToNextGrade(percent,scheme){
  if(!finite(percent)||percent<0||percent>100)return null;
  const next=scheme.bands.find(b=>b.min>percent);
  return next?{grade:next.grade,percentagePoints:next.min-percent}:null;
}
export const mean=xs=>xs.length?xs.reduce((s,x)=>s+x,0)/xs.length:null;
export function weightedMean(entries){
  const total=entries.reduce((s,x)=>s+x.weight,0);
  if(total<=0)return null;
  const values=entries.filter(x=>x.weight>0).map(x=>x.value);
  // A weighted mean must be within the range of its contributing values.
  // Clamping round-off here keeps perfect scores at exactly 100, including fractional weights.
  return Math.max(Math.min(...values),Math.min(Math.max(...values),entries.reduce((s,x)=>s+x.value*x.weight,0)/total));
}
// Linear interpolation at (n-1)*p (Hyndman-Fan type 7); documented, no rounding.
export function quantile(values,p){
  if(!values.length)return null;
  if(!finite(p)||p<0||p>1||values.some(v=>!finite(v)))throw new Error('Invalid quantile input');
  const sorted=[...values].sort((a,b)=>a-b),index=(sorted.length-1)*p,lo=Math.floor(index),hi=Math.ceil(index);
  return sorted[lo]+(index-lo)*(sorted[hi]-sorted[lo]);
}
export function describe(values){
  if(values.some(v=>!finite(v)))throw new Error('Statistics require finite numeric values');
  const n=values.length,m=mean(values);
  if(!n)return {n:0,mean:null,minimum:null,q1:null,median:null,q3:null,maximum:null,populationSD:null};
  return {n,mean:m,minimum:Math.min(...values),q1:quantile(values,.25),median:quantile(values,.5),
    q3:quantile(values,.75),maximum:Math.max(...values),populationSD:Math.sqrt(mean(values.map(v=>(v-m)**2)))};
}
export function histogram(values,edges=[0,10,20,30,40,50,60,70,80,90,100]){
  if(edges.length<2||edges.some((e,i)=>!finite(e)||(i&&e<=edges[i-1])))throw new Error('Invalid histogram edges');
  const buckets=edges.slice(0,-1).map((lo,i)=>({lo,hi:edges[i+1],inclusiveUpper:i===edges.length-2,count:0}));
  for(const v of values){
    if(!finite(v))throw new Error('Histogram requires finite numbers');
    const b=buckets.find(b=>v>=b.lo&&(v<b.hi||(b.inclusiveUpper&&v===b.hi)));
    if(!b)throw new Error('Value outside histogram range');
    b.count++;
  }
  return buckets;
}
const countsByStatus=results=>{
  const c={eligible:results.length,scored:0,missing:0,absent:0,incomplete:0,excluded:0};
  for(const r of results)c[r.status]++;
  return c;
};
const order=(a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id);

/** All views receive these selectors. A new instance must be made for a new snapshot. */
export function createAnalytics(data){
  const ix=indexData(data);
  const courseFor=e=>ix.courses.get(ix.classes.get(e?.classId)?.courseId);
  const schemeFor=e=>ix.gradeSchemes.get(courseFor(e)?.gradeSchemeId);
  const maxFor=a=>a.items.reduce((s,i)=>s+i.maxMarks,0);
  function resultFor(assessmentId,enrolmentId){
    const a=ix.assessments.get(assessmentId),e=ix.enrolments.get(enrolmentId);
    if(!a||!e||!a.classIds.includes(e.classId))throw new Error('Assessment not assigned to enrolment');
    const r=ix.resultsByPair.get(resultKey(assessmentId,enrolmentId)),maxMarks=maxFor(a);
    const marks=r?.marks??{},complete=r?.status==='present'&&a.items.every(i=>Object.hasOwn(marks,i.id));
    const rawMark=complete?a.items.reduce((s,i)=>s+marks[i.id],0):null;
    const recordedPercent=rawMark===null?null:rawMark===maxMarks?100:Math.min(100,100*rawMark/maxMarks);
    const status=r?.exclusionReason?'excluded':!r||r.status==='missing'?'missing':
      r.status==='absent'?'absent':complete?'scored':'incomplete';
    const percent=status==='scored'?recordedPercent:null;
    return {assessmentId,enrolmentId,studentId:e.studentId,classId:e.classId,
      status,maxMarks,rawMark,recordedPercent,percent,grade:gradeFor(percent,ix.gradeSchemes.get(a.gradeSchemeId)),
      recordedGrade:gradeFor(recordedPercent,ix.gradeSchemes.get(a.gradeSchemeId)),marks:{...marks},
      exclusionReason:r?.exclusionReason??null,includeInSummary:a.includeInSummary&&a.status==='published'};
  }
  function selection(options={}){
    const from=options.from??null,to=options.to??data.asOf;
    if((from!==null&&!isDate(from))||!isDate(to)||(from&&from>to))throw new Error('Invalid analysis date range');
    return a=>(!from||a.date>=from)&&a.date<=to&&(!options.unitId||a.unitId===options.unitId);
  }
  function studentSummary(enrolmentId,options={}){
    const e=ix.enrolments.get(enrolmentId);
    if(!e)throw new Error('Unknown enrolment');
    const scheme=schemeFor(e),eligible=(ix.assessmentsByClass.get(e.classId)||[])
      .filter(a=>a.status==='published'&&a.includeInSummary&&selection(options)(a)).sort(order);
    const rows=eligible.map(a=>({...resultFor(a.id,e.id),id:a.id,title:a.title,date:a.date,unitId:a.unitId,weight:a.weight}));
    const scored=rows.filter(r=>r.status==='scored');
    const average=weightedMean(scored.map(r=>({value:r.percent,weight:r.weight})));
    const grade=gradeFor(average,scheme),t=ix.targetsByEnrolment.get(enrolmentId);
    const minimumGrade=t?.minimumGrade??null,predictedGrade=t?.predictedGrade??null;
    const gapToTarget=gradeDistance(grade,minimumGrade,scheme);
    const gapToPrediction=gradeDistance(grade,predictedGrade,scheme);
    const latest=scored.at(-1)??null;
    const best=[...scored].sort((a,b)=>b.percent-a.percent||order(a,b))[0]??null;
    const weakest=[...scored].sort((a,b)=>a.percent-b.percent||order(a,b))[0]??null;
    return {studentId:e.studentId,enrolmentId,classId:e.classId,courseId:courseFor(e).id,
      average,grade,minimumGrade,predictedGrade,gapToTarget,gapToPrediction,
      predictedGapToTarget:gradeDistance(predictedGrade,minimumGrade,scheme),
      onTrack:gapToTarget===null?null:gapToTarget>=0,
      nextGrade:distanceToNextGrade(average,scheme),latest,best,weakest,
      coverage:countsByStatus(rows),trend:scored.map(r=>({assessmentId:r.assessmentId,date:r.date,percent:r.percent,grade:r.grade})),
      results:rows};
  }
  function unitSummary(enrolmentId,unitId,options={}){
    const e=ix.enrolments.get(enrolmentId);
    if(!e||ix.units.get(unitId)?.courseId!==courseFor(e)?.id)throw new Error('Unit not in enrolment course');
    return studentSummary(enrolmentId,{...options,unitId});
  }
  function studentOverview(studentId,{enrolmentIds,...options}={}){
    if(!ix.students.has(studentId))throw new Error('Unknown student');
    const allowed=enrolmentIds?new Set(enrolmentIds):null;
    return (ix.enrolmentsByStudent.get(studentId)||[]).filter(e=>!allowed||allowed.has(e.id))
      .map(e=>studentSummary(e.id,options));
  }
  const distribution=(rows,scheme)=>scheme.bands.map(b=>({grade:b.grade,count:rows.filter(r=>r.grade===b.grade).length}));
  function summariseEnrolments(enrolments,options={}){
    const rows=enrolments.map(e=>studentSummary(e.id,options)),scored=rows.filter(r=>r.average!==null);
    const stats=describe(scored.map(r=>r.average));
    const scheme=enrolments.length?schemeFor(enrolments[0]):null;
    return {rows,statistics:stats,mean:stats.mean,grade:gradeFor(stats.mean,scheme),
      coverage:{eligible:rows.length,scored:scored.length,missing:rows.length-scored.length,
        assessmentResults:rows.reduce((s,r)=>s+r.coverage.scored,0),
        assessmentOpportunities:rows.reduce((s,r)=>s+r.coverage.eligible,0)},
      belowTarget:rows.filter(r=>r.gapToTarget!==null&&r.gapToTarget<0).map(r=>r.enrolmentId),
      twoOrMoreBelow:rows.filter(r=>r.gapToTarget!==null&&r.gapToTarget<=-2).map(r=>r.enrolmentId),
      onTrack:rows.filter(r=>r.onTrack===true).length,unknownTargetStatus:rows.filter(r=>r.onTrack===null).length,
      gradeDistribution:scheme?distribution(scored,scheme):[],histogram:histogram(scored.map(r=>r.average))};
  }
  function classSummary(classId,options={}){
    if(!ix.classes.has(classId))throw new Error('Unknown class');
    const allowed=options.enrolmentIds?new Set(options.enrolmentIds):null;
    const es=(ix.enrolmentsByClass.get(classId)||[]).filter(e=>!allowed||allowed.has(e.id));
    return {classId,courseId:ix.classes.get(classId).courseId,...summariseEnrolments(es,options)};
  }
  function cohortSummary(enrolmentIds,options={}){
    const unique=[...new Set(enrolmentIds)],enrolments=unique.map(id=>{
      const e=ix.enrolments.get(id);if(!e)throw new Error('Unknown enrolment '+id);return e;
    });
    const groups=new Map();
    for(const e of enrolments){const c=courseFor(e).id;if(!groups.has(c))groups.set(c,[]);groups.get(c).push(e);}
    const courses=[...groups].map(([courseId,es])=>({courseId,...summariseEnrolments(es,options)}));
    return {students:new Set(enrolments.map(e=>e.studentId)).size,enrolments:enrolments.length,courses,
      belowTarget:courses.flatMap(c=>c.belowTarget),twoOrMoreBelow:courses.flatMap(c=>c.twoOrMoreBelow),
      onTrack:courses.reduce((s,c)=>s+c.onTrack,0),unknownTargetStatus:courses.reduce((s,c)=>s+c.unknownTargetStatus,0)};
    // Deliberately no cross-course mean: unlike grading schemes are not comparable.
  }
  function assessmentAnalysis(assessmentId,options={}){
    const a=ix.assessments.get(assessmentId);
    if(!a)throw new Error('Unknown assessment');
    const classIds=options.classIds??a.classIds;
    if(classIds.some(id=>!a.classIds.includes(id)))throw new Error('Cannot compare classes not assigned to this common assessment');
    const allowed=options.enrolmentIds?new Set(options.enrolmentIds):null;
    const rows=[...new Set(classIds)].flatMap(id=>(ix.enrolmentsByClass.get(id)||[])
      .filter(e=>!allowed||allowed.has(e.id)).map(e=>resultFor(a.id,e.id)));
    const scored=rows.filter(r=>r.status==='scored'),values=scored.map(r=>r.percent),statistics=describe(values);
    const breakdown=(items,kind)=>{
      const groups=new Map();
      for(const item of items){
        const label=kind==='item'?item.id:item[kind];
        if(label==null)continue;
        if(!groups.has(label))groups.set(label,[]);
        groups.get(label).push(item);
      }
      return [...groups].map(([id,group])=>{
        const earned=scored.reduce((s,r)=>s+group.reduce((t,i)=>t+r.marks[i.id],0),0);
        const available=scored.length*group.reduce((s,i)=>s+i.maxMarks,0);
        return {id,label:kind==='item'?group[0].label:id,earned,available,percent:available?100*earned/available:null,n:scored.length};
      });
    };
    const scheme=ix.gradeSchemes.get(a.gradeSchemeId);
    return {assessmentId,title:a.title,published:a.status==='published',included:a.includeInSummary,
      rows,coverage:countsByStatus(rows),statistics,grade:gradeFor(statistics.mean,scheme),histogram:histogram(values),
      gradeDistribution:distribution(scored,scheme),items:breakdown(a.items,'item'),topics:breakdown(a.items,'topic'),objectives:breakdown(a.items,'ao')};
  }
  function compareCommonAssessment(assessmentId,classIds){
    const a=ix.assessments.get(assessmentId);
    if(!a)throw new Error('Unknown assessment');
    return [...new Set(classIds??a.classIds)].map(classId=>({classId,...assessmentAnalysis(assessmentId,{classIds:[classId]})}));
  }
  function topicSummary(enrolmentIds,options={}){
    const ids=[...new Set(enrolmentIds)],es=ids.map(id=>ix.enrolments.get(id));
    if(es.some(e=>!e))throw new Error('Unknown enrolment');
    if(new Set(es.map(e=>courseFor(e).id)).size>1)throw new Error('Topic summaries require one course');
    const groups=new Map();
    for(const e of es)for(const r of studentSummary(e.id,options).results){
      if(r.status!=='scored')continue;
      const a=ix.assessments.get(r.assessmentId);
      for(const item of a.items){
        if(!item.topic)continue;
        if(!groups.has(item.topic))groups.set(item.topic,{topic:item.topic,earned:0,available:0,items:0,students:new Set()});
        const g=groups.get(item.topic);
        g.earned+=r.marks[item.id];g.available+=item.maxMarks;g.items++;g.students.add(e.studentId);
      }
    }
    return [...groups.values()].map(({students,...g})=>({...g,students:students.size,percent:100*g.earned/g.available}))
      .sort((a,b)=>b.percent-a.percent||a.topic.localeCompare(b.topic));
  }
  function interventionSummary(caseIds,asOf=data.asOf){
    if(!isDate(asOf))throw new Error('Invalid intervention date');
    const allowed=new Set(caseIds),all=data.interventions.filter(c=>allowed.has(c.id)),active=all.filter(c=>c.state!=='closed');
    return {active:active.length,closed:all.length-active.length,students:new Set(active.map(c=>ix.enrolments.get(c.enrolmentId).studentId)).size,
      waves:[1,2,3].map(wave=>({wave,count:active.filter(c=>c.wave===wave).length})),
      reviewsDue:active.filter(c=>c.reviewDate<=asOf).map(c=>c.id),
      overdue:active.filter(c=>c.reviewDate<asOf).map(c=>c.id),
      referrals:active.filter(c=>c.state.endsWith('_requested')).map(c=>c.id)};
  }
  return {resultFor,studentSummary,unitSummary,studentOverview,classSummary,cohortSummary,
    assessmentAnalysis,compareCommonAssessment,topicSummary,interventionSummary};
}
