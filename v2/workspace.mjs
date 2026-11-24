import {finite} from './model.mjs';
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
export const ACTION_LABELS={activateWave2:'Complete Wave 2 plan',respondHouse:'Respond to House request',
  respondLeadership:'Review Wave 3 referral',review:'Review intervention'};
export const HELP={
  scope:'Changes the displayed cohort, not your permissions. All my access combines your assigned responsibilities. House and tutor views use only members of those groups.',
  average:'Weighted mean of complete, included assessment percentages for each pupil, then the mean of those pupil percentages. Missing and excluded marks are omitted; zero is valid.',
  coverage:'Number of pupils with a calculated overall percentage, divided by pupils in the selected class or cohort. Results are not rounded until display.',
  target:'Current overall grade compared with the minimum target using the ordered course grading scheme. Unknown grades are kept separate.',
  predicted:'Teacher-entered predicted grade. It is distinct from the current grade calculated from assessment marks.',
  intervention:'Active subject cases, not the number of pupils. A pupil can have more than one case. Closed cases are retained in the history.',
  tutor:'Tutor group is independent of teaching class. Tutor access follows assigned tutor-group membership.',
  flags:'Fictional administrative tags: EAL = English as an additional language; SEN = special educational needs. HLP and access arrangements are illustrative administrative indicators; no sensitive details are included.',
  partial:'Only pupils within the selected scope contribute. This is not necessarily the entire teaching class.',
  date:'Reference date of the fictional dataset. Assessments after this date, drafts and excluded assessments do not contribute to overall summaries.',
  notices:'Published, unexpired notices matching your assigned responsibilities. The scope selector changes academic cohorts, not notice audiences.',
  edit:'Only assigned teachers can edit predicted grades. The new grade is validated against the course grading scale and recorded in demo audit history.',
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
    const x=a[key],y=b[key];
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
  const allHome=()=>read.home('accessible');
  const home=()=>read.home(scope);
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
  const enrichCase=c=>{
    const p=studentInfo(get('enrolments',c.enrolmentId).studentId),cls=enrolmentClass(c.enrolmentId);
    return {...c,student:p,classInfo:cls,studentName:p.name,classCode:cls.code,faculty:cls.faculty.name,house:p.house,
      status:WAVE_LABELS[c.state],owner:get('staff',c.ownerStaffId)?.name??'—',
      due:c.state!=='closed'&&c.reviewDate<=data.asOf,overdue:c.state!=='closed'&&c.reviewDate<data.asOf,
      actions:access.caseActions(c.id)};
  };
  const caseRows=()=>scopedCases.map(enrichCase);
  const classIdsFor=ids=>new Set(data.enrolments.filter(e=>ids.has(e.id)).map(e=>e.classId));
  const scopedClassIds=classIdsFor(scopeIds),accessibleClassIds=classIdsFor(accessibleIds);
  const classCache=new Map();
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
        return {...p,...r,id:r.enrolmentId,name:p.name,active,editable:access.canEditPrediction(r.enrolmentId)};
      })};
    classCache.set(id,row);return row;
  }
  const classRows=()=>[...scopedClassIds].map(classRecord);
  const studentRows=()=>[...scopeStudentIds].map(id=>{
    const info=studentInfo(id);
    const count=data.enrolments.filter(e=>e.studentId===id&&scopeIds.has(e.id)).length;
    const cases=scopedCases.filter(c=>c.state!=='closed'&&get('enrolments',c.enrolmentId).studentId===id);
    return {...info,subjects:count,cases:cases.length,wave:cases.length?Math.max(...cases.map(c=>c.wave)):0};
  });
  function studentDetail(id){
    const result=read.student(id);
    return {student:studentInfo(id),subjects:result.subjects.map(s=>({...s,classInfo:classInfo(s.classId),
      editable:access.canEditPrediction(s.enrolmentId),
      grades:get('gradeSchemes',classInfo(s.classId).course.gradeSchemeId).bands.map(b=>b.grade)})),
      cases:result.cases.map(enrichCase),notes:result.notes.map(n=>({...n,author:get('staff',n.authorStaffId)?.name,
        classInfo:enrolmentClass(n.enrolmentId)}))};
  }
  function caseDetail(id){
    const c=visibleCases.find(c=>c.id===id);
    if(!c)throw new Error('Intervention outside current demo scope');
    return enrichCase(c);
  }
  function noticeDetail(id){
    const n=allHome().notices.find(n=>n.id===id);
    if(!n)throw new Error('Notice outside current demo scope');
    return {...n,author:get('staff',n.authorStaffId)?.name};
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
    home,allHome,scopeStudentIds,scopedClassIds,accessibleClassIds,classRows,classRecord,studentRows,studentDetail,
    caseRows,caseDetail,noticeDetail,staffDetail,search,audienceLabel};
}
