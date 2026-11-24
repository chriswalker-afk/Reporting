import {createDemoData} from '../../v2/demo-data.mjs';
import {assertData,clone} from '../../v2/model.mjs';

export const AUDIT_CLASS='11-maths-1';
export const AUDIT_PARALLEL='11-maths-2';
export const AUDIT_COURSE='11-maths';
export const auditAssessment=n=>'AUDIT-A'+String(n).padStart(2,'0');

// Never used in the live demo; every identity is generated and explicitly fictional.
export function createYearFixture(){
 const d=createDemoData(),members=d.enrolments.filter(e=>e.classId===AUDIT_CLASS);
 const original=members[0],pupil=d.students.find(p=>p.id===original.studentId);
 const target=d.targets.find(t=>t.enrolmentId===original.id);
 for(let i=members.length;i<30;i++){
  const id='AUDIT-P'+String(i+1).padStart(2,'0'),enrolmentId=id+'@'+AUDIT_COURSE;
  d.students.push({...clone(pupil),id,name:'Fictional Audit Pupil '+String(i+1).padStart(2,'0'),information:{...pupil.information,admissionNumber:'AUDIT-'+id}});
  d.enrolments.push({id:enrolmentId,studentId:id,classId:AUDIT_CLASS});
  d.targets.push({...clone(target),id:'T-'+enrolmentId,enrolmentId});
 }
 const course=d.courses.find(c=>c.id===AUDIT_COURSE);
 for(let n=1;n<=45;n++){
  const id=auditAssessment(n),mode=['total','topics','questions'][(n-1)%3];
  const items=mode==='total'?[{id:'total',label:'Total',maxMarks:40,topic:null,ao:null}]:
   Array.from({length:mode==='topics'?3:5},(_,i)=>({id:'i'+(i+1),label:(mode==='topics'?'Topic ':'Q')+(i+1),maxMarks:5+i*5,topic:'Topic '+(i+1),ao:mode==='questions'?['AO1','AO2','AO3'][i%3]:null}));
  const date=new Date(Date.UTC(2026,8,1+n*2)).toISOString().slice(0,10);
  d.assessments.push({id,courseId:course.id,unitId:course.id+'-U'+(1+n%2),classIds:n%3===1?[AUDIT_CLASS,AUDIT_PARALLEL]:[AUDIT_CLASS],
   title:n===2?'Fictional topic check, "A"\tand B':'Audit assessment '+String(n).padStart(2,'0'),
   date,gradeSchemeId:course.gradeSchemeId,mode,items,weight:1+n%3/2,status:n%11===0?'draft':'published',
   includeInSummary:n%13!==0,exclusionReason:n%13===0?'Diagnostic only':null});
 }
 const parallel=d.enrolments.find(e=>e.classId===AUDIT_PARALLEL);
 d.results.push({id:'AUDIT-OTHER',assessmentId:auditAssessment(1),enrolmentId:parallel.id,status:'present',marks:{total:17},exclusionReason:null});
 return assertData(d);
}
