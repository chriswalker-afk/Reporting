import {noticePriority} from './communication-layout.mjs';
// Presentation-only Home projection. All counts come from the existing scoped
// directory / class selectors and the all-responsibilities personal queues.
const unique=xs=>[...new Set(xs)].sort((a,b)=>String(a).localeCompare(String(b),'en',{numeric:true}));
const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
const byName=(a,b)=>a.name.localeCompare(b.name,'en',{numeric:true});
const pupilPriority=(a,b)=>Number(b.overdue>0)-Number(a.overdue>0)||b.below-a.below||b.severe-a.severe||b.due-a.due||b.cases-a.cases||b.unknown-a.unknown||byName(a,b);
export const HOME_PREVIEW=5;
export function groupPupils(pupils,key){
 const groups=new Map();
 for(const p of pupils){
  const value=String(p[key]);
  if(!groups.has(value))groups.set(value,[]);
  groups.get(value).push(p);
 }
 return unique([...groups.keys()]).map(value=>{
  const rows=groups.get(value);
  return {key,value,label:key==='year'?'Year '+value:value,pupils:rows.length,
   below:rows.filter(p=>p.below>0).length,unknown:rows.filter(p=>p.unknown>0).length,
   cases:rows.filter(p=>p.cases>0).length,due:rows.filter(p=>p.due>0).length,
   houseId:key==='house'?rows[0].houseId:null};
 });
}
export function homeDashboard(w){
 const cohort=w.home().cohort,pupils=w.studentRows(),comm=w.communications(),actions=w.allHome().actions;
 const classFirst=['teaching','faculty'].includes(w.scope);
 const kind=classFirst?'classes':w.scope==='tutor'?'pupils':'groups';
 const classes=classFirst?[...w.classRows()].sort((a,b)=>b.below-a.below||b.cases-a.cases||a.code.localeCompare(b.code,'en',{numeric:true})):[];
 const groupKey=w.scope==='house'?'house':'year';
 const groups=kind==='groups'?groupPupils(pupils,groupKey):[];
 const counts={pupils:pupils.length,below:pupils.filter(p=>p.below>0).length,
   unknown:pupils.filter(p=>p.unknown>0).length,due:pupils.filter(p=>p.due>0).length,
   belowSubjects:sum(pupils,'below'),activeCases:cohort.interventions.active,casePupils:cohort.interventions.students,
   enrolments:cohort.enrolments};
 const contexts={
  teaching:{label:'Teaching dashboard',context:classes.length+' teaching groups',panel:'My classes'},
  faculty:{label:'Faculty dashboard',context:unique(classes.map(c=>c.faculty.name)).join(' · ')||'No assigned faculty',panel:'Faculty class overview'},
  tutor:{label:'Tutor dashboard',context:'Tutor groups '+(unique(pupils.map(p=>p.tutorGroupId)).join(', ')||'—'),panel:'Tutees to review'},
  house:{label:'House dashboard',context:groups.length===1?groups[0].label+' House':groups.length+' assigned Houses',panel:'House academic overview'},
  school:{label:'Leadership dashboard',context:'Whole school · Years '+(pupils.length?Math.min(...pupils.map(p=>p.year))+'–'+Math.max(...pupils.map(p=>p.year)):'—'),panel:'Year-group overview'},
  accessible:{label:'Combined dashboard',context:'All assigned responsibilities',panel:'Year-group overview'}
 };
 const context=contexts[w.scope]??contexts.accessible;
 const queue=[
  ...comm.pendingAcknowledgements.map(n=>({kind:'notice',id:n.id,notice:n,rank:n.priority==='urgent'?1:n.priority==='important'?3:5,date:n.publishedDate})),
  ...actions.map(a=>({kind:'case',id:a.caseId+':'+a.type,action:a,rank:a.reviewDate<w.asOf?0:a.reviewDate===w.asOf?2:4,date:a.reviewDate}))
 ].sort((a,b)=>a.rank-b.rank||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const shown=queue.slice(0,HOME_PREVIEW),shownNotices=new Set(shown.filter(q=>q.kind==='notice').map(q=>q.id));
 const reportingRows=w.scope==='school'?comm.deadlines.filter(d=>!d.archived&&(!d.recipient||!d.completed)):comm.openDeadlines;
 return {kind,context,counts,classes,priorityPupils:[...pupils].sort(pupilPriority),groups,groupKey,queue,shown,
  notices:comm.activeNotices.filter(n=>!shownNotices.has(n.id)),reportingRows,
  urgentNotices:comm.activeNotices.filter(n=>n.priority==='urgent'&&!shownNotices.has(n.id)).sort(noticePriority),
  reportingOverdue:reportingRows.filter(d=>d.status==='overdue').length,reportingToday:reportingRows.filter(d=>d.status==='today').length,
  overdue:actions.filter(a=>a.reviewDate<w.asOf).length,actionCount:actions.length,ackCount:comm.pendingAcknowledgements.length};
}
export function groupFilter(key,value,below=false){
 if(!['year','house','tutorGroupId'].includes(key))throw Error('Unknown cohort grouping');
 return {...(key==='year'?{studentYear:String(value)}:key==='house'?{houseFilter:String(value)}:{tutorFilter:String(value)}),
  studentAttainment:below?'below':'all'};
}
