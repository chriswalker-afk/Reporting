const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function demo() {
  const window={};
  const document={querySelector:()=>null};
  const ctx={window,document,console,Date};
  vm.createContext(ctx);
  for(const file of ['data.js','access.js','support-core.js','support-ui.js',
                      'assessment-core.js','classroom.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});
  }
  return window;
}

test('every demo student has exactly one valid, explicit tutor-group tag',()=>{
  const {SchoolHubData:data}=demo();
  const ids=Array.from(data.tutorGroups,g=>g.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.length>3);
  for(const pupil of data.students){
    assert.ok(pupil.tutorGroupId,pupil.id+' has no tutor group');
    assert.ok(ids.includes(pupil.tutorGroupId),pupil.id+' unknown group');
    assert.ok(pupil.house,'House membership should remain independent');
  }
});

test('group tutor directory refers only to valid demo teachers and their assigned groups',()=>{
  const {SchoolHubData:data,SchoolHubAccess:access}=demo();
  for(const tg of data.tutorGroups){
    if(!tg.tutorId) continue;
    const owner=access.profiles.find(p=>p.id===tg.tutorId);
    assert.ok(owner,'No assigned tutor for '+tg.id);
    assert.ok(owner.roles.includes('teacher'));
    assert.ok(owner.tutorGroupIds.includes(tg.id));
  }
});

test('tutor visibility follows explicit tutorGroupId, never the legacy form property',()=>{
  const {SchoolHubData:data,SchoolHubAccess:access}=demo();
  const sam={...access.profiles.find(p=>p.id==='sam'),roles:['teacher']};
  const pupil=data.students.find(p=>p.id==='S023');
  assert.equal(access.isTutorOf(sam,pupil),true);
  assert.equal(access.canViewStudent(sam,pupil,data.classes),true);
  const oldFormOnly={...pupil,form:'11A',tutorGroupId:'11D'};
  assert.equal(access.isTutorOf(sam,oldFormOnly),false);
  assert.equal(access.canViewStudent(sam,oldFormOnly,data.classes),false);
  const explicitTag={...pupil,form:'11D',tutorGroupId:'11A'};
  assert.equal(access.isTutorOf(sam,explicitTag),true);
  assert.equal(access.canViewStudent(sam,explicitTag,data.classes),true);
});

test('class register displays group tags independently from EAL/SEN/SOC flags',()=>{
  const {SchoolHubClassroom:classroom}=demo();
  const ctx={classId:'11MA1',tab:'register',icon:()=>'',avatar:()=>'<span></span>'};
  const html=classroom.render(ctx);
  assert.match(html,/<th>Tutor group<\/th>/);
  assert.match(html,/class="tutor-group-tag"/);
  assert.match(html,/TG 11A/);
  assert.match(html,/TG 11B/);
  assert.match(html,/Filter class by tutor group/);
  for(const flag of ['EAL','SEN','SOC'])assert.match(html,new RegExp(flag));
});

test('class tutor-group and intervention-flag filters combine and reset between classes',()=>{
  const {SchoolHubClassroom:classroom}=demo();
  const ctx={store:{selectedClass:'11MA1'},render:()=>{},notify:()=>{}};
  const render=()=>classroom.render({classId:'11MA1',tab:'register',icon:()=>'',avatar:()=>''});
  assert.equal(classroom.onChange({target:{id:'class-tutor-group-filter',value:'11B'}},ctx),true);
  let html=render();
  assert.match(html,/Daniel Tan/);
  assert.doesNotMatch(html,/Sofia Rahman/);
  classroom.onAction('class-filter',{dataset:{id:'EAL'}},ctx);
  html=render();
  assert.match(html,/Zara Lim/);
  assert.doesNotMatch(html,/Daniel Tan/);
  classroom.resetFilter();
  html=render();
  assert.match(html,/Sofia Rahman/);
  assert.match(html,/Daniel Tan/);
});

test('intervention record displays canonical tutor-group assignment and linked tutor',()=>{
  const {SchoolHubSupportUI:ui,SchoolHubSupport:support}=demo();
  const caseId=support.cases.find(c=>c.studentId==='S002').id;
  const ctx={render:()=>{},notify:()=>{}};
  ui.action('support-open',{dataset:{id:caseId}},ctx);
  const html=ui.modalHTML(()=>'<span></span>');
  assert.match(html,/Tutor group/);
  assert.match(html,/TG 11B/);
  ui.close();
});

test('student and people UI use the first-class group for tags and search',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
  assert.match(app,/tutorGroupTag\(s\)/);
  assert.match(app,/tutorGroupIds/);
  assert.match(app,/tutor group '\+s\.tutorGroupId/);
  assert.doesNotMatch(app,/tutorForms/);
});
