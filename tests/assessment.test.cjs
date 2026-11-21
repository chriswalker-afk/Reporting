const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../assessment-core.js');

const one={id:'A1',classId:'X',title:'Paper',date:'2026-11-22',type:'Topic test',mode:'topics',
  items:[{id:'q1',label:'Algebra',topic:'Algebra',maxMarks:5},
    {id:'q2',label:'Graphs',topic:'Graphs',maxMarks:5}],
  scores:{s1:{q1:0,q2:0},s2:{q1:5,q2:5},s3:{q1:3,q2:null}},
  excludedStudents:{},includeInSummary:true,exclusionReason:'',status:'Published'};
const pupils=[{id:'s1',name:'One'},{id:'s2',name:'Two'},{id:'s3',name:'Three'}];

test('zero is a mark, blank is not, partial rows never enter the average',()=>{
  assert.equal(core.resultFor(one,'s1').status,'scored');
  assert.equal(core.resultFor(one,'s1').percent,0);
  assert.equal(core.resultFor(one,'s3').status,'incomplete');
  assert.equal(core.assessmentStats(one,pupils).mean,50);
  assert.equal(core.assessmentStats(one,pupils).scored,2);
  assert.equal(core.resultFor(one,'s9').status,'unmarked');
});
test('excluded students remain in the data but are omitted from calculation',()=>{
  const a=core.clone(one);a.excludedStudents.s2='Absent';
  assert.equal(core.resultFor(a,'s2').status,'excluded');
  assert.equal(core.assessmentStats(a,pupils).mean,0);
  assert.equal(core.assessmentStats(a,pupils).excluded,1);
  assert.equal(Object.keys(a.scores).length,3);
});
test('whole assessment exclusion does not remove it from standalone analysis',()=>{
  const b=core.clone(one);b.id='A2';b.includeInSummary=false;b.exclusionReason='Diagnostic only';
  assert.equal(core.summaryStats([one,b],pupils).mean,50);
  assert.equal(core.summaryStats([one,b],pupils).usedAssessments,1);
  assert.equal(core.assessmentStats(b,pupils).mean,50);
});
test('questions aggregate into weighted topic percentages',()=>{
  const a=core.clone(one);a.mode='questions';
  a.items=[{id:'q1',label:'Q1',topic:'Algebra',maxMarks:5,ao:'AO1'},
  {id:'q2',label:'Q2',topic:'Algebra',maxMarks:5,ao:'AO3'}];
  const t=core.topicStats(a,pupils);
  assert.equal(t.length,1);
  assert.equal(t[0].topic,'Algebra');
  assert.equal(t[0].percent,50);
  assert.equal(core.itemStats(a,pupils)[0].percent,50);
});
test('reuse makes a fresh blank structure without copying pupil data or exclusions',()=>{
  const a=core.clone(one);a.excludedStudents.s1='Absent';a.includeInSummary=false;
  const copy=core.cloneStructure(a,'Y','newid');
  assert.equal(copy.classId,'Y');
  assert.equal(copy.status,'Draft');
  assert.equal(copy.includeInSummary,true);
  assert.deepEqual(copy.scores,{});
  assert.deepEqual(copy.excludedStudents,{});
  assert.equal(copy.items.length,a.items.length);
  assert.notEqual(copy.items,a.items);
});
test('saving excluded pupils and assessment requires recorded reasons',()=>{
  const a=core.clone(one);
  a.excludedStudents.s2='';
  assert.ok(core.validate(a,pupils).some(s=>s.includes('reason for every')));
  a.excludedStudents.s2='Absent';
  a.includeInSummary=false;a.exclusionReason='';
  assert.ok(core.validate(a,pupils).some(s=>s.includes('reason for excluding')));
  a.exclusionReason='Diagnostic only';
  assert.deepEqual(core.validate(a,pupils),[]);
  assert.equal(core.exclusionChanged(one,a),true);
  assert.equal(core.exclusionChanged(a,core.clone(a)),false);
});
test('invalid marks or structure are rejected rather than silently clamped',()=>{
  const a=core.clone(one);
  a.scores.s2.q1=6;
  assert.ok(core.validate(a,pupils).some(s=>s.includes('marks for Two')||s.includes('Marks for Two')));
  a.scores.s2.q1=5;a.items[0].maxMarks=0;
  assert.ok(core.validate(a,pupils).some(s=>s.includes('positive maximum')));
});
test('unmarked assessments remain drafts, so they are excluded from rollups',()=>{
  const a=core.clone(one);a.scores={};
  assert.equal(core.publishState(a,pupils),'Draft');
  a.status=core.publishState(a,pupils);
  assert.equal(core.summaryStats([a],pupils).usedAssessments,0);
});

function createBrowserHarness() {
  const context={window:{},document:{querySelector:()=>null},Date,console};
  vm.createContext(context);
  for(const file of ['data.js','assessment-core.js','classroom.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
  }
  return context.window;
}
test('fictional register exposes EAL, SEN, SOC and assessment actions',()=>{
  const browser=createBrowserHarness(),classroom=browser.SchoolHubClassroom;
  assert.ok(classroom);
  const html=classroom.render({classId:'11MA1',tab:'register',
    icon:()=>'',avatar:()=>'<span></span>'});
  for(const str of ['EAL','SEN','SOC','New assessment','assess-open-analysis','11MA1']){
    assert.match(html,new RegExp(str));
  }
  assert.ok(classroom.assessmentsFor('11MA1').length>=2);
});
test('wizard starts with no exclusions and requires review acknowledgement',()=>{
  const browser=createBrowserHarness(),classroom=browser.SchoolHubClassroom;
  const ctx={store:{selectedClass:'11MA1',classTab:'register'},
    render:()=>{},notify:()=>{}};
  classroom.onAction('class-new-assessment',{dataset:{}},ctx);
  assert.ok(classroom.wizardOpen());
  const page=classroom.wizardHTML();
  assert.match(page,/New assessment/);
  // Name then proceed through the required four-step flow.
  classroom.onInput({target:{dataset:{assessField:'title'},value:'Example new test'}});
  classroom.onAction('assess-next',{dataset:{}},ctx);
  classroom.onAction('assess-next',{dataset:{}},ctx);
  assert.match(classroom.wizardHTML(),/Enter marks/);
  classroom.onAction('assess-toggle-student',{dataset:{id:'S002'}},ctx);
  classroom.onAction('assess-next',{dataset:{}},ctx);
  // Cannot continue to Review until an excluded pupil has a reason.
  assert.match(classroom.wizardHTML(),/reason for every excluded student/i);
  classroom.onInput({target:{dataset:{assessReason:'S002'},value:'Absent on the day'}});
  classroom.onAction('assess-next',{dataset:{}},ctx);
  assert.match(classroom.wizardHTML(),/Confirm exclusion changes/);
  classroom.onAction('assess-save',{dataset:{}},ctx);
  assert.ok(classroom.wizardOpen(),'save must not pass without acknowledgement');
  classroom.onChange({target:{id:'assessment-exclusion-ack',checked:true}},ctx);
  classroom.onAction('assess-save',{dataset:{}},ctx);
  assert.equal(classroom.wizardOpen(),false);
  assert.ok(classroom.assessmentsFor('11MA1').some(a=>a.title==='Example new test'));
});
test('index loads all modules before app and class UI has CSS',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  for(const name of ['data.js','assessment-core.js','classroom.js','app.js'])assert.ok(html.includes(name));
  assert.ok(html.indexOf('data.js')<html.indexOf('assessment-core.js'));
  assert.ok(html.indexOf('assessment-core.js')<html.indexOf('classroom.js'));
  assert.ok(html.indexOf('classroom.js')<html.indexOf('app.js'));
  assert.ok(html.includes('classroom.css'));
});
