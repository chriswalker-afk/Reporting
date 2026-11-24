import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoData} from '../v2/demo-data.mjs';
import {assertData,validateData,clone,resultKey} from '../v2/model.mjs';
import {createAccess} from '../v2/access.mjs';
import {createAnalytics,gradeFor,gradeDistance,distanceToNextGrade,describe,histogram} from '../v2/analytics.mjs';
import {createStore,STORAGE_KEY} from '../v2/store.mjs';

const base=()=>createDemoData();
const eq=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,actual+' != '+expected);
const eId='P121@11-maths',classId='11-maths-1',a1='11-maths-A1',a2='11-maths-A2',a3='11-maths-A3';
const owner='sam';
function controlled(){
  const d=base();
  const marks=[{total:20},{t1:20,t2:24},{q1:3,q2:5,q3:7}];
  for(const [i,id] of [a1,a2,a3].entries()){
    d.results=d.results.filter(r=>r.enrolmentId!==eId||r.assessmentId!==id);
    d.results.push({id:'TEST-'+i,assessmentId:id,enrolmentId:eId,status:'present',marks:marks[i],exclusionReason:null});
  }
  return assertData(d);
}
const clock=()=> '2026-11-24T07:00:00.000Z';

test('synthetic dataset is deterministic, relational and multi-subject',()=>{
  const d=base();assert.deepEqual(d,base());
  assert.equal(d.students.length,210);assert.equal(d.classes.length,42);
  assert.equal(d.enrolments.length,630);assert.equal(d.tutorGroups.length,21);
  assert.equal(d.assessments.length,105);assert.equal(d.courses.length,21);
  assert.equal(d.synthetic,true);assert.deepEqual(validateData(d),[]);
  for(const s of d.students)assert.equal(d.enrolments.filter(e=>e.studentId===s.id).length,3);
  assert.equal(new Set(d.results.map(r=>resultKey(r.assessmentId,r.enrolmentId))).size,d.results.length);
});
test('schema rejects duplicate enrolment, cross-course assignment, invalid marks, mismatched House and missing exclusions',()=>{
  const d=base();d.enrolments.push({...d.enrolments[0],id:'duplicate'});
  assert.ok(validateData(d).some(x=>x.includes('duplicate student/class')));
  const d2=base();d2.assessments[0].classIds.push('11-maths-1');
  assert.ok(validateData(d2).some(x=>x.includes('different course')));
  const d3=base();const r=d3.results.find(r=>r.status==='present');
  r.marks.unknown=999;
  assert.ok(validateData(d3).some(x=>x.includes('invalid mark')));
  const d4=base();d4.students[0].houseId='oak';
  assert.ok(validateData(d4).some(x=>x.includes('tutor group must match')));
  const d5=base();d5.assessments[0].includeInSummary=false;
  assert.ok(validateData(d5).some(x=>x.includes('needs a reason')));
});
test('role scopes are additive, tutor spans subjects, HsM class access is not case access',()=>{
  const d=base(),sam=createAccess(d,'sam'),jordan=createAccess(d,'jordan'),
    morgan=createAccess(d,'morgan'),slt=createAccess(d,'avery');
  assert.equal(sam.scopeClasses('teaching').length,7);
  assert.equal(sam.scopeClasses('faculty').length,14);
  assert.equal(jordan.scopeClasses().length,7);
  assert.equal(morgan.scopeClasses().length,42);
  assert.equal(slt.scopeStudents('school').length,210);
  const tutee=d.students.find(s=>jordan.isTutor(s.id));
  const science=d.enrolments.find(e=>e.studentId===tutee.id&&e.id.endsWith('-science'));
  assert.equal(jordan.canViewEnrolment(science.id),true);
  assert.equal(jordan.canViewClass(science.classId),false);
  assert.equal(morgan.scopeStudents('house').length,70);
  assert.equal(morgan.canViewCase('I001'),false); // Cedar pupil; no teaching or tutor responsibility for this case
  assert.equal(slt.canViewCase('I001'),true);
  assert.equal(sam.canEditResult(a1,eId),true);
  assert.equal(slt.canEditResult(a1,eId),false);
  assert.equal(jordan.canManageAssessment(a1),false);
  assert.equal(sam.canManageAssessment(a1),true);
});
test('grades use boundaries and ordered labels, not arithmetic on grade strings',()=>{
  const d=base(),ig=d.gradeSchemes.find(s=>s.id==='igcse'),al=d.gradeSchemes.find(s=>s.id==='alevel');
  assert.equal(gradeFor(72.999,ig),'6');assert.equal(gradeFor(73,ig),'7');
  assert.equal(gradeFor(100,ig),'9');assert.equal(gradeFor(null,ig),null);
  assert.equal(gradeDistance('C','A',al),-2);
  assert.equal(gradeDistance('C','7',al),null);
  assert.deepEqual(distanceToNextGrade(70,ig),{grade:'7',percentagePoints:3});
  assert.equal(distanceToNextGrade(100,ig),null);
});
test('statistics and chart bins use raw numeric data, including boundaries and zero',()=>{
  const s=describe([0,25,50,75,100]);
  assert.deepEqual(s,{n:5,mean:50,minimum:0,q1:25,median:50,q3:75,maximum:100,populationSD:Math.sqrt(1250)});
  assert.equal(describe([]).mean,null);
  assert.equal(describe([50]).populationSD,0);
  assert.deepEqual(histogram([0,10,20,100],[0,10,20,100]).map(b=>b.count),[1,1,2]);
});
test('weighted student and unit means exclude drafts and diagnostic tests',()=>{
  const d=controlled();const engine=createAnalytics(d);
  const s=engine.studentSummary(eId);
  eq(s.average,200/3);assert.equal(s.coverage.scored,3);assert.equal(s.coverage.eligible,3);
  assert.equal(s.latest.assessmentId,a3);assert.equal(s.best.assessmentId,a2);
  assert.equal(s.trend.length,3);
  eq(engine.unitSummary(eId,'11-maths-U1').average,75);
  eq(engine.studentSummary(eId,{from:'2026-10-01'}).average,75);
  d.assessments.find(a=>a.id===a2).weight=2;
  eq(createAnalytics(d).studentSummary(eId).average,75);
});
test('missing, absent, incomplete, excluded and zero are distinct; marks retained on exclusion',()=>{
  const d=controlled();const store=createStore({initialData:d,clock});
  store.saveResult(owner,a1,eId,{status:'present',marks:{total:0}});
  assert.equal(store.analytics().resultFor(a1,eId).percent,0);
  assert.equal(store.analytics().studentSummary(eId).coverage.scored,3);
  store.saveResult(owner,a3,eId,{status:'present',marks:{q1:0}});
  assert.equal(store.analytics().resultFor(a3,eId).status,'incomplete');
  store.saveResult(owner,a2,eId,{status:'absent',marks:{},confirmClear:true});
  assert.equal(store.analytics().resultFor(a2,eId).status,'absent');
  assert.equal(store.analytics().studentSummary(eId).average,0);
  store.setStudentExclusion(owner,a1,eId,{excluded:true,reason:'Demo resit',confirmed:true});
  const result=store.analytics().resultFor(a1,eId);
  assert.equal(result.status,'excluded');assert.equal(result.recordedPercent,0);assert.equal(result.percent,null);
  assert.equal(store.analytics().studentSummary(eId).average,null);
  assert.equal(store.analytics().studentSummary(eId).onTrack,null);
});
test('common assessment comparison and topic breakdown are derived from scored rows',()=>{
  const d=controlled(),engine=createAnalytics(d);
  const comparison=engine.compareCommonAssessment(a3);
  assert.equal(comparison.length,2);
  const all=engine.assessmentAnalysis(a3);
  assert.equal(all.statistics.n,comparison.reduce((s,c)=>s+c.statistics.n,0));
  assert.equal(all.histogram.reduce((s,b)=>s+b.count,0),all.statistics.n);
  const geometry=all.topics.find(t=>t.id==='Geometry');
  const complete=all.rows.filter(r=>r.status==='scored');
  assert.equal(geometry.earned,complete.reduce((s,r)=>s+r.marks.q1+r.marks.q3,0));
  assert.equal(geometry.available,complete.length*20);
  assert.throws(()=>engine.compareCommonAssessment(a3,['12-maths-1']),/not assigned/);
  assert.throws(()=>engine.topicSummary([eId,'P121@11-science']),/one course/);
});
test('one edit propagates through student, unit, class, question, cohort and home selectors',()=>{
  const store=createStore({initialData:controlled(),clock});
  const before=store.analytics(),oldStudent=before.studentSummary(eId),oldClass=before.classSummary(classId),
    oldAssessment=before.assessmentAnalysis(a3,{classIds:[classId]}),
    oldHome=store.read(owner).home('faculty');
  let notices=0;const unsubscribe=store.subscribe(()=>notices++);
  store.saveResult(owner,a3,eId,{status:'present',marks:{q1:6,q2:10,q3:14}});
  const after=store.analytics(),student=after.studentSummary(eId),cls=after.classSummary(classId),
    assessment=after.assessmentAnalysis(a3,{classIds:[classId]}),home=store.read(owner).home('faculty');
  eq(student.average,250/3);eq(student.average-oldStudent.average,50/3);
  assert.equal(student.latest.percent,100);assert.equal(student.trend.at(-1).percent,100);
  assert.equal(after.unitSummary(eId,'11-maths-U2').average,100);
  eq(cls.mean-oldClass.mean,(50/3)/cls.coverage.scored);
  eq(assessment.statistics.mean-oldAssessment.statistics.mean,50/assessment.statistics.n);
  assert.equal(assessment.topics.find(t=>t.id==='Geometry').earned-oldAssessment.topics.find(t=>t.id==='Geometry').earned,10);
  const profile=store.read(owner).student('P121');
  eq(profile.subjects.find(s=>s.enrolmentId===eId).average,student.average);
  const course=home.cohort.courses.find(c=>c.courseId==='11-maths');
  const previousCourse=oldHome.cohort.courses.find(c=>c.courseId==='11-maths');
  eq(course.mean-previousCourse.mean,(50/3)/course.coverage.scored);
  assert.equal(notices,1);unsubscribe();
  assert.equal(store.snapshot().audit.length,1);
  assert.equal(store.snapshot().audit[0].actorStaffId,owner);
});
test('exclusion guard prevents accidental or unauthorised edits; diagnostic remains analysable',()=>{
  const store=createStore({initialData:controlled(),clock});
  assert.throws(()=>store.saveResult('avery',a1,eId,{status:'present',marks:{total:30}}),/teaching staff/);
  assert.throws(()=>store.saveResult(owner,a1,eId,{status:'present',marks:{total:41}}),/invalid mark/);
  assert.throws(()=>store.setStudentExclusion(owner,a1,eId,{excluded:true,reason:'',confirmed:true}),/reason/);
  assert.throws(()=>store.setAssessmentInclusion('jordan',a1,{included:false,reason:'Diagnostic',confirmed:true,phrase:'EXCLUDE'}),/authorised/);
  assert.throws(()=>store.setAssessmentInclusion(owner,a1,{included:false,reason:'Diagnostic',confirmed:true,phrase:''}),/Type EXCLUDE/);
  assert.equal(store.revision(),0);
  const old=store.analytics().assessmentAnalysis(a1);
  store.setAssessmentInclusion(owner,a1,{included:false,reason:'Diagnostic',confirmed:true,phrase:'EXCLUDE'});
  assert.equal(store.analytics().studentSummary(eId).average,75);
  assert.deepEqual(store.analytics().assessmentAnalysis(a1).statistics,old.statistics);
  assert.equal(store.analytics().assessmentAnalysis(a1).included,false);
  store.setAssessmentInclusion(owner,a1,{included:true,reason:'Reviewed',confirmed:true});
  eq(store.analytics().studentSummary(eId).average,200/3);
});
test('local persistence round trips and rejects invalid state without silently overwriting',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const store=createStore({initialData:controlled(),clock,storage});
  store.saveResult(owner,a1,eId,{status:'present',marks:{total:40}});
  const reopened=createStore({initialData:controlled(),storage,clock});
  assert.equal(reopened.analytics().resultFor(a1,eId).percent,100);
  assert.equal(reopened.snapshot().audit.length,1);
  assert.throws(()=>reopened.reset(),/Confirm/);
  reopened.reset({confirmed:true});assert.equal(reopened.analytics().resultFor(a1,eId).percent,50);
  map.set(STORAGE_KEY,JSON.stringify({schemaVersion:999}));
  assert.throws(()=>createStore({storage}),/Invalid demo dataset/);
  const badStorage={getItem:()=>null,setItem:()=>{throw Error('quota exceeded');}};
  const bad=createStore({initialData:controlled(),storage:badStorage,clock});
  assert.throws(()=>bad.saveResult(owner,a1,eId,{status:'present',marks:{total:40}}),/quota/);
  assert.equal(bad.analytics().resultFor(a1,eId).percent,50);
});
test('intervention counts distinguish unique pupils from subject cases, and role views are scoped',()=>{
  const store=createStore({initialData:base(),clock}),sl=store.read('avery'),p=sl.student('P121');
  assert.equal(p.subjects.length,3);assert.equal(p.cases.length,2);
  const stats=sl.interventionSummary();assert.equal(stats.active,4);assert.equal(stats.students,3);
  assert.deepEqual(stats.overdue,['I001']);assert.equal(stats.closed,1);
  assert.equal(sl.home('school').cohort.students,210);
  assert.equal(sl.home('school').cohort.enrolments,630);
  assert.equal(sl.home('school').cohort.mean,undefined);
  assert.ok(sl.home('school').actions.some(x=>x.type==='respondLeadership'));
  const sam=store.read('sam');assert.equal(sam.home('faculty').cohort.students,210);
  assert.throws(()=>sam.classSummary('11-science-1'),/outside/);
  const morgan=store.read('morgan');
  assert.equal(morgan.home('house').cohort.students,70);
  assert.equal(morgan.cases().some(c=>c.id==='I001'),false);
});
