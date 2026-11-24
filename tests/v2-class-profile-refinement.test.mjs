import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../v2/store.mjs';
import {createWorkspace,matchText,sortRows} from '../v2/workspace.mjs';
import {DEFAULT_GROUPS,FULL_GROUPS,registerColumns,displayedRegisterColumns,registerLayout,registerFocusCounts,registerFocus,registerFocusFilter,visibleRegisterRows} from '../v2/class-overview.mjs';
import {visibleProfileSubjects,profilePeers} from '../v2/student-profile-views.mjs';
import {renderPage,renderDetail} from '../v2/views.mjs';
const make=()=>createStore({clock:()=> '2026-11-24T08:00:00.000Z'});
const state=(extra={})=>({page:'classes',classId:'11-maths-1',query:'',flag:'all',below:false,sorts:{},...extra});
const w=(s,id='sam',scope='faculty')=>createWorkspace(s,id,scope);
const keys=columns=>columns.map(c=>c[0]);
test('daily register compresses identity and attainment but full/custom retain all original fields',()=>{
 assert.equal(registerLayout(DEFAULT_GROUPS),'daily');assert.equal(registerLayout(FULL_GROUPS),'full');
 assert.equal(registerLayout(['detail']),'custom');
 const daily=keys(displayedRegisterColumns(DEFAULT_GROUPS)),full=keys(displayedRegisterColumns(FULL_GROUPS));
 assert.equal(daily.length,9);assert.ok(full.length>daily.length);
 for(const key of ['name','average','latestPercent','minimumGrade','predictedGrade','gapToTarget','nextGradePoints','wave','noteCount'])assert.ok(daily.includes(key));
 assert.deepEqual(displayedRegisterColumns(FULL_GROUPS),registerColumns(FULL_GROUPS));
 assert.deepEqual(displayedRegisterColumns(['detail']),registerColumns(['detail']));
 const s=make(),workspace=w(s),html=renderPage(workspace,state());
 assert.match(html,/data-register-layout="daily"/);assert.match(html,/register-pupil-meta/);assert.match(html,/Grade .* scored/);
 assert.match(html,/data-action="edit-prediction"/);assert.match(html,/data-action="open-pupil-history"/);
 assert.match(html,/data-action="open-markbook"/);assert.match(html,/Latest published assessment/);
 assert.match(renderPage(workspace,state({columnGroups:FULL_GROUPS})),/data-register-layout="full"/);
 assert.match(renderPage(workspace,state({classId:null})),/data-action="home-markbook"/);
});
test('focus filters count exactly scoped pupils and compose with filters and displayed sorting',()=>{
 const s=make();
 for(const staff of s.snapshot().staff){
  const workspace=createWorkspace(s,staff.id,'accessible');
  for(const cls of workspace.classRows()){
   const counts=registerFocusCounts(cls.roster);
   for(const id of ['all','below','unknown','soc']){
    const f=registerFocusFilter(id),st=state({...f,classId:cls.id});
    assert.equal(registerFocus(st),id);
    const rows=visibleRegisterRows(cls.roster,st,matchText,sortRows);
    assert.equal(rows.length,counts[id]);
    assert.ok(rows.every(r=>workspace.access.canViewEnrolment(r.enrolmentId)));
    const sorted=visibleRegisterRows(cls.roster,{...st,sorts:{roster:{key:'name',direction:'desc'}}},matchText,sortRows);
    assert.deepEqual(sorted.map(r=>r.id),sortRows(rows,'name','desc').map(r=>r.id));
    if(rows.length){const first=rows[0];const narrowed=visibleRegisterRows(cls.roster,{...st,tutorFilter:first.tutorGroupId},matchText,sortRows);assert.ok(narrowed.every(p=>p.tutorGroupId===first.tutorGroupId));}
   }
  }
 }
 assert.throws(()=>registerFocusFilter('not-a-filter'),/Unknown/);
});
test('direct assessment-history profiles and compact subject focus retain authorised records only',()=>{
 const s=make();
 for(const staff of s.snapshot().staff){
  const workspace=createWorkspace(s,staff.id,'accessible');
  const pupil=workspace.studentRows()[0];if(!pupil)continue;
  const p=workspace.studentProfile(pupil.id);
  for(const filter of ['all','below','unknown','support']){
   const expected=filter==='all'?p.subjects:filter==='below'?p.subjects.filter(s=>s.onTrack===false):filter==='unknown'?p.subjects.filter(s=>s.onTrack===null):p.subjects.filter(s=>s.activeCases.length>0);
   const rows=visibleProfileSubjects(p,filter);
   assert.deepEqual(rows.map(s=>s.enrolmentId).sort(),expected.map(s=>s.enrolmentId).sort());
   const html=renderDetail(workspace,{kind:'student',id:pupil.id,subjectFilter:filter});
   assert.match(html,new RegExp('id="profile-filter-'+filter+'"[^>]*aria-pressed="true"'));
   assert.ok(html.includes(rows.length+' of '+p.subjects.length+' visible subjects'));
   for(const row of rows){
    assert.ok(workspace.access.canViewEnrolment(row.enrolmentId));
    if(!row.targetEditable)assert.ok(!html.includes('data-action="edit-target" data-id="'+row.enrolmentId+'"'));
    if(!row.editable)assert.ok(!html.includes('data-action="edit-prediction" data-id="'+row.enrolmentId+'"'));
   }
  }
  const subject=p.subjects[0];if(subject){
   const html=renderDetail(workspace,{kind:'student',id:pupil.id,tab:'assessments',subjectId:subject.enrolmentId});
   assert.match(html,/Published assessment history/);assert.match(html,/Cumulative %/);
   assert.ok(html.includes('data-action="profile-open-analysis" data-id="'+subject.enrolmentId+'"'));
   assert.equal(html.includes('data-action="edit-prediction" data-id="'+subject.enrolmentId+'"'),subject.editable);
   assert.equal(html.includes('data-action="edit-target" data-id="'+subject.enrolmentId+'"'),subject.targetEditable);
  }
 }
});
test('filtered peer order is maintained and never introduces unauthorised students',()=>{
 const s=make(),workspace=w(s),r=workspace.classRecord('11-maths-1'),rows=visibleRegisterRows(r.roster,state({sorts:{roster:{key:'name',direction:'desc'}}}),matchText,sortRows);
 const ids=rows.map(p=>p.studentId);
 assert.ok(ids.length>1);
 const d={id:ids[0],peerIds:[...ids,'not-a-pupil'],peerLabel:r.code+' register'};
 assert.deepEqual(profilePeers(workspace,d).map(p=>p.id),ids);
 assert.ok(renderDetail(workspace,{...d,kind:'student'}).includes(r.code+' register'));
});
