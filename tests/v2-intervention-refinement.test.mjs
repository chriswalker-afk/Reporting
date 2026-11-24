import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {createAccess} from '../v2/access.mjs';
import {createDemoData} from '../v2/demo-data.mjs';
import {caseCounts,matchesCaseFilter,wavePresentation,casePriority,studyStatus} from '../v2/intervention-refinement.mjs';
import {renderPage,renderDetail} from '../v2/views.mjs';
const make=(options={})=>createStore({clock:()=> '2026-11-24T08:00:00.000Z',...options});
const state=(caseFilter='active')=>({page:'intervention',classId:null,query:'',flag:'all',below:false,caseFilter,caseClass:null,sorts:{}});
test('all persona and scope counts partition active waves and match existing personal action queue',()=>{
 const s=make(),data=s.snapshot();
 for(const staff of data.staff){
  const initial=createWorkspace(s,staff.id);
  for(const {id:scope} of initial.scopeOptions){
   const w=createWorkspace(s,staff.id,scope),cases=w.caseRows(),personal=w.allHome().actions,counts=caseCounts(cases,personal);
   assert.equal(counts.active,counts.w1+counts.w2+counts.w3);
   assert.equal(counts.all,counts.active+counts.closed);
   assert.equal(counts.actions,personal.length);
   assert.equal(counts.due,cases.filter(c=>c.due).length);
   for(const c of cases){
    assert.ok(w.access.canViewCase(c.id));
    for(const t of c.tasks){
     assert.equal(t.canAct,c.actions.includes(t.type));
     assert.equal(t.mine,c.pending.some(a=>a.type===t.type));
     assert.deepEqual(t.reviewers.map(p=>p.id).sort(),data.staff.filter(p=>createAccess(data,p.id).caseActions(c.id).includes(t.type)).map(p=>p.id).sort());
     if(t.assigned)assert.ok(t.reviewers.some(p=>p.id===t.assigned.id));
    }
    assert.ok(c.pending.every(a=>c.tasks.some(t=>t.type===a.type&&t.mine)));
    if(c.state==='closed')assert.equal(c.tasks.length,0);
   }
   for(const k of ['active','due','referrals','house','study','closed','w1','w2','w3','actions']){
    const html=renderPage(w,state(k));
    assert.ok(html.includes('data-id="'+k+'" aria-pressed="true"'));
    const rows=k==='actions'?personal.length:cases.filter(c=>matchesCaseFilter(c,k)).length;
    assert.equal(counts[k],rows);
   }
  }
 }
});
test('case responsibilities name actual distinct owners, requested stages and review dates',()=>{
 const s=make(),w=createWorkspace(s,'avery','school'),c=w.caseDetail('I003'),plan=c.studyPlan;
 assert.equal(wavePresentation(c,1),'recorded');assert.equal(wavePresentation(c,2),'active');assert.equal(wavePresentation(c,3),'not-reached');
 const house=c.tasks.find(t=>t.type==='respondHouse'),review=c.tasks.find(t=>t.type==='review'),study=c.tasks.find(t=>t.type==='reviewStudyPlan');
 assert.equal(house.assigned.id,c.houseOwnerStaffId);assert.equal(house.dateLabel,'Case review date');
 assert.equal(review.date,c.reviewDate);assert.equal(study.date,plan.reviewDate);assert.equal(study.assigned.id,plan.ownerStaffId);
 const referral=w.caseDetail('I004');assert.equal(wavePresentation(referral,3),'requested');
 assert.equal(referral.tasks.find(t=>t.type==='respondLeadership').assigned.id,referral.ownerStaffId);
 const closed=w.caseDetail('I005');assert.equal(closed.tasks.length,0);
 assert.equal(wavePresentation(closed,1),'recorded');
 const h=renderDetail(w,{kind:'case',id:c.id});
 assert.match(h,/Next responsibilities/);assert.match(h,/Individual study plan/);assert.match(h,/Review evidence/);
 assert.match(h,/Agreed actions/);assert.match(h,/Actions are agreed commitments/);
 assert.ok(h.includes(house.responsible));assert.ok(h.includes(plan.owner));
 assert.doesNotMatch(renderDetail(w,{kind:'case',id:closed.id}),/data-action="case-action"/);
});
test('House completion and achieved study plans remove only their own outstanding responsibility',()=>{
 const s=make();let w=createWorkspace(s,'avery','school'),c=w.caseDetail('I003');
 const house=c.tasks.find(t=>t.type==='respondHouse'),plan=c.studyPlan;
 s.interventionAction(house.assigned.id,c.id,'respondHouse',{response:'Demo: agreed and implemented routine.',complete:true});
 w=createWorkspace(s,'avery','school');c=w.caseDetail(c.id);
 assert.ok(!c.tasks.some(t=>t.type==='respondHouse'));assert.ok(c.tasks.some(t=>t.type==='review'));
 s.interventionAction(plan.ownerStaffId,c.id,'reviewStudyPlan',{evaluation:'Demo: agreed target achieved.',outcome:'achieved',confirmed:true});
 w=createWorkspace(s,'avery','school');c=w.caseDetail(c.id);
 assert.equal(c.studyStatus,'achieved');assert.ok(!c.tasks.some(t=>t.type==='reviewStudyPlan'));assert.ok(c.tasks.some(t=>t.type==='review'));
 assert.match(renderDetail(w,{kind:'case',id:c.id}),/Demo: agreed target achieved/);
 assert.match(renderDetail(w,{kind:'case',id:c.id}),/Target achieved/);
});
test('legacy handovers use eligible reviewers instead of incorrectly showing earlier case owner',()=>{
 const data=createDemoData(),c=data.interventions.find(c=>c.id==='I004');delete c.wave3Referral;
 c.ownerStaffId=data.classes.find(x=>x.id===data.enrolments.find(e=>e.id===c.enrolmentId).classId).teacherIds[0];
 const w=createWorkspace(make({initialData:data}),'avery','school'),record=w.caseDetail(c.id),task=record.tasks.find(t=>t.type==='respondLeadership');
 assert.equal(task.assigned,null);assert.ok(task.reviewers.some(p=>p.id==='avery'));assert.ok(task.mine);
 assert.match(renderDetail(w,{kind:'case',id:c.id}),/Eligible reviewers; no specific assignee recorded/);
});
