import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../v2/store.mjs';
import {createWorkspace,matchText} from '../v2/workspace.mjs';
import {homeDashboard,groupPupils,groupFilter,HOME_PREVIEW} from '../v2/home-dashboard.mjs';
import {filterStudents} from '../v2/student-profiles.mjs';
import {renderPage} from '../v2/views.mjs';
const make=()=>createStore({clock:()=> '2026-11-24T08:00:00.000Z'});
const state={page:'home',classId:null,query:'',flag:'all',below:false,sorts:{}};
const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
test('all persona/scope dashboards use the existing cohort, directory, cases and personal action counts',()=>{
 const s=make();
 for(const staff of s.snapshot().staff){
  const initial=createWorkspace(s,staff.id);
  for(const {id:scope} of initial.scopeOptions){
   const w=createWorkspace(s,staff.id,scope),d=homeDashboard(w),rows=w.studentRows(),cohort=w.home().cohort;
   assert.equal(d.counts.pupils,cohort.students);
   assert.equal(d.counts.enrolments,cohort.enrolments);
   assert.equal(d.counts.belowSubjects,cohort.belowTarget.length);
   assert.equal(d.counts.below,rows.filter(r=>r.below>0).length);
   assert.equal(d.counts.unknown,rows.filter(r=>r.unknown>0).length);
   assert.equal(d.counts.activeCases,cohort.interventions.active);
   assert.equal(d.counts.casePupils,cohort.interventions.students);
   assert.equal(d.queue.length,w.allHome().actions.length+w.communications().pendingAcknowledgements.length);
   assert.equal(d.shown.length,Math.min(HOME_PREVIEW,d.queue.length));
   assert.ok(d.shown.every((q,i)=>q===d.queue[i]));
   assert.ok(d.queue.every((q,i)=>i===0||q.rank>=d.queue[i-1].rank));
   assert.equal(d.overdue,w.allHome().actions.filter(a=>a.reviewDate<w.asOf).length);
   const html=renderPage(w,state);
   assert.match(html,new RegExp('data-home-scope="'+scope+'"'));
   assert.ok(html.includes(d.context.label));
   assert.ok(html.indexOf('id="attention-panel"')<html.indexOf('class="home-cohort"'));
   assert.ok(html.includes('Requires your attention'));
   assert.ok(html.includes('Respect · Inspire · Challenge'));
   assert.doesNotMatch(html,/>undefined<|>NaN</);
   if(d.kind==='classes'){
    assert.equal(d.classes.length,w.scopedClassIds.size);
    assert.ok(d.classes.every(c=>w.scopedClassIds.has(c.id)));
    assert.match(html,/Subjects below MTG/);
    assert.match(html,/data-action="home-markbook"/);
   }else{
    assert.match(html,/Pupils below MTG/);
    assert.doesNotMatch(html,/data-action="home-markbook"/);
   }
   if(d.kind==='pupils'){
    assert.ok(d.priorityPupils.every(p=>w.access.isTutor(p.id)));
    assert.match(html,/Tutees to review/);
   }
   if(d.kind==='groups'){
    assert.equal(sum(d.groups,'pupils'),rows.length);
    assert.equal(sum(d.groups,'below'),d.counts.below);
    assert.equal(sum(d.groups,'unknown'),d.counts.unknown);
    assert.equal(sum(d.groups,'cases'),d.counts.casePupils);
    for(const g of d.groups){
     assert.equal(filterStudents(rows,groupFilter(g.key,g.value),matchText).length,g.pupils);
     assert.equal(filterStudents(rows,groupFilter(g.key,g.value,true),matchText).length,g.below);
    }
   }
  }
 }
});
test('role contexts and primary summaries are distinct, including combined roles',()=>{
 const s=make(),roles=[['sam','faculty','Faculty dashboard','Faculty class overview'],['sam','teaching','Teaching dashboard','My classes'],['jordan','tutor','Tutor dashboard','Tutees to review'],['morgan','house','House dashboard','House academic overview'],['avery','school','Leadership dashboard','Year-group overview'],['sam','accessible','Combined dashboard','Year-group overview']];
 for(const [id,scope,label,panel] of roles){
  const w=createWorkspace(s,id,scope),d=homeDashboard(w),html=renderPage(w,state);
  assert.equal(d.context.label,label);assert.equal(d.context.panel,panel);
  assert.ok(html.includes(label)&&html.includes(panel));
 }
 const school=homeDashboard(createWorkspace(s,'avery','school'));
 assert.equal(school.groups.length,7);assert.ok(school.groups.every(g=>g.pupils===30));
 assert.throws(()=>groupFilter('arbitrary','value'),/Unknown/);
});
test('group summaries use unique pupils, separate unknown attainment and no mixed-course percentage',()=>{
 const groups=groupPupils([
  {id:'a',year:11,house:'Argus',houseId:'cedar',below:2,unknown:1,cases:2,due:1},
  {id:'b',year:11,house:'Argus',houseId:'cedar',below:0,unknown:3,cases:0,due:0},
  {id:'c',year:12,house:'Barbet',houseId:'willow',below:1,unknown:0,cases:1,due:0}
 ],'year');
 assert.deepEqual(groups.map(g=>[g.value,g.pupils,g.below,g.unknown,g.cases,g.due]),[['11',2,1,2,1,1],['12',1,1,0,1,0]]);
 assert.ok(groups.every(g=>!Object.hasOwn(g,'average')));
});
test('personal queue does not change with selected academic cohort; acknowledgement disappears after save',()=>{
 const s=make(),a=createWorkspace(s,'sam','faculty'),b=createWorkspace(s,'sam','tutor');
 const x=homeDashboard(a),y=homeDashboard(b);
 assert.deepEqual(x.queue.map(q=>q.id),y.queue.map(q=>q.id));
 assert.ok(x.queue.some(q=>q.kind==='notice'&&q.id==='NO1'));
 assert.ok(!x.notices.some(n=>x.shown.some(q=>q.kind==='notice'&&q.id===n.id)));
 s.acknowledgeNotice('sam','NO1');
 const updated=homeDashboard(createWorkspace(s,'sam','faculty'));
 assert.equal(updated.queue.length,x.queue.length-1);
 assert.ok(!updated.queue.some(q=>q.kind==='notice'&&q.id==='NO1'));
 assert.ok(updated.notices.some(n=>n.id==='NO1'));
});
test('assessment and intervention writes immediately refresh dashboard projections',()=>{
 const s=make(),e='P121@11-maths',before=homeDashboard(createWorkspace(s,'sam','faculty'));
 s.saveResultBatch('sam','11-maths-A3',[{enrolmentId:e,status:'present',marks:{q1:6,q2:10,q3:14}}],{confirmed:true});
 s.setMinimumTarget('sam',e,'9');
 const w=createWorkspace(s,'sam','faculty'),d=homeDashboard(w);
 assert.equal(d.counts.belowSubjects,w.home().cohort.belowTarget.length);
 assert.equal(d.classes.find(c=>c.id==='11-maths-1').below,w.classRecord('11-maths-1').below);
 const option=w.caseStartOptions().find(o=>o.scoped);
 assert.ok(option);
 s.startIntervention('sam',option.id,{reason:'Demo review evidence',strategies:['Targeted practice'],plan:'Provide practice and check progress',reviewDate:'2026-12-01'});
 const updated=homeDashboard(createWorkspace(s,'sam','faculty'));
 assert.equal(updated.counts.activeCases,before.counts.activeCases+1);
});
