import {rankedEvidence,evidenceShare} from './assessment-refinement.mjs';
import {pupilIdentity} from './branding.mjs';
import {pct,displayDate,gradeGap} from './workspace.mjs';
import {bookId} from './markbook-views.mjs';
import {ANALYSIS_TABS} from './academic-analysis.mjs';

const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=v=>v??0;
const num=v=>v==null?'—':v.toFixed(1);
const btn=(label,action,id='',kind='')=>'<button type="button" class="btn '+kind+'" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const link=(label,action,id)=>'<button type="button" class="inline-link" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const tag=(label,kind='')=>'<span class="tag '+kind+'">'+e(label)+'</span>';
const help=(id,label)=>'<button type="button" class="help" data-help="'+e(id)+'" aria-label="'+e('About '+label)+'" aria-expanded="false">ⓘ</button>';
const empty=(title,detail='')=>'<div class="empty"><strong>'+e(title)+'</strong>'+e(detail)+'</div>';
const panel=(title,body,tip='',extra='')=>'<section class="surface analysis-panel"><div class="panel-head"><h2>'+e(title)+(tip?help(tip,title):'')+'</h2>'+extra+'</div><div class="panel-body">'+body+'</div></section>';
const metric=(label,value,foot='',tip='')=>'<div class="metric"><div class="metric-head">'+e(label)+(tip?help(tip,label):'')+'</div><div class="metric-value">'+e(value)+'</div><div class="metric-foot">'+e(foot)+'</div></div>';
const select=(id,options,value,label)=>'<label class="analysis-field">'+e(label)+'<select class="select" id="'+e(id)+'" aria-label="'+e(label)+'">'+options.map(([k,l])=>'<option value="'+e(k)+'" '+(k===value?'selected':'')+'>'+e(l)+'</option>').join('')+'</select></label>';
const table=(head,rows,caption)=>rows.length?'<div class="table-scroll analysis-table" role="region" tabindex="0" aria-label="'+e(caption)+'"><table class="data-table"><thead><tr>'+head.map((h,i)=>'<th scope="col" '+(i===0?'class="sticky-first"':'')+'>'+e(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,i)=>'<td '+(i===0?'class="sticky-first"':'')+'>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':empty('No records in this selection');
const coverage=s=>s.coverage.scored+'/'+s.coverage.eligible;
const range=s=>s.n?num(s.minimum)+' – '+num(s.maximum):'—';
const gap=v=>'<span class="'+(v!=null&&v<0?'negative':v!=null?'positive':'muted')+'">'+e(gradeGap(v))+'</span>';
const capped=v=>Math.max(0,Math.min(100,v??0));
export const analysisId=(classId,kind,key,filters={},extra={})=>JSON.stringify({classId,kind,key,from:filters.from??null,to:filters.to??null,unitId:filters.unitId??null,...extra});
const drill=(label,id)=>link(label,'analysis-evidence',id);
const bar=(label,value,id,annotation='',scale=100)=>{
 const width=scale>0?capped(100*(value??0)/scale):0;
 return '<button type="button" class="analysis-bar" data-action="analysis-evidence" data-id="'+e(id)+'" aria-label="'+e(label+': '+annotation)+'"><span class="bar-label">'+e(label)+'</span><span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:'+width.toFixed(3)+'%"></span></span><span class="bar-value">'+e(annotation)+'</span></button>';
};
function distributions(a,s,o,assessmentId=null){
 const prefix=assessmentId?'assessment-':'',extra=assessmentId?{assessmentId}:{};
 const n=s.statistics.n;
 const gradeBars=s.gradeDistribution.map(g=>bar(g.grade,g.count,analysisId(a.classId,prefix+'grade',g.grade,o,extra),g.count+' · '+pct(evidenceShare(g.count,n)),Math.max(1,n))).join('');
 const maxCount=Math.max(1,...s.histogram.map(b=>b.count)),step=Math.max(1,Math.ceil(maxCount/4)),max=step*4;
 const bins='<div class="histogram-layout"><div class="histogram-y" aria-hidden="true">'+[4,3,2,1,0].map(i=>'<span>'+i*step+'</span>').join('')+'</div><div class="frequency-chart" role="group" aria-label="Histogram of scored percentages; vertical axis frequency, maximum '+max+'">'+s.histogram.map(b=>{
  const id=analysisId(a.classId,prefix+'histogram',String(b.lo),o,extra),label=b.lo+' to '+b.hi+(b.inclusiveUpper?' inclusive':' (upper bound excluded)'),height=100*b.count/max;
  return '<button type="button" class="frequency-bin" data-action="analysis-evidence" data-id="'+e(id)+'" aria-label="'+e(label+': '+b.count+' pupils')+'"><span class="frequency-column"><span class="frequency-count" style="bottom:'+height+'%">'+b.count+'</span><span class="frequency-fill" style="height:'+height+'%"></span></span><span class="frequency-label">'+b.lo+'</span></button>';
 }).join('')+'<span class="frequency-end">100</span></div></div><p class="small muted histogram-caption">Horizontal: percentage (%) · Vertical: frequency · Select a bin for pupils.</p>';

 return '<div class="analysis-grid">'+panel('Grade distribution',n?'<p class="small muted">Scored pupils: '+n+'. Bars show the share of scored pupils; select a grade for evidence.</p><div class="bar-list">'+gradeBars+'</div>':empty('No scored pupils'),'analysisDistribution')+
 panel('Percentage distribution',n?'<p class="small muted">Frequency by 10-percentage-point bin.</p>'+bins+'':empty('No scored pupils'),'analysisBins')+'</div>';
}
function boxPlot(s,label){
 if(!s.n)return '<div class="box-empty muted">No scored results</div>';
 const x=v=>12+2.76*v;
 return '<svg class="boxplot" viewBox="0 0 300 48" role="img" aria-label="'+e(label+': minimum '+num(s.minimum)+', Q1 '+num(s.q1)+', median '+num(s.median)+', Q3 '+num(s.q3)+', maximum '+num(s.maximum))+'">'+
 [0,25,50,75,100].map(v=>'<line x1="'+x(v)+'" y1="4" x2="'+x(v)+'" y2="30" stroke="#dce4eb"/><text x="'+x(v)+'" y="43" text-anchor="middle" font-size="9" fill="#607486">'+v+'</text>').join('')+
 '<line x1="'+x(s.minimum)+'" y1="17" x2="'+x(s.maximum)+'" y2="17" stroke="#34596b" stroke-width="1.5"/>'+
 [s.minimum,s.maximum].map(v=>'<line x1="'+x(v)+'" y1="10" x2="'+x(v)+'" y2="24" stroke="#34596b" stroke-width="1.5"/>').join('')+
 '<rect x="'+x(s.q1)+'" y="6" width="'+Math.max(.7,x(s.q3)-x(s.q1))+'" height="22" fill="#d6ebe7" stroke="#176f70" stroke-width="1.3"/><line x1="'+x(s.median)+'" y1="6" x2="'+x(s.median)+'" y2="28" stroke="#125c60" stroke-width="2"/></svg>';
}
function statistics(s,label){
 return s.n?boxPlot(s,label)+'<div class="five-number">'+[['Min',s.minimum],['Q1',s.q1],['Median',s.median],['Q3',s.q3],['Max',s.maximum]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+num(v)+'</strong></div>').join('')+'</div><p class="small muted">Mean '+num(s.mean)+'% · Population SD '+num(s.populationSD)+' pp · n = '+s.n+'</p>':empty('No scored results');
}
export function trendChart(s){
 const points=s.cumulative;
 if(!points.length)return empty('No eligible scored assessments','Record and publish complete marks to see attainment over time.');
 const x=i=>points.length===1?254:40+i*(428/(points.length-1)),y=v=>140-1.12*v;
 const line=(key,color,dash='')=>'<polyline points="'+points.map((p,i)=>x(i)+','+y(p[key])).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.3" '+dash+'/>';
 return '<svg class="trend-chart" viewBox="0 0 500 172" role="img" aria-label="Assessment percentages and cumulative weighted attainment by assessment sequence">'+
 [0,25,50,75,100].map(v=>'<line x1="40" y1="'+y(v)+'" x2="468" y2="'+y(v)+'" stroke="#e0e7eb"/><text x="31" y="'+(y(v)+3)+'" font-size="10" fill="#607486" text-anchor="end">'+v+'%</text>').join('')+
 (s.targetBoundary==null?'':'<line x1="40" y1="'+y(s.targetBoundary)+'" x2="468" y2="'+y(s.targetBoundary)+'" stroke="#9d731e" stroke-dasharray="5 4" stroke-width="1.5"/>')+
 line('result','#8597a6','stroke-dasharray="4 3"')+line('percent','#176f70')+
 points.map((p,i)=>'<circle cx="'+x(i)+'" cy="'+y(p.result)+'" r="3" fill="#8597a6"/><circle cx="'+x(i)+'" cy="'+y(p.percent)+'" r="3.5" fill="#176f70"/>'+(points.length<=10||i===0||i===points.length-1?'<text x="'+x(i)+'" y="155" font-size="9" fill="#607486" text-anchor="middle">'+(i+1)+'</text>':'')).join('')+
 '<text x="254" y="169" text-anchor="middle" font-size="10" fill="#607486">Assessment sequence (dates below)</text></svg><div class="chart-legend"><span><i class="legend-dot"></i> Cumulative weighted %</span><span><i class="legend-dot result-dot"></i> Assessment %</span>'+(s.targetBoundary==null?'':'<span><i class="legend-dot target-dot"></i> MTG boundary '+num(s.targetBoundary)+'%</span>')+'</div>';
}
const evidenceAxis=()=>'<div class="teaching-axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>';
function rankedBars(rows,idFor){
 const ordered=rankedEvidence(rows);
 return '<div class="teaching-rank-head"><span>Lowest observed first</span>'+evidenceAxis()+'</div><div class="teaching-rank-list">'+ordered.map(r=>{
  const valid=Number.isFinite(r.percent)&&r.available>0,label=r.topic??r.label??r.id,n=r.students??r.n;
  return '<button type="button" class="teaching-evidence'+(valid?'':' no-evidence')+'" data-action="analysis-evidence" data-id="'+e(idFor(r))+'" aria-label="'+e(label+': '+(valid?pct(r.percent)+', '+r.earned+'/'+r.available+' marks, '+n+' contributing pupils':'no scored evidence'))+'">'+
   '<div class="teaching-evidence-label"><strong>'+e(label)+'</strong><span class="small muted">'+(valid?e(r.earned+'/'+r.available+' marks · '+n+' pupil'+(n===1?'':'s')):'No scored evidence')+'</span></div>'+
   '<span class="teaching-track" aria-hidden="true">'+(valid?'<span class="teaching-fill" style="width:'+capped(r.percent)+'%"></span>':'')+'</span><strong class="teaching-value">'+e(valid?pct(r.percent):'—')+'</strong></button>';
 }).join('')+'</div>';
}
function topicPanel(a,topics,o,studentId=null){
 return panel('Topic strengths and areas to revisit',topics.length?rankedBars(topics,t=>analysisId(a.classId,'topic',t.topic,o,{studentId})):
 empty('No eligible topic-tagged marks','Total-only tests cannot supply topic evidence.'),'teachingPriority');
}
function analysisFocus(title,items){
 return '<section class="surface analysis-focus"><div class="panel-head"><h2>'+e(title)+'</h2></div><div class="analysis-focus-items">'+items.map(x=>'<button type="button" class="analysis-focus-card '+(x.tone??'')+'" data-action="analysis-evidence" data-id="'+e(x.id)+'"><span class="analysis-focus-label">'+e(x.label)+'</span><strong>'+e(x.value)+'</strong><span class="small muted">'+e(x.detail)+'</span><span class="analysis-focus-link">View evidence →</span></button>').join('')+'</div></section>';
}
function studentView(a,s,o){
 const selected=a.roster.some(r=>r.id===s.analysisStudent)?s.analysisStudent:a.roster[0]?.id;
 if(!selected)return empty('No pupils in scope');
 const d=a.student(selected,o),r=d.summary;
 const chart=trendChart(d),unitRows=d.units.map(u=>[e(u.title),e(pct(u.summary.average)),e(u.summary.grade??'—'),e(coverage(u.summary)),gap(u.summary.gapToTarget)]);
 const resultRows=r.results.map(x=>{
  const cumulative=d.cumulative.find(p=>p.assessmentId===x.id);
  return [link(x.title,'open-markbook',bookId(a.classId,x.id,selected)),e(displayDate(x.date)),e(x.rawMark===null?'—':x.rawMark+'/'+x.maxMarks),e(pct(x.percent)),e(x.grade??'—'),e(x.weight),e(pct(cumulative?.percent)),tag(x.status,x.status==='excluded'?'tag-warning':'')];
 });
 return '<div class="analysis-subtoolbar">'+select('analysis-student',a.roster.map(p=>[p.id,p.name]),selected,'Student')+btn('Student profile','open-student',r.studentId)+'<span class="muted small">Subject: '+e(a.course.name)+'</span></div>'+
 '<div class="metrics">'+metric('Overall attainment',pct(r.average),'Grade '+(r.grade??'—'),'studentAverage')+metric('Minimum target',r.minimumGrade??'—','Grade gap '+gradeGap(r.gapToTarget),'target')+metric('Next grade',r.nextGrade?num(r.nextGrade.percentagePoints)+' pp':'—',r.nextGrade?'To grade '+r.nextGrade.grade:'No next grade / insufficient evidence','nextGrade')+metric('Results scored',coverage(r),r.coverage.excluded+' excluded · '+r.coverage.absent+' absent','resultCoverage')+'</div>'+
 '<div class="analysis-grid">'+panel('Attainment over time',chart,'analysisTrend')+topicPanel(a,d.topics,o,selected)+'</div>'+
 '<div class="analysis-grid">'+panel('Curriculum units',table(['Unit','Average','Grade','Scored','Δ MTG'],unitRows,'Unit summaries'),'studentAverage')+
 panel('Assessment highlights','<div class="highlight-list">'+[['Latest',r.latest],['Strongest observed',r.best],['Weakest observed',r.weakest]].map(([label,x])=>'<div><span class="muted small">'+label+'</span><strong>'+e(x?pct(x.percent):'—')+'</strong><span>'+ (x?link(x.title,'open-markbook',bookId(a.classId,x.id,selected)):'No result')+'</span></div>').join('')+'</div><p class="small muted">Observed scores may reflect different assessment difficulty.</p>','latest')+'</div>'+
 panel('Assessment evidence',table(['Assessment','Date','Mark','%','Grade','Weight','Cumulative %','Status'],resultRows,'Student assessment evidence'),'analysisTrend')+
 '<p class="stage-note">Prediction: '+e(r.predictedGrade??'Not entered')+' · Current minus predicted grade: '+e(gradeGap(r.gapToPrediction))+'. Drafts, diagnostics and excluded assessments do not contribute to the trend.</p>';
}
function breakdown(a,d,o,kind,rows,title){
 return panel(title,rows.length?rankedBars(rows,r=>analysisId(a.classId,kind,r.id,o,{assessmentId:d.assessmentId})):empty('No tagged data for this breakdown'),'teachingPriority');
}
function classView(a,s,o){
 const d=a.classOverview(o),selected=d.assessments.some(x=>x.id===s.analysisAssessment)?s.analysisAssessment:'';
 const sub='<div class="analysis-subtoolbar">'+select('analysis-assessment',[['','Overall / unit attainment'],...d.assessments.map(x=>[x.id,x.title+(x.includeInSummary?'':' · diagnostic')])],selected,'Analyse')+'</div>';
 if(selected){
  const x=a.assessment(selected,o),c=x.coverage;
  return sub+'<div class="analysis-context">'+tag(x.included?'Included in summaries':'Diagnostic / summary-excluded',x.included?'tag-success':'tag-warning')+'<span class="muted small">'+e(displayDate(x.definition.date))+' · '+e(x.definition.mode)+' · '+e(x.definition.items.reduce((n,i)=>n+i.maxMarks,0))+' marks</span>'+btn('Open markbook','open-markbook',bookId(a.classId,x.assessmentId))+'</div>'+
  '<div class="metrics">'+metric('Assessment mean',pct(x.statistics.mean),x.statistics.n+' scored pupils','analysisAssessment')+metric('Median',pct(x.statistics.median),'SD '+num(x.statistics.populationSD)+' pp','analysisBox')+metric('Results scored',coverage(x),c.absent+' absent · '+c.missing+' missing','analysisCoverage')+metric('Excluded / incomplete',c.excluded+c.incomplete,c.excluded+' excluded · '+c.incomplete+' incomplete','analysisCoverage')+'</div>'+
  analysisFocus('Follow up assessment evidence',[
   {label:'Missing results',value:c.missing,detail:'Of '+c.eligible+' scoped pupils',id:analysisId(a.classId,'assessment-status','missing',o,{assessmentId:x.assessmentId}),tone:c.missing?'attention':''},
   {label:'Incomplete results',value:c.incomplete,detail:'Partial marks are not scored',id:analysisId(a.classId,'assessment-status','incomplete',o,{assessmentId:x.assessmentId}),tone:c.incomplete?'attention':''},
   {label:'Absent pupils',value:c.absent,detail:'Review missed sittings',id:analysisId(a.classId,'assessment-status','absent',o,{assessmentId:x.assessmentId})}
  ])+
  (x.definition.mode==='total'?panel('Question and topic analysis',empty('Total-only assessment','No question or topic breakdown was recorded for this assessment.')): '<div class="analysis-grid teaching-grid">'+breakdown(a,x,o,'item',x.items,x.definition.mode==='topics'?'Topic items':'Question-level analysis')+breakdown(a,x,o,'assessment-topic',x.topics,'Topic analysis')+'</div>'+breakdown(a,x,o,'ao',x.objectives,'Assessment objectives'))+
  distributions(a,x,o,x.assessmentId)+
  '<div class="analysis-grid">'+panel('Assessment box plot',statistics(x.statistics,x.title),'analysisBox')+
  panel('Result coverage','<div class="bar-list">'+['scored','absent','missing','incomplete','excluded'].map(k=>bar(k,c[k],analysisId(a.classId,'assessment-status',k,o,{assessmentId:x.assessmentId}),c[k]+' / '+c.eligible,Math.max(1,c.eligible))).join('')+'</div>','analysisCoverage')+'</div>';
 }
 const c=d.coverage,targetRows=[['below','Below target',d.belowTarget.length],['on','On / above target',d.onTrack],['unknown','Unknown',d.unknownTargetStatus]];
 const comparison=d.assessments.map(x=>{const v=a.assessment(x.id,o);return [link(x.title,'analysis-select-assessment',x.id),e(displayDate(x.date)),tag(x.includeInSummary?'Included':'Diagnostic',x.includeInSummary?'':'tag-warning'),e(pct(v.statistics.mean)),e(coverage(v)),e(num(v.statistics.populationSD))];});
 return sub+'<div class="metrics">'+metric('Class mean',pct(d.mean),c.scored+' / '+c.eligible+' pupils','average')+metric('Median',pct(d.statistics.median),'SD '+num(d.statistics.populationSD)+' pp','analysisBox')+metric('Below minimum target',d.belowTarget.length,d.twoOrMoreBelow.length+' at least two grades below','target')+metric('Assessment coverage',c.assessmentResults+'/'+c.assessmentOpportunities,'Complete included results','resultCoverage')+'</div>'+
 analysisFocus('Pupils to review',[
  {label:'Below minimum target',value:d.belowTarget.length,detail:d.twoOrMoreBelow.length+' at least two grades below',id:analysisId(a.classId,'target','below',o),tone:d.belowTarget.length?'attention':''},
  {label:'Unknown target status',value:d.unknownTargetStatus,detail:'Missing attainment or target',id:analysisId(a.classId,'target','unknown',o),tone:d.unknownTargetStatus?'attention':''},
  {label:'On / above target',value:d.onTrack,detail:'Of '+c.eligible+' scoped pupils',id:analysisId(a.classId,'target','on',o)}
 ])+
 '<div class="analysis-grid teaching-grid">'+topicPanel(a,d.topics,o)+panel('Progress towards minimum targets','<div class="bar-list">'+targetRows.map(([key,label,n])=>bar(label,n,analysisId(a.classId,'target',key,o),n+' / '+c.eligible,Math.max(1,c.eligible))).join('')+'</div>','target')+'</div>'+
 panel('Assessment comparison',table(['Assessment','Date','Summary','Mean','Scored','SD (pp)'],comparison,'Assessment comparison'),'analysisAssessment')+
 distributions(a,d,o)+panel('Overall box plot',statistics(d.statistics,'Class overall attainment'),'analysisBox');
}
function facultyView(a,s,o){
 const d=a.faculty(o),commonId=d.common.some(x=>x.id===s.analysisCommon)?s.analysisCommon:'';
 const comparison=[...d.classes].sort((x,y)=>y.belowTarget.length-x.belowTarget.length||x.code.localeCompare(y.code)).map(c=>[
  drill(c.code,analysisId(a.classId,'faculty-class',c.classId,o)),e(pct(c.mean)),e(coverage(c)),'<span class="comparison-count'+(c.belowTarget.length?' attention':'')+'">'+e(c.belowTarget.length)+'</span>',e(String(c.unknownTargetStatus)),boxPlot(c.statistics,c.code)
 ]);
 const yearRows=d.years.map(c=>[drill(c.name,analysisId(a.classId,'faculty-course',c.courseId,{...o,unitId:null})),e(String(c.year)),e(pct(c.mean)),e(coverage(c)),e(String(c.belowTarget.length)),e(String(c.onTrack)),e(String(c.unknownTargetStatus))]);
 let commonContent=empty('No common assessment selected',d.common.length?'Choose a shared assessment to compare like-for-like results.':'No published common assessment is available across two accessible classes in this date/unit selection.');
 if(commonId){
  const c=a.common(commonId,o);
  commonContent='<div class="analysis-context">'+tag(c.definition.includeInSummary?'Included':'Diagnostic','')+'<span class="muted small">Same assessment ID, items and grade boundaries · '+e(displayDate(c.definition.date))+'</span></div>'+
   '<p class="small muted">Combined mean '+e(pct(c.total.statistics.mean))+' · '+e(coverage(c.total))+' scored</p>'+
   table(['Class','Mean','Median','Scored','SD (pp)','Box plot'],c.classes.map(x=>[drill(x.code,analysisId(a.classId,'common-class',x.classId,o,{assessmentId:commonId})),e(pct(x.statistics.mean)),e(pct(x.statistics.median)),e(coverage(x)),e(num(x.statistics.populationSD)),boxPlot(x.statistics,x.code)]),'Common assessment comparison');
 }
 return '<div class="analysis-context"><strong>'+e(d.facultyName)+'</strong><span class="muted small">Only enrolments permitted by the selected scope. '+(d.classes.length<2?'Only one accessible class on this course; choose a wider authorised scope to compare parallel classes.':'Compare '+d.classes.length+' accessible parallel classes.')+'</span></div>'+
 '<div class="metrics">'+metric('Course pupils',d.courseSummary?.coverage.eligible??0,'Selected scope','scope')+metric('Course mean',pct(d.courseSummary?.mean),'Equal pupil averages','average')+metric('Below target',d.courseSummary?.belowTarget.length??0,'Course enrolments','target')+metric('Scored pupils',d.courseSummary?coverage(d.courseSummary):'0/0','Course coverage','coverage')+'</div>'+
 panel('Parallel class comparison',table(['Class','Mean','Scored','Below MTG','Unknown','Distribution (0–100%)'],comparison,'Parallel class comparison')+'<p class="small muted">Classes with most pupils below target are listed first. Overall averages can include different assessments. Use common assessments for like-for-like comparisons.</p>','analysisComparison')+
 panel('Common assessment comparison',select('analysis-common',[['','Select common assessment'],...d.common.map(c=>[c.id,c.title])],commonId,'Common assessment')+commonContent,'analysisComparison')+
 panel('Year-group and course overview',table(['Course','Year','Mean','Scored','Below MTG','On track','Unknown'],yearRows,'Faculty course summaries')+'<p class="small muted">Date range applies to all courses; the selected unit applies only to the current course above. Different courses and grade scales are not combined into one mean.</p>','analysisComparison');
}
export function renderAcademicAnalysis(w,s,r){
 const a=w.academicAnalysis(r.id),options={from:s.analysisFrom||null,to:s.analysisTo||null,unitId:a.units.some(u=>u.id===s.analysisUnit)?s.analysisUnit:null};
 let o;try{o=a.filters(options);}catch(error){return '<section class="surface"><div class="panel-body"><p class="error">'+e(error.message)+'</p>'+btn('Reset analysis filters','analysis-reset')+'</div></section>';}
 const controls='<section class="surface analysis-controls"><div class="toolbar">'+select('analysis-unit',[['','All units'],...a.units.map(u=>[u.id,u.title])],o.unitId??'','Curriculum unit')+
 '<label class="analysis-field">From<input type="date" class="input" id="analysis-from" value="'+e(o.from??'')+'" max="'+e(a.asOf)+'"></label><label class="analysis-field">To<input type="date" class="input" id="analysis-to" value="'+e(o.to)+'" max="'+e(a.asOf)+'"></label>'+btn('Reset filters','analysis-reset','','btn-quiet')+btn('Print view','analysis-print')+'<span class="count">Published results through '+e(displayDate(a.asOf))+'</span></div></section>';
 return '<div class="academic-analysis">'+controls+(r.partial?'<div class="info-box">Partial class: only pupils in your selected scope contribute to all charts and evidence.</div>':'')+
 (s.classTab==='student-analysis'?studentView(a,s,o):s.classTab==='faculty-analysis'?facultyView(a,s,o):classView(a,s,o))+'</div>';
}
const titles={grade:'Grade distribution',histogram:'Percentage distribution',target:'Minimum target status',topic:'Topic evidence',item:'Question / item evidence','assessment-topic':'Assessment topic evidence',ao:'Assessment objective evidence','assessment-grade':'Assessment grade distribution','assessment-histogram':'Assessment percentage distribution','assessment-status':'Result coverage','faculty-class':'Parallel class evidence','faculty-course':'Course evidence','common-class':'Common assessment evidence',all:'Class evidence'};
export function renderAnalysisEvidence(w,id){
 const request=JSON.parse(id),a=w.academicAnalysis(request.classId),d=a.drilldown(request),rows=d.rows;
 const subtitle=(titles[d.kind]??'Evidence')+' · '+request.key;
 let header,body,summary='';
 if(['topic','item','assessment-topic','ao'].includes(d.kind)&&rows.length){
  const earned=rows.reduce((n,r)=>n+r.earned,0),available=rows.reduce((n,r)=>n+r.available,0),pupils=new Set(rows.map(r=>r.studentId)).size;
  summary='<div class="evidence-summary"><strong>'+e(pct(available?100*earned/available:null))+'</strong><span>'+e(earned+'/'+available+' marks · '+pupils+' contributing pupil'+(pupils===1?'':'s'))+'</span></div>';
 }
 if(d.kind==='topic'){
  header=['Student','Assessment','Date','Item','Marks','%'];
  body=rows.map(r=>[pupilIdentity(link(r.name,'open-student',r.studentId),w.pupilHouse(r.studentId)),link(r.title,'open-markbook',bookId(a.classId,r.assessmentId,r.enrolmentId)),e(displayDate(r.date)),e(r.item),e(r.earned+'/'+r.available),e(pct(100*r.earned/r.available))]);
 }else if(['item','assessment-topic','ao'].includes(d.kind)){
  header=['Student','Marks','%','Assessment'];
  body=[...rows].sort((x,y)=>x.earned/x.available-y.earned/y.available||x.name.localeCompare(y.name)).map(r=>[pupilIdentity(link(r.name,'open-student',r.studentId),w.pupilHouse(r.studentId)),e(r.earned+'/'+r.available),e(pct(100*r.earned/r.available)),link('View marks','open-markbook',bookId(a.classId,request.assessmentId,r.enrolmentId))]);
 }else if(d.kind.startsWith('assessment-')||d.kind==='common-class'){
  header=['Student','Class','Mark','%','Grade','Status','Assessment'];
  body=rows.map(r=>[pupilIdentity(link(r.name,'open-student',r.studentId),w.pupilHouse(r.studentId)),e(r.classCode),e(r.rawMark===null?'—':r.rawMark+'/'+r.maxMarks),e(pct(r.percent)),e(r.grade??'—'),e(r.status),link('View marks','open-markbook',bookId(r.classId,request.assessmentId,r.enrolmentId))]);
 }else{
  header=['Student','Class','Average','Grade','MTG','Δ MTG','Scored'];
  body=rows.map(r=>[pupilIdentity(link(r.name,'open-student',r.studentId),w.pupilHouse(r.studentId)),e(r.classCode),e(pct(r.average)),e(r.grade??'—'),e(r.minimumGrade??'—'),gap(r.gapToTarget),e(coverage(r))]);
 }
 return {title:subtitle,sub:rows.length+' contributing '+(d.kind==='topic'?'item records':'pupil records')+' · Selected scope and filters',body:summary+table(header,body,subtitle)+'<p class="stage-note">These are the actual records used in the selected chart or statistic, not a separate example dataset.</p>'};
}
