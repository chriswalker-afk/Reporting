// Ordered from lowest to highest. U is an explicit ungraded result, not missing evidence.
export const GRADE_LABELS=Object.freeze({
 numeric:Object.freeze(['U','1','2','3','4','5','6','7','8','9']),
 igcseLetter:Object.freeze(['U','G','F','E','D','C','B','A','A*']),
 alevel:Object.freeze(['U','E','D','C','B','A','A*'])
});
const same=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((v,i)=>v===b[i]);
export const supportedGradeLabels=labels=>Object.values(GRADE_LABELS).some(order=>same(labels,order));
const scheme=(id,name,labels,mins)=>({id,name,bands:labels.map((grade,i)=>({grade,min:mins[i]})),illustrative:true});
export function demoGradeSchemes(){
 return [
  scheme('ks3','KS3 internal illustrative 9–1 / U',GRADE_LABELS.numeric,[0,12,23,33,43,53,63,73,83,92]),
  scheme('igcse','IGCSE illustrative 9–1 / U',GRADE_LABELS.numeric,[0,12,23,33,43,53,63,73,83,92]),
  scheme('igcse-letter','IGCSE illustrative A*–G / U',GRADE_LABELS.igcseLetter,[0,12,24,36,48,60,72,82,92]),
  scheme('alevel','A level illustrative A*–E / U',GRADE_LABELS.alevel,[0,35,45,55,65,75,88])
 ];
}
// Demo allocation only. Real courses must use their configured qualification scheme.
export const demoCourseScheme=(year,subjectId)=>year<=9?'ks3':year<=11?(subjectId==='science'?'igcse-letter':'igcse'):'alevel';

// Upgrade only the explicitly synthetic v1 fixture. Keep the original storage
// key untouched; this is not a conversion between real qualifications.
export function upgradeDemoGradeScales(old,version){
 if(old?.schemaVersion!==1||old.synthetic!==true)throw Error('Only synthetic schema 1 demo data can be upgraded.');
 const data=JSON.parse(JSON.stringify(old));
 const oldSchemes=new Map(data.gradeSchemes.map(g=>[g.id,g]));
 const defaults=demoGradeSchemes(),newSchemes=new Map(defaults.map(g=>[g.id,g]));
 const affected=new Map(),courseById=new Map(data.courses.map(c=>[c.id,c]));
 const enrolmentCourses=new Map(),classes=new Map(data.classes.map(c=>[c.id,c]));
 for(const e of data.enrolments)enrolmentCourses.set(e.id,classes.get(e.classId)?.courseId);
 for(const c of data.courses){
  const previous=oldSchemes.get(c.gradeSchemeId);
  const next=newSchemes.get(demoCourseScheme(c.year,c.subjectId));
  if(!previous||!next)throw Error('Missing demo course grade scheme');
  if(!same(previous.bands.map(b=>b.grade),next.bands.map(b=>b.grade)))affected.set(c.id,{previous,next});
  c.gradeSchemeId=next.id;
  // The old fictional senior Science course was IB; the new two-family
  // demo uses A level Science instead, without presenting IB grades as A levels.
  if(c.year>=12&&c.name.startsWith('IB '))c.name='A level '+c.name.slice(3);
 }
 const remap=(label,{previous,next})=>{
  if(label===null)return null;
  const boundary=previous.bands.find(b=>b.grade===label);
  if(!boundary)throw Error('Unknown old fictional grade');
  return [...next.bands].reverse().find(b=>b.min<=boundary.min).grade;
 };
 for(const t of data.targets){
  const change=affected.get(enrolmentCourses.get(t.enrolmentId));
  if(change){t.minimumGrade=remap(t.minimumGrade,change);t.predictedGrade=remap(t.predictedGrade,change);}
 }
 // Raw results, permissions, notes, cases and audit history are untouched.
 // Changed-scale assessments use the new illustrative default boundaries.
 // Unchanged-scale assessments retain their custom boundaries.
 for(const a of data.assessments){
  const c=courseById.get(a.courseId);
  if(affected.has(a.courseId))a.gradeSchemeId=c.gradeSchemeId;
  else if(a.gradeSchemeId==='ks3'||a.gradeSchemeId==='ib')a.gradeSchemeId=c.gradeSchemeId;
 }
 const used=new Set(data.assessments.map(a=>a.gradeSchemeId));
 data.gradeSchemes=[...defaults,...data.gradeSchemes.filter(g=>!newSchemes.has(g.id)&&used.has(g.id))];
 data.schemaVersion=version;
 return data;
}
