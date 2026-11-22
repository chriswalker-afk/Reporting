const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Access=require('../access.js');
const {createService}=require('../support-core.js');

const ctx={window:{}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','data.js'),'utf8'),ctx);
const data=ctx.window.SchoolHubData;
const person=id=>data.students.find(s=>s.id===id);
const group=id=>data.classes.find(c=>c.id===id);
const cloned=(id,roles)=>({...Access.profiles.find(p=>p.id===id),roles});
const cases=()=>createService(data,Access);

test('teaching, tutor, faculty, house and leadership scopes are additive',()=>{
  const teacher=cloned('sam',['teacher']);
  const hof=cloned('sam',['teacher','faculty']);
  const house=cloned('morgan',['house']);
  const leader=cloned('priya',['leadership']);
  const allIds=v=>Access.visibleClasses(v,data.classes).map(c=>c.id);
  assert.deepEqual(allIds(teacher).sort(),['11MA1','12MA1']);
  assert.deepEqual(allIds(hof).sort(),['10MA2','11MA1','12MA1']);
  assert.equal(allIds(house).length,data.classes.length);
  assert.equal(allIds(leader).length,data.classes.length);
  assert.equal(Access.canEditAssessment(teacher,group('11MA1')),true);
  assert.equal(Access.canEditAssessment(hof,group('10MA2')),false,
    'HoF can view faculty classes without automatically editing other teachers assessments');
  assert.equal(Access.canEditAssessment(house,group('10MA2')),false);
  assert.equal(Access.canEditAssessment(leader,group('11EN1')),false);
  assert.equal(Access.canViewStudent(teacher,person('S023'),data.classes),true,'tutor group can span subjects');
  assert.equal(Access.canViewClass(teacher,group('11EN1')),false);
});

test('multi-role users get a union of powers, never role replacement',()=>{
  Access.select('sam');
  assert.deepEqual(Access.viewer().roles,['teacher','faculty']);
  assert.equal(Access.toggleRole('house'),true);
  assert.ok(Access.viewer().roles.includes('teacher'));
  assert.ok(Access.viewer().roles.includes('faculty'));
  assert.ok(Access.viewer().roles.includes('house'));
  assert.equal(Access.toggleRole('house'),true);
  Access.select('jordan');
  assert.deepEqual(Access.viewer().roles,['teacher']);
  assert.equal(Access.toggleRole('teacher'),false,'cannot remove sole active role');
  Access.select('sam');
});

test('House staff see all classes but only cases in their assigned house',()=>{
  const model=cases(),morgan=cloned('morgan',['house']);
  const matching=model.findCase('SOC-003'); // S011 belongs to Willow House
  const notMatching=model.findCase('SOC-002'); // S004 belongs to Cedar House
  assert.equal(Access.canViewClass(morgan,group('11MA1')),true);
  assert.equal(Access.canViewCase(morgan,matching,person(matching.studentId),group(matching.classId)),true);
  assert.equal(Access.canViewCase(morgan,notMatching,person(notMatching.studentId),group(notMatching.classId)),false);
  const teacher=cloned('sam',['teacher']);
  assert.equal(model.visible(teacher).every(c=>teacher.taughtClasses.includes(c.classId)),true);
});

test('Wave 1 belongs to class teacher; review date and support plan required',()=>{
  const model=cases(),teacher=cloned('morgan',['teacher']);
  assert.equal(model.startWave1(cloned('sam',['faculty']),'S017','10SC1',
    {focus:'Number',description:'Practice',reviewDate:'2026-12-02'}).ok,false);
  const invalid=model.startWave1(teacher,'S017','10SC1',
    {focus:'',description:'',reviewDate:''});
  assert.equal(invalid.ok,false);
  const started=model.startWave1(teacher,'S017','10SC1',
    {focus:'Vocabulary recall',description:'Visual glossary and short quizzes',
      strategies:['Mathematical vocabulary lists or dictionaries'],reviewDate:'2026-12-02'});
  assert.equal(started.ok,true);
  assert.equal(started.case.state,'wave1');
  assert.equal(model.activeFor('S017','10SC1').wave1.focus,'Vocabulary recall');
  assert.equal(model.startWave1(teacher,'S017','10SC1',
    {focus:'Duplicate',description:'No',reviewDate:'2026-12-02'}).ok,false);
});

test('Wave 2 requires teacher request then a separate, scoped HoF plan and House task',()=>{
  const model=cases(),teacher=cloned('morgan',['teacher']),faculty=cloned('morgan',['faculty']);
  const wave1=model.startWave1(teacher,'S017','10SC1',
    {focus:'Subject vocabulary',description:'Visual practice',strategies:[],reviewDate:'2026-12-02'});
  assert.equal(model.activateWave2(faculty,wave1.case.id,
    {plan:'Faculty support',houseRequest:'Contact tutor',reviewDate:'2026-12-02'}).ok,false);
  assert.equal(model.requestWave2(teacher,wave1.case.id,{trigger:'Not valid',reason:'Need support'}).ok,false);
  assert.equal(model.requestWave2(teacher,wave1.case.id,
    {trigger:'Wave 1 has not improved the situation',reason:'Short interventions have not worked.'}).ok,true);
  assert.equal(model.activateWave2(teacher,wave1.case.id,
    {plan:'Faculty support',houseRequest:'Contact tutor',reviewDate:'2026-12-02'}).ok,false);
  assert.equal(model.activateWave2(faculty,wave1.case.id,
    {plan:'',houseRequest:'',reviewDate:''}).ok,false);
  const approved=model.activateWave2(faculty,wave1.case.id,
    {plan:'Support sessions with review',houseRequest:'Please coordinate a study routine with the tutor',
      strategies:['Focused faculty intervention with a review deadline'],reviewDate:'2026-12-15'});
  assert.equal(approved.ok,true);
  assert.equal(approved.case.state,'wave2');
  assert.equal(approved.case.wave2.reviewDate,'2026-12-15');
  assert.equal(approved.case.houseResponse,null);
});

test('House action belongs to pupil House, Wave 3 escalation to HoF or HsM, SLT owns next plan',()=>{
  const model=cases(),teacher=cloned('morgan',['teacher']),faculty=cloned('morgan',['faculty']);
  const hsmCedar={...cloned('morgan',['house']),houses:['Cedar']};
  const hsmWillow=cloned('morgan',['house']);
  const leader=cloned('priya',['leadership']);
  const c=model.startWave1(teacher,'S017','10SC1',{focus:'Review',description:'Targeted tasks',reviewDate:'2026-12-02'}).case;
  model.requestWave2(teacher,c.id,{trigger:'A singular more serious concern',reason:'Needs faculty review'});
  model.activateWave2(faculty,c.id,{plan:'Shared review',houseRequest:'Discuss with tutor',reviewDate:'2026-12-10'});
  assert.equal(model.respondHouse(hsmWillow,c.id,{response:'Not my house',complete:true}).ok,false);
  assert.equal(model.respondHouse(hsmCedar,c.id,{response:'Tutor contacted and response agreed',complete:true}).ok,true);
  assert.equal(c.houseResponse.complete,true);
  assert.equal(model.requestWave3(teacher,c.id,{reason:'Still needs help'}).ok,false);
  assert.equal(model.requestWave3(hsmCedar,c.id,{reason:''}).ok,false);
  assert.equal(model.requestWave3(hsmCedar,c.id,
    {reason:'Wider concern requires SLT coordination.'}).ok,true);
  assert.equal(c.state,'wave3_requested');
  assert.equal(model.respondLeadership(faculty,c.id,{plan:'Coordinate',reviewDate:'2026-12-21'}).ok,false);
  assert.equal(model.respondLeadership(leader,c.id,{plan:'Leadership-led review and support',reviewDate:'2026-12-21'}).ok,true);
  assert.equal(c.state,'wave3');
  assert.ok(c.history.some(h=>h.type==='requested'));
  assert.ok(c.history.some(h=>h.type==='house'));
  assert.ok(c.history.some(h=>h.type==='wave3'));
});

test('review entries retain history and do not silently escalate',()=>{
  const model=cases(),teacher=cloned('sam',['teacher']),c=model.findCase('SOC-001');
  assert.equal(model.review(teacher,c.id,{outcome:'No improvement',note:'Still struggling'}).ok,true);
  assert.equal(c.state,'wave1');
  assert.equal(c.reviews.length,1);
  assert.equal(c.history.at(-1).type,'review');
  assert.ok(model.queues(teacher).some(t=>t.caseId===c.id));
});

test('background code is independent of a backend and demo records are fictional',()=>{
  assert.ok(data.classes.some(c=>c.faculty==='Science'));
  assert.ok(data.classes.some(c=>c.faculty==='English'));
  assert.ok(data.students.every(s=>s.house));
  assert.ok(cases().cases.every(c=>c.history.length>0));
});
