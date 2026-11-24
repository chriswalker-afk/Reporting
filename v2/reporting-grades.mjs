import {indexData,key,clone,isText} from './model.mjs';
import {createAnalytics} from './analytics.mjs';
import {calculationFor,reportApplies,reportEvent,validMethod} from './calculation-policy.mjs';

const must=(ok,message)=>{if(!ok)throw Error(message);};
export const reportGradeId=(periodId,enrolmentId)=>'RG-'+key(periodId,enrolmentId);
function context(data,classId){
 const ix=indexData(data),cls=ix.classes.get(classId),course=ix.courses.get(cls?.courseId),faculty=ix.faculties.get(ix.subjects.get(course?.subjectId)?.facultyId);
 must(cls&&course&&faculty,'Unknown class or course');
 return {ix,cls,course,faculty,scheme:ix.gradeSchemes.get(course.gradeSchemeId)};
}
const canManage=(access,classId)=>access.leads(classId)||access.has('leadership');
export function calculationSettings(data,access,classId){
 const {course,faculty}=context(data,classId);
 return {courseId:course.id,courseName:course.name,facultyId:faculty.id,facultyName:faculty.name,
  facultyMethod:faculty.calculationMethod??null,courseMethod:course.calculationMethod??null,
  defaultWeight:course.defaultWeight,effective:calculationFor(course,faculty),editable:canManage(access,classId)};
}
export function changeCalculation(data,access,classId,input){
 const {course,faculty}=context(data,classId);
 must(canManage(access,classId),'Only relevant faculty or school leadership can change calculation settings');
 must(['faculty','course'].includes(input.level),'Choose faculty or course settings');
 must(input.method===null||validMethod(input.method),'Invalid calculation method');
 must(input.confirmed===true&&isText(input.reason)&&input.reason.trim().length<=1000,'Confirm the recalculation and provide a reason');
 const record=input.level==='faculty'?faculty:course,before=clone(record);
 if(input.method===null)delete record.calculationMethod;else record.calculationMethod=input.method;
 if(input.level==='course'){
  must(typeof input.defaultWeight==='number'&&Number.isFinite(input.defaultWeight)&&input.defaultWeight>0&&input.defaultWeight<=1000,'Default assessment weight must be greater than zero and at most 1000');
  record.defaultWeight=input.defaultWeight;
 }
 return {before,after:record,reason:input.reason.trim()};
}
export function reportEvidence(engine,period,enrolmentId,asOf){
 const cutoff=period.dueDate<asOf?period.dueDate:asOf,s=engine.studentSummary(enrolmentId,{to:cutoff});
 return {cutoff,periodDueDate:period.dueDate,method:s.calculation.method,source:s.calculation.source,
  average:s.average,calculatedGrade:s.grade,minimumGrade:s.minimumGrade,predictedGrade:s.predictedGrade,
  scored:s.coverage.scored,eligible:s.coverage.eligible,assessmentIds:s.results.filter(r=>r.status==='scored').map(r=>r.assessmentId)};
}
export function reportRegister(data,access,scope,classId,periodId=null){
 const {ix,course,faculty,scheme}=context(data,classId);
 const allowed=new Set(access.scopeEnrolments(scope)),enrolments=(ix.enrolmentsByClass.get(classId)??[]).filter(e=>allowed.has(e.id));
 must(enrolments.length||access.canViewClass(classId),'Class outside current demo scope');
 const applies=(d,e)=>reportApplies(d,course,faculty.id,ix.students.get(e.studentId));
 const periods=data.deadlines.filter(d=>reportEvent(d)&&enrolments.some(e=>applies(d,e))).sort((a,b)=>b.dueDate.localeCompare(a.dueDate)||a.id.localeCompare(b.id));
 const period=periods.find(d=>d.id===periodId)??periods.find(d=>!d.archived)??periods[0]??null;
 const records=new Map((data.reportGrades??[]).filter(r=>r.periodId===period?.id).map(r=>[r.enrolmentId,r]));
 const engine=createAnalytics(data);
 const rows=period?enrolments.filter(e=>applies(period,e)).map(e=>{
  const pupil=ix.students.get(e.studentId),record=records.get(e.id)??null,evidence=reportEvidence(engine,period,e.id,data.asOf);
  return {enrolmentId:e.id,studentId:pupil.id,name:pupil.name,tutorGroupId:pupil.tutorGroupId,houseId:pupil.houseId,record,evidence,
   editable:!period.archived&&access.teaches(classId)&&record?.status!=='submitted',
   canReopen:!period.archived&&record?.status==='submitted'&&canManage(access,classId)};
 }).sort((a,b)=>a.name.localeCompare(b.name)||a.enrolmentId.localeCompare(b.enrolmentId)):[];
 return {classId,course,periods,period,grades:scheme.bands.map(b=>b.grade),rows,
  coverage:{eligible:rows.length,submitted:rows.filter(r=>r.record?.status==='submitted').length,draft:rows.filter(r=>r.record?.status==='draft').length,missing:rows.filter(r=>!r.record).length}};
}
export function changeReportGrade(data,access,staffId,periodId,enrolmentId,input){
 const e=data.enrolments.find(e=>e.id===enrolmentId);
 must(e,'Unknown enrolment');
 const {ix,course,faculty,scheme}=context(data,e.classId),period=ix.deadlines.get(periodId);
 must(period&&!period.archived&&reportApplies(period,course,faculty.id,ix.students.get(e.studentId)),'Reporting period is closed, unknown or outside pupil scope');
 const records=data.reportGrades??=([]),id=reportGradeId(periodId,enrolmentId),old=records.find(r=>r.periodId===periodId&&r.enrolmentId===enrolmentId),before=old?clone(old):null;
 const reason=typeof input.reason==='string'?input.reason.trim():'';
 must(reason.length<=1000,'Reason is limited to 1000 characters');
 if(input.action==='reopen'){
  must(canManage(access,e.classId)&&old?.status==='submitted','Only relevant leadership can reopen a submitted report grade');
  must(input.confirmed===true&&isText(reason),'Confirm reopening and provide a reason');
  Object.assign(old,{status:'draft',updatedBy:staffId,updatedDate:data.asOf,reason:'',submittedBy:null,submittedDate:null,evidence:null});
  return {before,after:old,reason};
 }
 must(access.teaches(e.classId),'Only the assigned teacher can enter report grades');
 must(old?.status!=='submitted','Submitted report grades are locked; ask relevant leadership to reopen');
 must(['draft','submit'].includes(input.action),'Invalid report grade action');
 must(scheme.bands.some(b=>b.grade===input.grade),'Select a grade on this course’s scale');
 const submitting=input.action==='submit',evidence=submitting?reportEvidence(createAnalytics(data),period,enrolmentId,data.asOf):null;
 if(submitting){
  must(input.confirmed===true,'Confirm submission of the report grade');
  must(evidence.calculatedGrade===input.grade||isText(reason),'Explain a report grade that differs from calculated attainment, or has no calculated evidence');
 }
 const record={id,periodId,enrolmentId,grade:input.grade,status:submitting?'submitted':'draft',reason,
  updatedBy:staffId,updatedDate:data.asOf,submittedBy:submitting?staffId:null,submittedDate:submitting?data.asOf:null,evidence};
 if(old)Object.assign(old,record);else records.push(record);
 return {before,after:record,reason:reason||null};
}
