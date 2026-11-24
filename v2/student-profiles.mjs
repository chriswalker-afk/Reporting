import {indexData} from './model.mjs';
import {createAnalytics} from './analytics.mjs';
import {createAcademicAnalysis} from './academic-analysis.mjs';

export const PROFILE_TABS=[['overview','Overview'],['assessments','Assessment history'],['comments','Comments'],['support','Interventions']];
export const orderedNotes=notes=>[...notes].sort((a,b)=>(b.updatedDate??b.date).localeCompare(a.updatedDate??a.date)||b.id.localeCompare(a.id,undefined,{numeric:true}));
export function studentCounts(subjects){
 return {subjects:subjects.length,scored:subjects.filter(s=>s.average!==null).length,below:subjects.filter(s=>s.onTrack===false).length,
  severe:subjects.filter(s=>s.gapToTarget!==null&&s.gapToTarget<=-2).length,onTrack:subjects.filter(s=>s.onTrack===true).length,
  unknown:subjects.filter(s=>s.onTrack===null).length};
}
export function directoryRow(p,subjects,cases){
 const active=cases.filter(c=>c.state!=='closed');
 return {...p,...studentCounts(subjects),cases:active.length,wave:active.length?Math.max(...active.map(c=>c.wave)):0,
  due:active.filter(c=>c.due).length,overdue:active.filter(c=>c.overdue).length,
  flags:[...p.tags,...(active.length?['SOC']:[])]};
}
export function filterStudents(rows,s,matchText){
 return rows.filter(p=>matchText(s.query,p.name,p.id,p.year,p.tutorGroupId,p.house,p.flags)&&
  (!s.flag||s.flag==='all'||p.flags.includes(s.flag))&&
  (!s.studentYear||s.studentYear==='all'||String(p.year)===s.studentYear)&&
  (!s.tutorFilter||s.tutorFilter==='all'||p.tutorGroupId===s.tutorFilter)&&
  (!s.houseFilter||s.houseFilter==='all'||p.house===s.houseFilter)&&
  (!s.studentAttainment||s.studentAttainment==='all'||s.studentAttainment==='below'&&p.below>0||
   s.studentAttainment==='severe'&&p.severe>0||s.studentAttainment==='unknown'&&p.unknown>0||
   s.studentAttainment==='on'&&p.subjects>0&&p.onTrack===p.subjects)&&
  (!s.studentSupport||s.studentSupport==='all'||s.studentSupport==='active'&&p.cases>0||
   s.studentSupport==='due'&&p.due>0||s.studentSupport==='none'&&p.cases===0));
}
export function profileCounts(rows){
 return {pupils:rows.length,below:rows.filter(p=>p.below>0).length,severe:rows.filter(p=>p.severe>0).length,
  soc:rows.filter(p=>p.cases>0).length,due:rows.filter(p=>p.due>0).length,unknown:rows.filter(p=>p.unknown>0).length};
}
export function createProfileEvidence(data,access){
 const ix=indexData(data),engine=createAnalytics(data),cache=new Map();
 const getEnrolment=id=>{
  const e=ix.enrolments.get(id);
  if(!e||!access.canViewEnrolment(id))throw Error('Subject outside your accessible records');
  return e;
 };
 const publishedFor=e=>data.assessments.filter(a=>a.classIds.includes(e.classId)&&a.status==='published'&&a.date<=data.asOf)
  .sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 function assessmentRecord(e,a){
  const result=engine.resultFor(a.id,e.id);
  return {...result,title:a.title,date:a.date,unitTitle:ix.units.get(a.unitId).title,weight:a.weight,mode:a.mode,
   summaryIncluded:a.includeInSummary,assessmentExclusionReason:a.exclusionReason};
 }
 function subject(enrolmentId){
  const e=getEnrolment(enrolmentId);
  if(!cache.has(e.classId))cache.set(e.classId,createAcademicAnalysis(data,access,'accessible',e.classId));
  const analysis=cache.get(e.classId).student(e.id);
  return {...analysis,history:publishedFor(e).map(a=>assessmentRecord(e,a))};
 }
 function result(enrolmentId,assessmentId){
  const e=getEnrolment(enrolmentId),a=publishedFor(e).find(a=>a.id===assessmentId);
  if(!a)throw Error('Assessment outside your accessible published records');
  const record=assessmentRecord(e,a);
  return {record,items:a.items.map(i=>({...i,mark:Object.hasOwn(record.marks,i.id)?record.marks[i.id]:null})),
   bands:ix.gradeSchemes.get(a.gradeSchemeId).bands,student:ix.students.get(e.studentId).name,
   classCode:ix.classes.get(e.classId).code,subject:ix.subjects.get(ix.courses.get(ix.classes.get(e.classId).courseId).subjectId).name};
 }
 return {subject,result};
}
