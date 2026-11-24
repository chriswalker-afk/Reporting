import {finite} from './model.mjs';
import {projectRegisterRow,sortValue} from './class-overview.mjs';
import {createMarkbook} from './markbook.mjs';
import {createAcademicAnalysis} from './academic-analysis.mjs';
import {directoryRow,studentCounts,orderedNotes,createProfileEvidence} from './student-profiles.mjs';
import {CASE_ACTION_LABELS,pendingCaseActions} from './interventions.mjs';
export const NAV=[
  ['home','Home','home'],['notices','Notices','notice'],['classes','Classes','class'],
  ['students','Students','students'],['intervention','Intervention','support']
];
export const FUTURE=[
  ['Homework','book'],['Reports','chart'],['Safeguarding','shield'],['CCA','activity'],
  ['Room booking','calendar'],['Maintenance','tool'],['My tasks','check']
];
export const SCOPE_LABELS={accessible:'All my access',teaching:'My classes',faculty:'My faculty',
  tutor:'My tutees',house:'My House',school:'Whole school'};
export const ROLE_LABELS={teacher:'Teacher',faculty:'HoF / HoD',tutor:'Tutor',house:'HsM',leadership:'SLT'};
export const WAVE_LABELS={wave1:'Wave 1',wave2_requested:'Wave 2 requested',wave2:'Wave 2',
  wave3_requested:'Wave 3 requested',wave3:'Wave 3',closed:'Closed'};
export const ACTION_LABELS=CASE_ACTION_LABELS;
export const HELP={
  scope:'Changes the displayed cohort, not your permissions. All my access combines your assigned responsibilities. House and tutor views use only members of those groups.',
  average:'Weighted mean of complete, included assessment percentages for each pupil, then the mean of those pupil percentages. Missing and excluded marks are omitted; zero is valid.',
  analysisTrend:'The teal line is the cumulative weighted mean of eligible complete assessment percentages in the selected range. The dashed line shows individual assessment results. The MTG boundary is the course tracker threshold, not a prediction. Points are spaced by assessment sequence, not elapsed time.',
  analysisDistribution:'Frequency of pupils by calculated grade. The overall distribution uses the course tracker scheme; a standalone assessment uses its own boundaries. Only scored pupils contribute.',
  analysisBins:'10-percentage-point bins include the lower bound but exclude the upper bound, except the last bin includes 100%. Select a bin to inspect the exact underlying pupils.',
  analysisBox:'Minimum, lower quartile, median, upper quartile and maximum of scored percentages, with quartiles linearly interpolated at (n−1)p. Whiskers are minimum/maximum; SD is population standard deviation in percentage points.',
  analysisTopics:'Marks earned divided by marks available, across complete scored results. Overall topic summaries use included published assessments only. Standalone analysis uses its selected assessment, even if diagnostic. No inferred topic evidence from total-only marks.',
  analysisAssessment:'Each assessment mean is the arithmetic mean of complete, non-excluded pupil percentages for that assessment. Coverage and paper difficulty may differ. Diagnostic results can be analysed separately.',
  analysisCoverage:'Scored, missing, absent, incomplete and excluded are mutually exclusive result states. All assigned pupils in the selected scope form the denominator.',
  analysisComparison:'Parallel class overall summaries use equal pupil averages, not equal class means. Compare identical shared assessment definitions for like-for-like evidence. Year/course summaries stay separate; no mixed-course grade or mean.',
  profileScope:'Directory counts follow your selected cohort and its subject enrolments. A profile shows all records permitted by your combined assigned responsibilities. No inaccessible subject or case is counted.',
  profileTargets:'Counts are numbers of subjects, not a cross-course average or combined grade. Below target means current calculated grade is lower than minimum target; unknown means attainment or target is missing. Two or more grades below refers to each course’s own grade order.',
  profileHistory:'Published assessments up to the demo reference date, including diagnostic assessments. Diagnostics and excluded results are labelled and do not contribute to overall attainment; missing, absent and incomplete are not zero marks.',
  profileComments:'Subject comments are read by staff with the relevant teaching, faculty or pastoral responsibility. Assigned teachers can add and edit their own comments. Pastoral academic notes are read-only here and limited to relevant tutors, House staff and leadership (or their author with access). Never enter safeguarding, clinical or other confidential details.',
  coverage:'Number of pupils with a calculated overall percentage, divided by pupils in the selected class or cohort. Results are not rounded until display.',
  target:'Current overall grade compared with the minimum target using the ordered course grading scheme. Unknown grades are kept separate.',
  predicted:'Teacher-entered predicted grade. It is distinct from the current grade calculated from assessment marks.',
  studentAverage:'Weighted mean of complete included assessment percentages for this pupil and subject. Default equal assessment weighting. Zero is valid; missing, absent, incomplete, diagnostic and excluded results are omitted.',
  overallGrade:'The overall percentage mapped to the course tracker grade boundaries. Letter grades are not averaged. Illustrative boundaries, not official exam predictions.',
  latest:'Most recent complete, included published assessment by assessment date, not entry date. Grade uses that assessment’s own boundaries. Drafts, diagnostics and excluded results are omitted.',
  minimumTarget:'Minimum target grade for this subject. Only authorised faculty leadership can edit it; it is separate from current attainment and teacher prediction.',
  nextGrade:'Percentage-point difference from the unrounded overall average to the next boundary in the course tracker scheme. A dash means no scored result or highest grade reached.',
  predictionGap:'Current calculated grade minus the teacher prediction, using the ordered course grade scale. Unknown if either is missing.',
  resultCoverage:'Number of complete, included scored assessments out of eligible published assessment opportunities. Missing, absent, incomplete and individually excluded results are not counted as scored.',
  soc:'SOC indicates at least one active academic intervention visible to you for this pupil. The wave shown relates only to the current subject. Other-subject cases may be visible to authorised staff. Closed cases do not trigger this tag.',
  comments:'Subject-specific academic comments. Teachers assigned to this class may add comments and edit their own; relevant staff can read within their responsibilities. Do not record safeguarding or confidential clinical details here.',
  intervention:'Active subject cases, not the number of pupils. A pupil can have more than one case. Closed cases are retained in the history.',
  tutor:'Tutor group is independent of teaching class. Tutor access follows assigned tutor-group membership.',
  flags:'Fictional administrative tags: EAL = English as an additional language; SEN = special educational needs. HLP and access arrangements are illustrative administrative indicators; no sensitive details are included.',
  partial:'Only pupils within the selected scope contribute. This is not necessarily the entire teaching class.',
  date:'Reference date of the fictional dataset. Assessments after this date, drafts and excluded assessments do not contribute to overall summaries.',
  notices:'Published, unexpired notices matching your assigned responsibilities. The scope selector changes academic cohorts, not notice audiences. Leadership can also see notices for oversight.',
  acknowledgement:'Acknowledgements belong to the current staff member and notice version. Acknowledging does not acknowledge for anyone else. Editing a notice resets its acknowledgements.',
  reporting:'One centrally managed reporting schedule. Completing a reminder is personal and does not submit reports or grades to SIMS. Revised deadlines reset completion markers.',
  personalActions:'Your intervention actions across all assigned responsibilities. Academic scope filters do not hide tasks from this Home queue.',
  edit:'Only assigned teachers can edit predicted grades. The new grade is validated against the course grading scale and recorded in demo audit history.',
  caseWorkflow:'One active academic case per subject. Wave 1 is teacher-led; a referral records the reason and assigns the next responsible staff member. A requested wave is not an activated plan. Only the appropriate roles can perform each action. All changes retain their history.',
  studyPlan:'An individual academic study plan has a measurable target, specific actions, responsible staff member and separate review date. A completed plan can be deliberately reopened. Its review does not automatically close the intervention.',
  caseQueue:'Outstanding referrals, House requests and due case/study-plan reviews are calculated from the shared records and your assigned roles. A case can have more than one action.',
  due:'Active cases with a review date on or before the fictional reference date. Overdue means strictly earlier than that date.',
};
export const pct=v=>finite(v)?v.toFixed(1)+'%':'—';
export const displayDate=v=>v?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(v+'T12:00:00Z')):'—';
export const gradeGap=v=>v==null?'—':v>0?'+'+v:String(v);
export const matchText=(query,...values)=>{
  const terms=String(query||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text=values.flat(Infinity).join(' ').toLowerCase();
  return terms.every(t=>text.includes(t));
};
export function sortRows(rows,key,direction='asc'){
  const dir=direction==='desc'?-1:1;
  return [...rows].sort((a,b)=>{
    const x=sortValue(a,key),y=sortValue(b,key);
    if(x==null||y==null)return x==null&&y==null?String(a.id).localeCompare(String(b.id)):x==null?1:-1;
    const cmp=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'en',{numeric:true,sensitivity:'base'});
    return cmp*dir||String(a.id).localeCompare(String(b.id));
  });
}
export function defaultScope(access){
  return ['faculty','house','school','teaching','tutor'].find(s=>access.availableScopes.includes(s))||'accessible';
}
export function scopeOptions(access){return ['accessible',...access.availableScopes].map(id=>({id,label:SCOPE_LABELS[id]}));}
export function parseRoute(hash){
  const parts=String(hash||'').replace(/^#\/?/,'').split('/');
  const page=NAV.some(n=>n[0]===parts[0])?parts[0]:'home';
  let classId=null;
  if(page==='classes'&&parts[1])try{classId=decodeURIComponent(parts[1]);}catch{}
  return {page,classId};
}
export const routeHash=(page,classId)=>'#'+page+(page==='classes'&&classId?'/'+encodeURIComponent(classId):'');

/** Permission-aware projection of the single V2 snapshot. No synthetic summary constants. */
export function createWorkspace(store,staffId,requestedScope){
  const data=store.snapshot(),read=store.read(staffId),access=read.access;
  const scope=scopeOptions(access).some(s=>s.id===requestedScope)?requestedScope:defaultScope(access);
  const maps=Object.fromEntries(['students','staff','classes','courses','subjects','faculties','houses','tutorGroups','enrolments','gradeSchemes','interventions'].map(t=>[t,new Map(data[t].map(r=>[r.id,r]))]));
  const get=(table,id)=>maps[table]?.get(id);
  const scopeIds=new Set(access.scopeEnrolments(scope));
  const accessibleIds=new Set(access.scopeEnrolments('accessible'));
  const scopeStudentIds=new Set(access.scopeStudents(scope));
  const visibleCases=read.cases();
  const scopedCases=visibleCases.filter(c=>scopeIds.has(c.enrolmentId));
  const homes=new Map();
  const getHome=id=>{if(!homes.has(id))homes.set(id,read.home(id));return homes.get(id);};
  const allHome=()=>getHome('accessible');
  const home=()=>getHome(scope);
  const classInfo=id=>{
    const c=get('classes',id);if(!c)return null;
    const course=get('courses',c.courseId),subject=get('subjects',course.subjectId),faculty=get('faculties',subject.facultyId);
    return {...c,course,subject,faculty,year:course.year,teachers:c.teacherIds.map(id=>get('staff',id).name).join(', ')};
  };
  const enrolmentClass=e=>classInfo(get('enrolments',e)?.classId);
  const studentInfo=id=>{
    const s=get('students',id);if(!s)return null;
    return {id:s.id,name:s.name,year:s.year,tutorGroupId:s.tutorGroupId,house:get('houses',s.houseId).name,
      tags:[...s.tags]};
  };
  const notesFor=eId=>data.notes.filter(n=>n.enrolmentId===eId&&n.visibility==='subject'&&access.canViewNote(n.id))
    .map(n=>({...n,author:get('staff',n.authorStaffId)?.name,editable:access.canEditSubjectNote(n.id)}))
    .sort((a,b)=>(b.updatedDate??b.date).localeCompare(a.updatedDate??a.date)||b.date.localeCompare(a.date)||b.id.localeCompare(a.id,undefined,{numeric:true}));
  const activeByStudent=new Map();
  for(const c of visibleCases.filter(c=>c.state!=='closed')){
    const id=get('enrolments',c.enrolmentId).studentId;
    if(!activeByStudent.has(id))activeByStudent.set(id,[]);
    activeByStudent.get(id).push(c);
  }
  function subjectDetail(enrolmentId){
    const e=get('enrolments',enrolmentId);
    if(!e||!access.canViewEnrolment(e.id))throw new Error('Subject record outside current demo scope');
    const d=studentDetail(e.studentId),summary=d.subjects.find(s=>s.enrolmentId===e.id);
    if(!summary)throw new Error('Subject record outside current demo scope');
    return {student:d.student,summary,notes:notesFor(e.id),cases:d.cases.filter(c=>c.enrolmentId===e.id),
      canComment:access.canAddSubjectNote(e.id),targetEditable:access.canEditMinimumTarget(e.id)};
  }
  function noteDetail(id){
    const n=data.notes.find(n=>n.id===id&&n.visibility==='subject'&&access.canViewNote(n.id));
    if(!n)throw new Error('Comment outside current demo scope');
    return {...n,editable:access.canEditSubjectNote(id),subject:subjectDetail(n.enrolmentId)};
  }
  const people=ids=>ids.map(id=>({id,name:get('staff',id)?.name??id}));
  const staffName=id=>get('staff',id)?.name??'—';
  function caseParticipants(enrolmentId){
    const e=get('enrolments',enrolmentId),c=enrolmentClass(enrolmentId),p=get('students',e.studentId);
    return {teachers:people(c.teacherIds),faculty:people(c.faculty.headIds),house:people(get('houses',p.houseId).headIds),
      tutors:people(get('tutorGroups',p.tutorGroupId).tutorIds),leadership:people(data.staff.filter(s=>s.roles.includes('leadership')).map(s=>s.id))};
  }
  const plansByCase=new Map(data.studyPlans.map(p=>[p.interventionId,p]));
  const enrichCase=c=>{
    const p=studentInfo(get('enrolments',c.enrolmentId).studentId),cls=enrolmentClass(c.enrolmentId);
    return {...c,student:p,classInfo:cls,studentName:p.name,classCode:cls.code,faculty:cls.faculty.name,house:p.house,
      status:WAVE_LABELS[c.state],owner:get('staff',c.ownerStaffId)?.name??'—',
      due:c.state!=='closed'&&c.reviewDate<=data.asOf,overdue:c.state!=='closed'&&c.reviewDate<data.asOf,
      actions:access.caseActions(c.id),pending:pendingCaseActions(data,access,c)};
  };
  const caseRows=()=>scopedCases.map(enrichCase);
  const classIdsFor=ids=>new Set(data.enrolments.filter(e=>ids.has(e.id)).map(e=>e.classId));
  const scopedClassIds=classIdsFor(scopeIds),accessibleClassIds=classIdsFor(accessibleIds);
  const classCache=new Map();
  const markbooks=new Map();
  function markbook(id){
    if(!scopedClassIds.has(id))throw Error('Class outside current scope');
    if(!markbooks.has(id))markbooks.set(id,createMarkbook(data,access,id,scope));
    return markbooks.get(id);
  }
  const analysisCache=new Map();
  function academicAnalysis(id){
    if(!scopedClassIds.has(id))throw Error('Class outside current scope');
    if(!analysisCache.has(id))analysisCache.set(id,createAcademicAnalysis(data,access,scope,id));
    return analysisCache.get(id);
  }
  function classRecord(id){
    if(!scopedClassIds.has(id))throw new Error('Class is not in the selected scope');
    if(classCache.has(id))return classCache.get(id);
    const c=classInfo(id),summary=read.classSlice(id,scope);
    const cases=scopedCases.filter(i=>get('enrolments',i.enrolmentId).classId===id&&i.state!=='closed');
    const total=data.enrolments.filter(e=>e.classId===id).length;
    const row={...c,teacher:c.teachers,mean:summary.mean,students:summary.coverage.eligible,scored:summary.coverage.scored,
      total,partial:summary.coverage.eligible<total,below:summary.belowTarget.length,cases:cases.length,
      summary,roster:summary.rows.map(r=>{
        const p=studentInfo(r.studentId),active=cases.filter(i=>i.enrolmentId===r.enrolmentId);
        return projectRegisterRow(r,p,{cases:activeByStudent.get(p.id)??[],subjectCases:active,notes:notesFor(r.enrolmentId),
          grades:get('gradeSchemes',c.course.gradeSchemeId).bands.map(b=>b.grade),
          editable:access.canEditPrediction(r.enrolmentId),targetEditable:access.canEditMinimumTarget(r.enrolmentId),
          canComment:access.canAddSubjectNote(r.enrolmentId)});
      })};
    classCache.set(id,row);return row;
  }
  const classRows=()=>[...scopedClassIds].map(classRecord);
  let studentRowsCache;
  function studentRows(){
    if(studentRowsCache)return studentRowsCache;
    const subjectRows=new Map(),caseRows=new Map();
    for(const c of home().cohort.courses)for(const r of c.rows){
      if(!subjectRows.has(r.studentId))subjectRows.set(r.studentId,[]);
      subjectRows.get(r.studentId).push(r);
    }
    for(const c of scopedCases){
      const row=enrichCase(c),id=row.student.id;
      if(!caseRows.has(id))caseRows.set(id,[]);
      caseRows.get(id).push(row);
    }
    studentRowsCache=[...scopeStudentIds].map(id=>directoryRow(studentInfo(id),subjectRows.get(id)??[],caseRows.get(id)??[]));
    return studentRowsCache;
  }
  function studentDetail(id){
    const result=read.student(id);
    return {student:studentInfo(id),subjects:result.subjects.map(s=>({...s,classInfo:classInfo(s.classId),
      editable:access.canEditPrediction(s.enrolmentId),
      grades:get('gradeSchemes',classInfo(s.classId).course.gradeSchemeId).bands.map(b=>b.grade)})),
      cases:result.cases.map(enrichCase),notes:result.notes.map(n=>({...n,author:get('staff',n.authorStaffId)?.name,
        classInfo:enrolmentClass(n.enrolmentId)}))};
  }
  const profileCache=new Map();
  let profileEngine;
  const profileEvidence=()=>profileEngine??=createProfileEvidence(data,access);
  function studentProfile(id){
    if(!access.canViewStudent(id))throw Error('Student outside current demo scope');
    if(profileCache.has(id))return profileCache.get(id);
    const d=studentDetail(id),p=get('students',id),group=get('tutorGroups',p.tutorGroupId),house=get('houses',p.houseId);
    const people=ids=>ids.map(id=>({id,name:get('staff',id).name}));
    const notes=orderedNotes(d.notes).map(n=>({...n,editable:access.canEditSubjectNote(n.id)}));
    const cases=[...d.cases].sort((a,b)=>Number(a.state==='closed')-Number(b.state==='closed')||
      (a.state==='closed'?b.updatedDate.localeCompare(a.updatedDate):a.reviewDate.localeCompare(b.reviewDate))||a.id.localeCompare(b.id));
    const subjects=d.subjects.map(s=>({...s,targetEditable:access.canEditMinimumTarget(s.enrolmentId),
      canComment:access.canAddSubjectNote(s.enrolmentId),canStart:access.canStartWave1(s.enrolmentId),noteCount:notes.filter(n=>n.visibility==='subject'&&n.enrolmentId===s.enrolmentId).length,
      activeCases:cases.filter(c=>c.state!=='closed'&&c.enrolmentId===s.enrolmentId)}))
      .sort((a,b)=>a.classInfo.subject.name.localeCompare(b.classInfo.subject.name)||a.enrolmentId.localeCompare(b.enrolmentId));
    const profile={student:{...d.student,tutors:people(group.tutorIds),houseHeads:people(house.headIds),tutorGroupName:group.name},
      subjects,counts:studentCounts(subjects),cases,notes,activeCases:cases.filter(c=>c.state!=='closed'),
      closedCases:cases.filter(c=>c.state==='closed'),asOf:data.asOf};
    profileCache.set(id,profile);return profile;
  }
  function profileSubject(id,enrolmentId){
    const p=studentProfile(id),s=p.subjects.find(s=>s.enrolmentId===enrolmentId);
    if(!s)throw Error('Subject outside this pupil’s accessible profile');
    return {...profileEvidence().subject(enrolmentId),subject:s};
  }
  function profileResult(id,enrolmentId,assessmentId){
    const p=studentProfile(id);
    if(!p.subjects.some(s=>s.enrolmentId===enrolmentId))throw Error('Subject outside this pupil’s accessible profile');
    return profileEvidence().result(enrolmentId,assessmentId);
  }
  function profilePeers(id){
    if(!access.canViewStudent(id))throw Error('Student outside current demo scope');
    const ids=scopeStudentIds.has(id)?[...scopeStudentIds]:access.scopeStudents('accessible');
    return ids.map(studentInfo).sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true}));
  }
  function caseDetail(id){
    const c=visibleCases.find(c=>c.id===id);
    if(!c)throw new Error('Intervention outside current demo scope');
    const row=enrichCase(c),plan=plansByCase.get(c.id),participants=caseParticipants(c.enrolmentId);
    const summary=read.student(row.student.id).subjects.find(s=>s.enrolmentId===c.enrolmentId);
    return {...row,participants,summary,
      wave2Referrer:staffName(c.wave2Referral?.requestedBy),wave3Referrer:staffName(c.wave3Referral?.requestedBy),
      houseOwner:c.houseOwnerStaffId?staffName(c.houseOwnerStaffId):participants.house.map(p=>p.name).join(', '),
      houseResponder:staffName(c.houseResponse?.actorStaffId),
      history:c.history.map(h=>({...h,actor:staffName(h.actorStaffId)})),
      studyPlan:plan?{...plan,owner:staffName(plan.ownerStaffId),history:(plan.history??[]).map(h=>({...h,actor:staffName(h.actorStaffId)}))}:null};
  }
  let startOptionsCache;
  function caseStartOptions(){
    return startOptionsCache??=data.enrolments.filter(e=>access.canStartWave1(e.id)).map(e=>{
      const p=studentInfo(e.studentId),c=enrolmentClass(e.id);
      return {id:e.id,student:p,classInfo:c,label:p.name+' · '+c.code+' · '+c.subject.name,scoped:scopeIds.has(e.id)};
    }).sort((a,b)=>a.label.localeCompare(b.label,'en',{numeric:true}));
  }
  function caseStartDetail(id){
    const option=caseStartOptions().find(e=>e.id===id);
    if(!option)throw Error('An assigned teacher must select a pupil without an active subject case');
    return {...option,participants:caseParticipants(id),summary:read.student(option.student.id).subjects.find(s=>s.enrolmentId===id)};
  }
  const communications=()=>read.communications();
  function noticeDetail(id){
    const n=communications().notices.find(n=>n.id===id);
    if(!n)throw new Error('Notice outside current demo scope');
    return n;
  }
  function deadlineDetail(id){
    const d=communications().deadlines.find(d=>d.id===id);
    if(!d)throw new Error('Deadline outside current demo scope');
    return d;
  }
  const staffIds=new Set([staffId,...data.classes.filter(c=>accessibleClassIds.has(c.id)).flatMap(c=>c.teacherIds)]);
  for(const p of data.students.filter(s=>access.canViewStudent(s.id))){
    for(const id of get('tutorGroups',p.tutorGroupId).tutorIds)staffIds.add(id);
    for(const id of get('houses',p.houseId).headIds)staffIds.add(id);
  }
  function staffDetail(id){
    if(!staffIds.has(id))throw new Error('Staff member outside current demo directory');
    const p=get('staff',id);
    return {staff:p,classes:data.classes.filter(c=>accessibleClassIds.has(c.id)&&c.teacherIds.includes(id)).map(c=>classInfo(c.id))};
  }
  const directory=()=>{
    const notices=allHome().notices;
    return [
      ...data.students.filter(p=>access.canViewStudent(p.id)).map(p=>({kind:'student',id:p.id,title:p.name,sub:'Year '+p.year+' · TG '+p.tutorGroupId+' · '+get('houses',p.houseId).name,terms:[p.id,p.tutorGroupId,p.tags]})),
      ...[...accessibleClassIds].map(id=>{const c=classInfo(id);return {kind:'class',id,title:c.code+' · '+c.name,sub:c.course.name+' · '+c.teachers,terms:[c.faculty.name,c.id]};}),
      ...visibleCases.map(c=>{const r=enrichCase(c);return {kind:'case',id:c.id,title:r.student.name+' · '+r.status,sub:r.classInfo.code+' · '+r.student.tutorGroupId,terms:[c.id,r.faculty,c.reason]};}),
      ...notices.map(n=>({kind:'notice',id:n.id,title:n.title,sub:n.kind==='briefing'?'Briefing':'Staff notice',terms:[n.body]})),
      ...communications().deadlines.filter(d=>!d.archived).map(d=>({kind:'deadline',id:d.id,title:d.title,sub:'Reporting schedule · '+d.dueDate,terms:[d.event,audienceLabel(d.audience)]})),
      ...[...staffIds].map(id=>get('staff',id)).filter(Boolean).map(p=>({kind:'staff',id:p.id,title:p.name,sub:p.roles.map(r=>ROLE_LABELS[r]).join(' · '),terms:p.roles}))
    ];
  };
  function search(q,limit=40){
    if(!String(q||'').trim())return [];
    return directory().filter(r=>matchText(q,r.title,r.sub,r.terms)).slice(0,limit);
  }
  function audienceLabel(a){
    if(a.type==='all')return 'All staff';
    if(a.type==='year')return 'Year '+a.id;
    return get({faculty:'faculties',house:'houses',tutorGroup:'tutorGroups'}[a.type],a.id)?.name??a.id;
  }
  return {staff:access.staff,staffOptions:data.staff,access,scope,scopeOptions:scopeOptions(access),asOf:data.asOf,academicYear:data.academicYear,
    home,allHome,scopeStudentIds,scopedClassIds,accessibleClassIds,classRows,classRecord,studentRows,studentDetail,studentProfile,profileSubject,profileResult,profilePeers,subjectDetail,noteDetail,markbook,academicAnalysis,
    caseRows,caseDetail,caseStartOptions,caseStartDetail,noticeDetail,deadlineDetail,communications,staffDetail,search,audienceLabel};
}
