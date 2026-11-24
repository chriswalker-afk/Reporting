import {indexData} from './model.mjs';

/** Permission preview only. Real permissions must be enforced by an authenticated backend. */
export function createAccess(data,staffId){
  const ix=indexData(data),staff=ix.staff.get(staffId);
  if(!staff)throw new Error('Unknown demo staff member');
  const has=role=>staff.roles.includes(role);
  const faculties=new Set(data.faculties.filter(f=>has('faculty')&&f.headIds.includes(staffId)).map(f=>f.id));
  const houses=new Set(data.houses.filter(h=>has('house')&&h.headIds.includes(staffId)).map(h=>h.id));
  const tutorGroups=new Set(data.tutorGroups.filter(g=>has('tutor')&&g.tutorIds.includes(staffId)).map(g=>g.id));
  const facultyOf=classId=>ix.subjects.get(ix.courses.get(ix.classes.get(classId)?.courseId)?.subjectId)?.facultyId;
  const teaches=classId=>has('teacher')&&Boolean(ix.classes.get(classId)?.teacherIds.includes(staffId));
  const leads=classId=>faculties.has(facultyOf(classId));
  const canViewClass=classId=>ix.classes.has(classId)&&(teaches(classId)||leads(classId)||has('house')||has('leadership'));
  const isTutor=studentId=>tutorGroups.has(ix.students.get(studentId)?.tutorGroupId);
  const isHouse=studentId=>houses.has(ix.students.get(studentId)?.houseId);
  const canViewEnrolment=enrolmentId=>{
    const e=ix.enrolments.get(enrolmentId);
    return Boolean(e&&(canViewClass(e.classId)||isTutor(e.studentId)||isHouse(e.studentId)));
  };
  const canViewStudent=studentId=>ix.students.has(studentId)&&(has('leadership')||isTutor(studentId)||isHouse(studentId)||
    (ix.enrolmentsByStudent.get(studentId)||[]).some(e=>canViewClass(e.classId)));
  const canEditResult=(assessmentId,enrolmentId)=>{
    const a=ix.assessments.get(assessmentId),e=ix.enrolments.get(enrolmentId);
    return Boolean(a&&e&&a.classIds.includes(e.classId)&&teaches(e.classId));
  };
  const canManageAssessment=assessmentId=>{
    const a=ix.assessments.get(assessmentId);
    return Boolean(a&&a.classIds.every(c=>leads(c))||
      a&&a.classIds.length===1&&teaches(a.classIds[0]));
  };
  const canEditPrediction=enrolmentId=>teaches(ix.enrolments.get(enrolmentId)?.classId);
  const canEditMinimumTarget=enrolmentId=>leads(ix.enrolments.get(enrolmentId)?.classId);
  const canViewCase=caseId=>{
    const c=ix.interventions.get(caseId),e=c&&ix.enrolments.get(c.enrolmentId);
    return Boolean(e&&(has('leadership')||teaches(e.classId)||leads(e.classId)||isHouse(e.studentId)||isTutor(e.studentId)));
  };
  const canViewNote=noteId=>{
    const n=ix.notes.get(noteId),e=n&&ix.enrolments.get(n.enrolmentId);
    return Boolean(e&&(has('leadership')||teaches(e.classId)||leads(e.classId)||isTutor(e.studentId)||isHouse(e.studentId)));
  };
  const canAddSubjectNote=enrolmentId=>teaches(ix.enrolments.get(enrolmentId)?.classId);
  const canEditSubjectNote=noteId=>{
    const n=ix.notes.get(noteId);
    return Boolean(n&&n.visibility==='subject'&&n.authorStaffId===staffId&&canAddSubjectNote(n.enrolmentId));
  };
  const scopeClasses=(scope='accessible')=>data.classes.filter(c=>{
    if(scope==='teaching')return teaches(c.id);
    if(scope==='faculty')return leads(c.id);
    if(scope==='school')return has('house')||has('leadership');
    return scope==='accessible'&&canViewClass(c.id);
  }).map(c=>c.id);
  const scopeStudents=(scope='accessible')=>data.students.filter(s=>{
    if(scope==='tutor')return isTutor(s.id);
    if(scope==='house')return isHouse(s.id);
    if(scope==='school')return has('leadership');
    if(scope==='faculty'||scope==='teaching')return (ix.enrolmentsByStudent.get(s.id)||[]).some(e=>scope==='faculty'?leads(e.classId):teaches(e.classId));
    return scope==='accessible'&&canViewStudent(s.id);
  }).map(s=>s.id);
  // Explicit scope membership; school-wide class browsing is not a school-wide pastoral role.
  const scopeEnrolments=(scope='accessible')=>data.enrolments.filter(e=>{
    if(scope==='tutor')return isTutor(e.studentId);
    if(scope==='house')return isHouse(e.studentId);
    if(scope==='school')return has('leadership');
    if(scope==='faculty')return leads(e.classId);
    if(scope==='teaching')return teaches(e.classId);
    return scope==='accessible'&&canViewEnrolment(e.id);
  }).map(e=>e.id);
  const audienceMatches=(audience,{oversight=true}={})=>{
    if(!audience)return false;
    if(audience.type==='all'||oversight&&has('leadership'))return true;
    const taught=data.classes.filter(c=>teaches(c.id));
    if(audience.type==='faculty')return faculties.has(audience.id)||taught.some(c=>facultyOf(c.id)===audience.id);
    if(audience.type==='house')return houses.has(audience.id)||data.tutorGroups.some(g=>g.houseId===audience.id&&tutorGroups.has(g.id));
    if(audience.type==='tutorGroup')return tutorGroups.has(audience.id)||houses.has(ix.tutorGroups.get(audience.id)?.houseId);
    if(audience.type==='year')return taught.some(c=>ix.courses.get(c.courseId)?.year===audience.id)||
      data.tutorGroups.some(g=>g.year===audience.id&&(tutorGroups.has(g.id)||houses.has(g.houseId)))||
      data.classes.some(c=>leads(c.id)&&ix.courses.get(c.courseId)?.year===audience.id);
    return false;
  };
  const caseActions=caseId=>{
    if(!canViewCase(caseId))return [];
    const c=ix.interventions.get(caseId),e=ix.enrolments.get(c.enrolmentId);
    if(c.state==='closed')return [];
    const actions=['view'];
    if(teaches(e.classId)||leads(e.classId)||isHouse(e.studentId)||has('leadership'))actions.push('review');
    if(c.state==='wave1'&&teaches(e.classId))actions.push('requestWave2');
    if(c.state==='wave2_requested'&&leads(e.classId))actions.push('activateWave2');
    if(['wave2','wave3_requested','wave3'].includes(c.state)&&isHouse(e.studentId))actions.push('respondHouse');
    if(c.state==='wave2'&&(leads(e.classId)||isHouse(e.studentId)))actions.push('requestWave3');
    if(['wave3_requested','wave3'].includes(c.state)&&has('leadership'))actions.push('respondLeadership');
    return actions;
  };
  return {staff,has,facultyOf,teaches,leads,isTutor,isHouse,canViewClass,canViewEnrolment,canViewStudent,
    canEditResult,canManageAssessment,canEditPrediction,canEditMinimumTarget,canViewCase,canViewNote,canAddSubjectNote,canEditSubjectNote,
    canStartWave1:enrolmentId=>teaches(ix.enrolments.get(enrolmentId)?.classId),
    scopeClasses,scopeStudents,scopeEnrolments,audienceMatches,caseActions,
    availableScopes:['teaching','faculty','tutor','house','school'].filter(scope=>scopeEnrolments(scope).length>0)};
}
