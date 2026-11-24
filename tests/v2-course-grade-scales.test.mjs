import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoData} from '../v2/demo-data.mjs';
import {GRADE_LABELS,demoGradeSchemes} from '../v2/grade-scales.mjs';
import {validateData,SCHEMA_VERSION} from '../v2/model.mjs';
import {createStore,STORAGE_KEY,LEGACY_GRADE_STORAGE_KEY} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderDetail} from '../v2/views.mjs';
import {gradeFor,gradeDistance} from '../v2/analytics.mjs';

test('all fictional courses, targets, and assessments use the configured course scale',()=>{
 const d=createDemoData(),s=createStore({initialData:d}),engine=s.analytics();
 const schemes=new Map(d.gradeSchemes.map(g=>[g.id,g]));
 const courses=new Map(d.courses.map(c=>[c.id,c]));
 const classes=new Map(d.classes.map(c=>[c.id,c]));
 const es=new Map(d.enrolments.map(e=>[e.id,e]));
 const labels=id=>schemes.get(id).bands.map(b=>b.grade);
 assert.deepEqual(labels('ks3'),GRADE_LABELS.numeric);
 assert.deepEqual(labels('igcse'),GRADE_LABELS.numeric);
 assert.deepEqual(labels('igcse-letter'),GRADE_LABELS.igcseLetter);
 assert.deepEqual(labels('alevel'),GRADE_LABELS.alevel);
 for(const a of d.assessments)assert.deepEqual(labels(a.gradeSchemeId),labels(courses.get(a.courseId).gradeSchemeId));
 for(const t of d.targets){
  const c=courses.get(classes.get(es.get(t.enrolmentId).classId).courseId),order=labels(c.gradeSchemeId);
  assert.ok(order.includes(t.minimumGrade));assert.ok(t.predictedGrade===null||order.includes(t.predictedGrade));
  const row=engine.studentSummary(t.enrolmentId);
  assert.ok(row.grade===null||order.includes(row.grade));
 }
 assert.equal(gradeFor(100,schemes.get('igcse-letter')),'A*');
 assert.equal(gradeFor(0,schemes.get('igcse-letter')),'U');
 assert.equal(gradeDistance('F','C',schemes.get('igcse-letter')),-3);
 const broken=createDemoData();broken.gradeSchemes.find(g=>g.id==='ks3').bands[1].grade='Emerging';
 assert.ok(validateData(broken).some(x=>x.includes('course must use')));
});

test('course-specific target/prediction editors and markbook boundaries reject wrong scale',()=>{
 const s=createStore(),d=s.snapshot();
 for(const [staffId,courseId,order,good,bad] of [
  ['sam','11-maths',GRADE_LABELS.numeric,'9','A*'],
  ['alex','11-science',GRADE_LABELS.igcseLetter,'G','9'],
  ['sam','12-maths',GRADE_LABELS.alevel,'A*','G']
 ]){
  const c=d.classes.find(c=>c.courseId===courseId&&c.teacherIds.includes(staffId)),enrolment=d.enrolments.find(e=>e.classId===c.id);
  const w=createWorkspace(s,staffId,'faculty');
  assert.deepEqual(w.classRecord(c.id).roster.find(r=>r.enrolmentId===enrolment.id).grades,order);
  assert.deepEqual(w.markbook(c.id).defaultBands.map(b=>b.grade),order);
  for(const kind of ['prediction','target']){
   const html=renderDetail(w,{kind,id:enrolment.id});
   const body=typeof html==='string'?html:html.body;
   for(const grade of order)assert.ok(body.includes('value="'+grade+'"'),kind+' missing '+grade);
   assert.ok(!body.includes('value="'+bad+'"'));
  }
  assert.throws(()=>s.setPrediction(staffId,enrolment.id,bad),/outside course grade scale/);
  assert.throws(()=>s.setMinimumTarget(staffId,enrolment.id,bad),/outside course grade scale/);
  s.setPrediction(staffId,enrolment.id,good);s.setMinimumTarget(staffId,enrolment.id,good);
  assert.equal(s.analytics().studentSummary(enrolment.id).predictedGrade,good);
  assert.equal(s.analytics().studentSummary(enrolment.id).minimumGrade,good);
 }
});

test('legacy synthetic demo grade upgrade preserves raw marks and original saved snapshot',()=>{
 const old=createDemoData();old.schemaVersion=1;
 const oldScheme=(id,name,labels,mins)=>({id,name,bands:labels.map((grade,i)=>({grade,min:mins[i]})),illustrative:true});
 old.gradeSchemes=demoGradeSchemes().filter(g=>!['ks3','igcse-letter'].includes(g.id));
 old.gradeSchemes.push(oldScheme('ks3','KS3 illustrative attainment',['Emerging','Developing','Secure','Extending'],[0,40,60,80]),oldScheme('ib','IB illustrative 7–1',['1','2','3','4','5','6','7'],[0,20,35,50,65,78,90]));
 const changed=new Map();
 for(const c of old.courses){
  if(c.year<=9){changed.set(c.id,'Secure');}
  else if(c.year<=11&&c.subjectId==='science'){c.gradeSchemeId='igcse';changed.set(c.id,'7');}
  else if(c.year>=12&&c.subjectId==='science'){c.gradeSchemeId='ib';c.name='IB Science';changed.set(c.id,'5');}
 }
 for(const a of old.assessments)a.gradeSchemeId=old.courses.find(c=>c.id===a.courseId).gradeSchemeId;
 for(const t of old.targets){
  const e=old.enrolments.find(e=>e.id===t.enrolmentId),c=old.classes.find(c=>c.id===e.classId);
  if(changed.has(c.courseId)){t.minimumGrade=changed.get(c.courseId);t.predictedGrade=null;}
 }
 const json=JSON.stringify(old),map=new Map([[LEGACY_GRADE_STORAGE_KEY,json]]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const s=createStore({storage}),next=s.snapshot();
 assert.equal(next.schemaVersion,SCHEMA_VERSION);
 assert.deepEqual(next.results,old.results);assert.deepEqual(next.interventions,old.interventions);
 assert.deepEqual(next.notices,old.notices);assert.deepEqual(validateData(next),[]);
 assert.equal(next.courses.find(c=>c.id==='12-science').name,'A level Science');
 assert.equal(map.get(LEGACY_GRADE_STORAGE_KEY),json);
 assert.equal(map.has(STORAGE_KEY),false);
 s.setPrediction('sam','P121@11-maths','9');
 assert.equal(createStore({storage}).analytics().studentSummary('P121@11-maths').predictedGrade,'9');
 assert.equal(map.get(LEGACY_GRADE_STORAGE_KEY),json);
});
