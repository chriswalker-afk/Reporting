import {indexData,isDate} from './model.mjs';
import {createAnalytics,gradeFor,attainmentAverage} from './analytics.mjs';

const need=(ok,msg)=>{if(!ok)throw Error(msg);};
const order=(a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id);
export const ANALYSIS_TABS=['student-analysis','class-analysis','faculty-analysis'];
export function createAcademicAnalysis(data,access,scope,classId){
 const ix=indexData(data),engine=createAnalytics(data),cls=ix.classes.get(classId);
 need(cls,'Unknown class');
 const course=ix.courses.get(cls.courseId),subject=ix.subjects.get(course.subjectId),scheme=ix.gradeSchemes.get(course.gradeSchemeId);
 const scopeIds=new Set(access.scopeEnrolments(scope));
 const members=id=>(ix.enrolmentsByClass.get(id)||[]).filter(e=>scopeIds.has(e.id));
 const enrolments=members(classId);
 need(enrolments.length,'Class outside selected scope');
 const allowedClasses=data.classes.filter(c=>members(c.id).length);
 const facultyClasses=allowedClasses.filter(c=>ix.subjects.get(ix.courses.get(c.courseId).subjectId).facultyId===subject.facultyId);
 const parallelClasses=facultyClasses.filter(c=>c.courseId===course.id);
 const units=data.units.filter(u=>u.courseId===course.id).sort((a,b)=>a.order-b.order);
 const visible=a=>a.status==='published'; // No unpublished marks in analytics, even for editors.
 const assessmentOptions=data.assessments.filter(a=>a.classIds.includes(classId)&&visible(a)).sort(order);
 const commonOptions=data.assessments.filter(a=>a.courseId===course.id&&visible(a)&&a.classIds.filter(id=>parallelClasses.some(c=>c.id===id)).length>=2).sort(order);
 const name=e=>ix.students.get(e.studentId).name;
 const roster=enrolments.map(e=>({id:e.id,studentId:e.studentId,name:name(e)})).sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true}));
 function filters(input={}){
  const from=input.from||null,to=input.to||data.asOf,unitId=input.unitId||null;
  need((from===null||isDate(from))&&isDate(to)&&(!from||from<=to),'Choose a valid date range');
  need(to<=data.asOf,'End date cannot be after the demo reference date');
  need(unitId===null||units.some(u=>u.id===unitId),'Unit outside this course');
  return {from,to,unitId};
 }
 const within=(a,o)=>(!o.from||a.date>=o.from)&&a.date<=o.to&&(!o.unitId||a.unitId===o.unitId);
 const enrich=r=>({...r,name:name(ix.enrolments.get(r.enrolmentId)),classCode:ix.classes.get(r.classId).code});
 function summary(id,o){
  const result=engine.classSummary(id,{...o,enrolmentIds:members(id).map(e=>e.id)});
  return {...result,rows:result.rows.map(enrich)};
 }
 function student(id,input={}){
  need(enrolments.some(e=>e.id===id),'Student outside selected class and scope');
  const o=filters(input),s=engine.studentSummary(id,o),scored=s.results.filter(r=>r.status==='scored');
  const cumulative=scored.map((r,i)=>{
   const percent=attainmentAverage(scored.slice(0,i+1),s.calculation.method);
   return {assessmentId:r.id,title:r.title,date:r.date,percent,grade:gradeFor(percent,scheme),result:r.percent};
  });
  const targetBoundary=scheme.bands.find(x=>x.grade===s.minimumGrade)?.min??null;
  const topics=engine.topicSummary([id],o);
  const unitRows=(o.unitId?units.filter(u=>u.id===o.unitId):units).map(u=>({...u,summary:engine.unitSummary(id,u.id,o)}));
  return {summary:enrich(s),cumulative,targetBoundary,topics,units:unitRows,filters:o};
 }
 function classOverview(input={}){
  const o=filters(input),s=summary(classId,o);
  return {...s,filters:o,topics:engine.topicSummary(enrolments.map(e=>e.id),o),assessments:assessmentOptions.filter(a=>within(a,o)),
   eligibleAssessments:assessmentOptions.filter(a=>within(a,o)&&a.includeInSummary)};
 }
 function assessment(id,input={}){
  const o=filters(input),a=assessmentOptions.find(a=>a.id===id&&within(a,o));
  need(a,'Assessment outside selected class/date/unit');
  const result=engine.assessmentAnalysis(a.id,{classIds:[classId],enrolmentIds:enrolments.map(e=>e.id)});
  return {...result,definition:a,rows:result.rows.map(enrich),filters:o};
 }
 function faculty(input={}){
  const o=filters(input);
  const classes=parallelClasses.map(c=>({classId:c.id,code:c.code,...summary(c.id,o)}));
  const courseSummary=engine.cohortSummary(parallelClasses.flatMap(c=>members(c.id).map(e=>e.id)),o).courses.find(c=>c.courseId===course.id);
  // Units are course-specific: do not apply the selected unit to other courses.
  const years=engine.cohortSummary(facultyClasses.flatMap(c=>members(c.id).map(e=>e.id)),{from:o.from,to:o.to}).courses.map(s=>{
   const c=ix.courses.get(s.courseId);
   return {courseId:c.id,name:c.name,year:c.year,subject:ix.subjects.get(c.subjectId).name,...s,rows:s.rows.map(enrich)};
  }).sort((a,b)=>a.year-b.year||a.subject.localeCompare(b.subject));
  return {classes,courseSummary:courseSummary?{...courseSummary,rows:courseSummary.rows.map(enrich)}:null,years,
   common:commonOptions.filter(a=>within(a,o)),filters:o,facultyName:ix.faculties.get(subject.facultyId).name};
 }
 function common(id,input={}){
  const o=filters(input),a=commonOptions.find(a=>a.id===id&&within(a,o));
  need(a,'Common assessment outside selected course/date/unit');
  const classes=parallelClasses.filter(c=>a.classIds.includes(c.id));
  const rows=classes.map(c=>({classId:c.id,code:c.code,...engine.assessmentAnalysis(id,{classIds:[c.id],enrolmentIds:members(c.id).map(e=>e.id)})}));
  const total=engine.assessmentAnalysis(id,{classIds:classes.map(c=>c.id),enrolmentIds:classes.flatMap(c=>members(c.id).map(e=>e.id))});
  return {definition:a,classes:rows,total:{...total,rows:total.rows.map(enrich)},filters:o};
 }
 function topicEvidence(topic,input={},studentId=null){
  const o=filters(input);
  if(studentId!==null)need(enrolments.some(e=>e.id===studentId),'Student outside selected class and scope');
  const entries=enrolments.filter(e=>!studentId||e.id===studentId).flatMap(e=>engine.studentSummary(e.id,o).results.filter(r=>r.status==='scored').flatMap(r=>{
   const a=ix.assessments.get(r.id);
   return a.items.filter(i=>i.topic===topic).map(i=>({enrolmentId:e.id,studentId:e.studentId,name:name(e),assessmentId:a.id,title:a.title,date:a.date,item:i.label,earned:r.marks[i.id],available:i.maxMarks}));
  }));
  return entries;
 }
 function drilldown(input){
  const {kind,key,assessmentId,studentId}=input,o=filters(input);
  if(kind==='topic')return {kind,rows:topicEvidence(key,o,studentId||null)};
  if(kind==='item'||kind==='assessment-topic'||kind==='ao'){
   const result=assessment(assessmentId,o),items=result.definition.items.filter(i=>kind==='item'?i.id===key:kind==='assessment-topic'?i.topic===key:i.ao===key);
   need(items.length,'Unknown question/topic/objective');
   return {kind,rows:result.rows.filter(r=>r.status==='scored').map(r=>({...r,earned:items.reduce((n,i)=>n+r.marks[i.id],0),available:items.reduce((n,i)=>n+i.maxMarks,0)}))};
  }
  let rows;
  if(kind.startsWith('assessment-'))rows=assessment(assessmentId,o).rows;
  else if(kind==='common-class'){
   const c=common(assessmentId,o);need(c.classes.some(x=>x.classId===key),'Class outside comparison');
   rows=c.total.rows.filter(r=>r.classId===key);
  }else if(kind==='faculty-class'){
   const f=faculty(o),c=f.classes.find(c=>c.classId===key);need(c,'Class outside comparison');rows=c.rows;
  }else if(kind==='faculty-course'){
   const c=faculty(o).years.find(c=>c.courseId===key);need(c,'Course outside comparison');rows=c.rows;
  }else rows=classOverview(o).rows;
  if(kind==='grade'||kind==='assessment-grade'){
   const bands=kind==='grade'?scheme.bands:ix.gradeSchemes.get(ix.assessments.get(assessmentId).gradeSchemeId).bands;
   need(bands.some(b=>b.grade===key),'Unknown grade');rows=rows.filter(r=>r.grade===key);
  }
  else if(kind==='histogram'||kind==='assessment-histogram'){
   const lo=Number(key);need(Number.isInteger(lo)&&lo>=0&&lo<=90&&lo%10===0,'Invalid histogram bin');
   rows=rows.filter(r=>{const v=kind==='histogram'?r.average:r.percent;return v!==null&&v>=lo&&(v<lo+10||lo===90&&v===100);});
  }else if(kind==='target'){
   need(['below','on','unknown'].includes(key),'Unknown target status');rows=rows.filter(r=>key==='below'?r.onTrack===false:key==='on'?r.onTrack===true:r.onTrack===null);
  }
  else if(kind==='assessment-status')rows=rows.filter(r=>r.status===key);
  else need(['faculty-class','faculty-course','common-class','all'].includes(kind),'Unknown analysis selection');
  return {kind,rows};
 }
 return {classId,classCode:cls.code,course,scheme,roster,units,assessmentOptions,commonOptions,parallelCount:parallelClasses.length,
  asOf:data.asOf,filters,student,classOverview,assessment,faculty,common,drilldown};
}
