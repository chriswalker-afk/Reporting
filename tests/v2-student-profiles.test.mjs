import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../v2/store.mjs';
import {createDemoData} from '../v2/demo-data.mjs';
import {createWorkspace,pct,matchText,sortRows} from '../v2/workspace.mjs';
import {filterStudents,profileCounts,PROFILE_TABS} from '../v2/student-profiles.mjs';
import {profilePeers} from '../v2/student-profile-views.mjs';
import {renderPage,renderDetail} from '../v2/views.mjs';

const make=(options={})=>createStore({clock:()=> '2026-11-24T08:00:00.000Z',...options});
const w=(s,id='sam',scope='faculty')=>createWorkspace(s,id,scope);
const state=(extra={})=>({page:'students',classId:null,query:'',flag:'all',below:false,sorts:{},...extra});
const profile=(id='P121',extra={})=>({kind:'student',id,...extra});
const e='P121@11-maths',a3='11-maths-A3',diagnostic='11-maths-A4',draft='11-maths-A5';
const resultId=(p,e,a)=>JSON.stringify([p,e,a]);

test('directory counts derive from scoped enrolments and visible academic interventions for every persona',()=>{
 const s=make();
 for(const staff of s.snapshot().staff){
  const initial=createWorkspace(s,staff.id);
  for(const scope of initial.scopeOptions.map(x=>x.id)){
   const workspace=createWorkspace(s,staff.id,scope),rows=workspace.studentRows(),cohort=workspace.home().cohort;
   assert.equal(rows.length,cohort.students);
   assert.equal(rows.reduce((n,p)=>n+p.subjects,0),cohort.enrolments);
   assert.equal(rows.reduce((n,p)=>n+p.below,0),cohort.belowTarget.length);
   assert.equal(rows.reduce((n,p)=>n+p.unknown,0),cohort.unknownTargetStatus);
   assert.equal(rows.reduce((n,p)=>n+p.cases,0),cohort.interventions.active);
   assert.equal(rows.reduce((n,p)=>n+p.due,0),cohort.interventions.reviewsDue.length);
   assert.ok(rows.every(p=>workspace.scopeStudentIds.has(p.id)&&p.flags.includes('SOC')===(p.cases>0)));
   const c=profileCounts(rows);
   assert.equal(c.soc,cohort.interventions.students);
   assert.equal(c.below,rows.filter(r=>r.below>0).length);
  }
 }
});
test('directory filters compose by cohort, flags, targets and due status; peers preserve filtered order',()=>{
 const s=make(),workspace=w(s,'avery','school'),rows=workspace.studentRows(),p=rows.find(r=>r.cases>0);
 assert.ok(p);
 const f=filterStudents(rows,{studentYear:String(p.year),tutorFilter:p.tutorGroupId,houseFilter:p.house,flag:'SOC',studentSupport:'active'},matchText);
 assert.ok(f.some(r=>r.id===p.id));
 assert.ok(f.every(r=>r.year===p.year&&r.house===p.house&&r.tutorGroupId===p.tutorGroupId&&r.cases>0));
 const below=filterStudents(rows,{studentAttainment:'below'},matchText);
 assert.deepEqual(below.map(r=>r.id),rows.filter(r=>r.below>0).map(r=>r.id));
 const due=filterStudents(rows,{studentSupport:'due'},matchText);
 assert.deepEqual(due.map(r=>r.id),rows.filter(r=>r.due>0).map(r=>r.id));
 const on=filterStudents(rows,{studentAttainment:'on'},matchText);
 assert.ok(on.every(r=>r.subjects>0&&r.onTrack===r.subjects));
 const html=renderPage(workspace,state({flag:'SOC'}));
 for(const id of ['student-year','tutor-filter','house-filter','student-attainment','student-support'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-action="open-student-support"/);
 const peers=sortRows(f,'name','desc').map(r=>r.id);
 assert.deepEqual(profilePeers(workspace,profile(peers[0],{peerIds:[...peers,'not-a-pupil']})).map(r=>r.id),peers);
});
test('profiles reflect combined access, while tutor/House and faculty directory scopes remain distinct',()=>{
 const s=make(),data=s.snapshot();
 for(const staff of data.staff){
  const workspace=createWorkspace(s,staff.id);
  const p=data.students.find(p=>workspace.access.canViewStudent(p.id));
  const d=workspace.studentProfile(p.id);
  const expected=data.enrolments.filter(e=>e.studentId===p.id&&workspace.access.canViewEnrolment(e.id)).map(e=>e.id).sort();
  assert.deepEqual(d.subjects.map(e=>e.enrolmentId).sort(),expected);
  assert.equal(d.counts.subjects,expected.length);
  assert.equal(d.counts.below,d.subjects.filter(s=>s.onTrack===false).length);
  assert.ok(d.cases.every(c=>workspace.access.canViewCase(c.id)));
  assert.ok(d.notes.every(n=>workspace.access.canViewNote(n.id)));
  assert.ok(d.subjects.every(s=>s.editable===workspace.access.canEditPrediction(s.enrolmentId)&&s.targetEditable===workspace.access.canEditMinimumTarget(s.enrolmentId)&&s.canComment===workspace.access.canAddSubjectNote(s.enrolmentId)));
  assert.deepEqual(d.student.tutors.map(x=>x.id),data.tutorGroups.find(g=>g.id===p.tutorGroupId).tutorIds);
  assert.deepEqual(d.student.houseHeads.map(x=>x.id),data.houses.find(h=>h.id===p.houseId).headIds);
 }
 const tutor=createWorkspace(s,'jordan','tutor'),tutee=tutor.studentRows()[0];
 assert.equal(tutor.studentProfile(tutee.id).subjects.length,3);
 const house=createWorkspace(s,'morgan','house'),member=house.studentRows()[0];
 assert.equal(house.studentProfile(member.id).subjects.length,3);
 const school=w(s,'avery','school');assert.equal(school.studentRows().length,data.students.length);
 const restricted=createWorkspace(s,'jordan','teaching'),denied=data.students.find(p=>!restricted.access.canViewStudent(p.id));
 assert.ok(denied);
 assert.throws(()=>restricted.studentProfile(denied.id),/outside/);
 assert.throws(()=>renderDetail(restricted,profile(denied.id)),/outside/);
});
test('all four profile tabs render live subject counts, contacts, evidence and support history',()=>{
 const s=make(),workspace=w(s,'avery','school'),p=workspace.studentProfile('P121');
 const html=renderDetail(workspace,profile());
 for(const [id,label] of PROFILE_TABS){
  assert.ok(html.includes('data-id="'+id+'"'));assert.ok(html.includes(label));
  const tab=renderDetail(workspace,profile('P121',{tab:id,subjectId:e}));
  assert.doesNotMatch(tab,/undefined|NaN%/);
 }
 assert.match(html,/Cross-subject attainment/);assert.match(html,/Head of House/);
 assert.ok(html.includes(pct(p.subjects.find(x=>x.enrolmentId===e).average)));
 assert.match(html,/Subjects requiring attention/);
 const assessments=renderDetail(workspace,profile('P121',{tab:'assessments',subjectId:e}));
 assert.match(assessments,/Published assessment history/);assert.match(assessments,/Attainment over time/);
 assert.match(assessments,/Diagnostic \/ excluded/);assert.match(assessments,/data-action="profile-result"/);
 assert.doesNotMatch(assessments,/Next assessment/);
 const support=renderDetail(workspace,profile('P121',{tab:'support'}));
 assert.match(support,/Active interventions/);assert.match(support,/Historic interventions/);
 assert.match(support,/data-action="open-case"/);
 assert.doesNotMatch(html,/data-action="edit-prediction"|data-action="edit-target"/);
});
test('individual history uses published marks, distinguishes diagnostic and excluded evidence, and rejects forged selections',()=>{
 const s=make(),workspace=w(s,'avery','school'),d=workspace.profileSubject('P121',e);
 const r=s.analytics().studentSummary(e);
 assert.equal(d.summary.average,r.average);
 assert.deepEqual(d.summary.trend,r.trend);
 assert.ok(d.history.some(x=>x.assessmentId===diagnostic&&!x.summaryIncluded));
 assert.ok(!d.history.some(x=>x.assessmentId===draft));
 const rec=workspace.profileResult('P121',e,a3);
 assert.equal(rec.record.rawMark,s.analytics().resultFor(a3,e).rawMark);
 assert.equal(rec.items.length,3);
 assert.deepEqual(rec.items.map(i=>i.mark),rec.items.map(i=>rec.record.marks[i.id]??null));
 const html=renderDetail(workspace,{kind:'profile-result',id:resultId('P121',e,a3)});
 assert.match(html,/Recorded item marks/);assert.match(html,/Assessment grade boundaries/);
 assert.throws(()=>workspace.profileResult('P121','P122@11-maths',a3),/outside/);
 assert.throws(()=>workspace.profileResult('P121',e,draft),/outside/);
 assert.throws(()=>workspace.profileResult('P121',e,'12-maths-A3'),/outside/);
 const teacher=createWorkspace(s,'jordan','teaching'),p=s.snapshot().students.find(p=>teacher.access.canViewStudent(p.id)&&s.snapshot().enrolments.some(e=>e.studentId===p.id&&!teacher.access.canViewEnrolment(e.id)));
 assert.ok(p);
 const denied=s.snapshot().enrolments.find(e=>e.studentId===p.id&&!teacher.access.canViewEnrolment(e.id));
 assert.throws(()=>teacher.profileSubject(p.id,denied.id),/outside/);
});
test('mark, target and prediction edits update profile and directory using the same snapshot',()=>{
 const s=make();
 s.saveResultBatch('sam',a3,[{enrolmentId:e,status:'present',marks:{q1:6,q2:10,q3:14}}],{confirmed:true});
 s.setMinimumTarget('sam',e,'9');s.setPrediction('sam',e,'8');
 let workspace=w(s),p=workspace.studentProfile('P121'),d=workspace.profileSubject('P121',e),subject=p.subjects.find(s=>s.enrolmentId===e);
 assert.equal(subject.minimumGrade,'9');assert.equal(subject.predictedGrade,'8');
 assert.equal(subject.average,s.analytics().studentSummary(e).average);
 assert.equal(d.history.find(r=>r.assessmentId===a3).percent,100);
 assert.equal(d.cumulative.at(-1).result,100);
 const row=workspace.studentRows().find(p=>p.id==='P121'),scoped=workspace.classRecord('11-maths-1').roster.find(p=>p.enrolmentId===e);
 assert.equal(row.below,Number(scoped.onTrack===false));
 s.setStudentExclusion('sam',a3,e,{excluded:true,confirmed:true,reason:'Fictional exclusion'});
 workspace=w(s);d=workspace.profileSubject('P121',e);
 assert.ok(!d.cumulative.some(x=>x.assessmentId===a3));
 const excluded=d.history.find(x=>x.assessmentId===a3);
 assert.equal(excluded.status,'excluded');assert.equal(excluded.percent,null);assert.equal(excluded.recordedPercent,100);
 assert.match(renderDetail(workspace,{kind:'profile-result',id:resultId('P121',e,a3)}),/Fictional exclusion/);
 assert.match(renderDetail(workspace,profile('P121',{tab:'assessments',subjectId:e})),/Retained, excluded/);
});
test('subject comment controls respect authorship, edits update profile and notes stay subject-specific',()=>{
 const s=make();s.saveSubjectNote('sam',e,null,'Demo profile academic observation');
 const n=s.snapshot().notes.find(n=>n.text==='Demo profile academic observation');
 let workspace=w(s),p=workspace.studentProfile('P121');
 assert.ok(p.notes.some(x=>x.id===n.id&&x.editable));
 assert.ok(p.subjects.find(x=>x.enrolmentId===e).noteCount>=1);
 let html=renderDetail(workspace,profile('P121',{tab:'comments',commentSubject:e}));
 assert.match(html,/Demo profile academic observation/);assert.match(html,/Add Mathematics comment/);assert.match(html,/Edit my comment/);
 html=renderDetail(w(s,'avery','school'),profile('P121',{tab:'comments'}));
 assert.match(html,/Demo profile academic observation/);assert.doesNotMatch(html,/Edit my comment|Add Mathematics comment/);
 s.saveSubjectNote('sam',e,n.id,'Demo revised observation');
 workspace=w(s);assert.ok(workspace.studentProfile('P121').notes.some(x=>x.id===n.id&&x.text==='Demo revised observation'));
});
test('pastoral academic notes cannot leak through ordinary subject access',()=>{
 const data=createDemoData(),s=make({initialData:data}),teacher=createWorkspace(s,'jordan','teaching');
 const enrolment=data.enrolments.find(e=>teacher.access.teaches(e.classId)&&!teacher.access.isTutor(e.studentId)&&!teacher.access.isHouse(e.studentId));
 assert.ok(enrolment);
 data.notes.push({id:'N-pastoral-test',enrolmentId:enrolment.id,authorStaffId:'avery',date:'2026-11-23',visibility:'pastoral',text:'Demo pastoral academic observation'});
 const updated=make({initialData:data}),tw=createWorkspace(updated,'jordan','teaching'),sl=w(updated,'avery','school');
 assert.equal(tw.access.canViewNote('N-pastoral-test'),false);
 assert.ok(!tw.studentProfile(enrolment.studentId).notes.some(n=>n.id==='N-pastoral-test'));
 assert.ok(sl.studentProfile(enrolment.studentId).notes.some(n=>n.id==='N-pastoral-test'));
 assert.doesNotMatch(renderDetail(tw,profile(enrolment.studentId,{tab:'comments'})),/Demo pastoral academic observation/);
 assert.match(renderDetail(sl,profile(enrolment.studentId,{tab:'comments'})),/Demo pastoral academic observation/);
});
