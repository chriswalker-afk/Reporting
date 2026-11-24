import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStore} from '../v2/store.mjs';
import {createWorkspace,defaultScope,scopeOptions,parseRoute,routeHash,sortRows,matchText,pct,HELP,NAV,FUTURE} from '../v2/workspace.mjs';
import {sidebar,topbar,renderPage,renderDetail,renderSearchResults,esc} from '../v2/views.mjs';

const state=(page='home',extra={})=>({page,classId:null,query:'',flag:'all',below:false,caseFilter:'active',caseClass:null,sorts:{},...extra});
const create=()=>createStore({clock:()=> '2026-11-24T07:00:00.000Z'});
test('default scope and scope options respect additive role assignments',()=>{
 const store=create(),sam=createWorkspace(store,'sam'),morgan=createWorkspace(store,'morgan'),avery=createWorkspace(store,'avery');
 assert.equal(sam.scope,'faculty');assert.equal(morgan.scope,'house');assert.equal(avery.scope,'school');
 assert.deepEqual(sam.scopeOptions.map(s=>s.id),['accessible','teaching','faculty','tutor']);
 assert.equal(createWorkspace(store,'jordan','school').scope,'teaching');
 assert.equal(sam.classRows().length,14);
 assert.equal(avery.classRows().length,42);
});
test('scope-constrained class slices contain only the selected tutees or House pupils',()=>{
 const store=create();
 for(const [staff,scope] of [['jordan','tutor'],['morgan','house']]){
  const w=createWorkspace(store,staff,scope),rows=w.classRows();
  assert.ok(rows.some(r=>r.partial));
  for(const r of rows){
   assert.equal(r.students,r.roster.length);
   assert.equal(r.scored,r.roster.filter(p=>p.average!==null).length);
   assert.ok(r.roster.every(p=>scope==='tutor'?w.access.isTutor(p.studentId):w.access.isHouse(p.studentId)));
   const scored=r.roster.filter(p=>p.average!==null);
   if(scored.length)assert.ok(Math.abs(r.mean-scored.reduce((sum,p)=>sum+p.average,0)/scored.length)<1e-9);
  }
  assert.equal(rows.reduce((s,r)=>s+r.students,0),w.home().cohort.enrolments);
 }
});
test('global search uses accessible responsibilities, not every pupil or all classes',()=>{
 const store=create(),w=createWorkspace(store,'jordan','teaching'),data=store.snapshot();
 const inaccessible=data.students.find(p=>!w.access.canViewStudent(p.id));
 assert.ok(inaccessible);
 assert.equal(w.search(inaccessible.name).some(r=>r.kind==='student'&&r.id===inaccessible.id),false);
 const tutee=data.students.find(p=>w.access.isTutor(p.id));
 assert.ok(w.search(tutee.name).some(r=>r.kind==='student'&&r.id===tutee.id));
 const outside=data.classes.find(c=>!w.accessibleClassIds.has(c.id));
 assert.ok(outside);
 assert.equal(w.search(outside.id).some(r=>r.kind==='class'&&r.id===outside.id),false);
 assert.throws(()=>w.studentDetail(inaccessible.id),/outside/);
 const inaccessibleCase=data.interventions.find(c=>!w.access.canViewCase(c.id));
 assert.ok(inaccessibleCase);
 assert.throws(()=>w.caseDetail(inaccessibleCase.id),/outside/);
 assert.ok(w.search('demo staff notice').some(r=>r.kind==='notice'));
});
test('class, student and home views use the same current marks and coverage',()=>{
 const store=create(),id='11-maths-1',e='P121@11-maths',a='11-maths-A1';
 store.saveResult('sam',a,e,{status:'present',marks:{total:0}});
 const w=createWorkspace(store,'sam','faculty'),r=w.classRecord(id),student=w.studentDetail('P121');
 const p=r.roster.find(p=>p.enrolmentId===e),s=student.subjects.find(s=>s.enrolmentId===e);
 assert.equal(p.average,s.average);assert.equal(r.mean,store.analytics().classSummary(id).mean);
 const html=renderPage(w,state('classes',{classId:id}));
 assert.ok(html.includes(pct(r.mean)));
 assert.ok(html.includes(pct(s.average)));
 assert.ok(renderDetail(w,{kind:'student',id:'P121'}).includes(pct(p.average)));
 const h=w.home();assert.equal(h.cohort.interventions.active,w.caseRows().filter(c=>c.state!=='closed').length);
 assert.equal(w.classRows().reduce((s,c)=>s+c.below,0),h.cohort.belowTarget.length);
 assert.ok(renderPage(w,state()).includes('View affected classes'));
});
test('prediction edit is permission-aware and refreshes the workspace from the store',()=>{
 const store=create(),e='P121@11-maths';
 let w=createWorkspace(store,'sam','faculty');
 assert.match(renderDetail(w,{kind:'prediction',id:e}),/id="prediction-form"/);
 store.setPrediction('sam',e,'9');
 w=createWorkspace(store,'sam','faculty');
 assert.equal(w.studentDetail('P121').subjects.find(s=>s.enrolmentId===e).predictedGrade,'9');
 assert.equal(w.classRecord('11-maths-1').roster.find(p=>p.enrolmentId===e).predictedGrade,'9');
 assert.throws(()=>renderDetail(createWorkspace(store,'avery'),{kind:'prediction',id:e}),/assigned teacher/);
 assert.throws(()=>store.setPrediction('avery',e,'8'),/assigned teacher/);
});
test('every priority destination renders for every staff profile, without fictional placeholder charts',()=>{
 const store=create();
 for(const staff of store.snapshot().staff){
  const w=createWorkspace(store,staff.id);
  for(const [page,label] of NAV){
   const html=renderPage(w,state(page));
   assert.ok(html.includes('<h1>'),staff.id+' '+page);
   assert.ok(html.includes('workspace-inner'));
   assert.doesNotMatch(html,/undefined|NaN%/);
   if(page!=='home')assert.ok(html.includes(label));
  }
  assert.equal((sidebar('home',w).match(/class="nav-link"/g)||[]).length,5);
  assert.equal((sidebar('home',w).match(/aria-disabled="true"/g)||[]).length,FUTURE.length);
  assert.match(topbar(w),/Workspace scope/);
 }
});
test('class register filters, flags, active cases and scoped summaries use actual rows',()=>{
 const w=createWorkspace(create(),'sam','faculty'),c=w.classRecord('11-maths-1');
 const eal=c.roster.filter(p=>p.tags.includes('EAL'));
 let html=renderPage(w,state('classes',{classId:c.id,flag:'EAL'}));
 for(const p of eal)assert.ok(html.includes(p.name));
 for(const p of c.roster.filter(p=>!p.tags.includes('EAL')))assert.ok(!html.includes('>'+p.name+'</button>'));
 html=renderPage(w,state('classes',{classId:c.id,below:true}));
 for(const p of c.roster.filter(p=>p.gapToTarget!==null&&p.gapToTarget<0))assert.ok(html.includes(p.name));
 for(const p of c.roster.filter(p=>p.gapToTarget===null||p.gapToTarget>=0))assert.ok(!html.includes('>'+p.name+'</button>'));
 assert.match(html,/data-help="average"/);
 assert.match(html,/id="quick-class"/);
});
test('notice and intervention drilldowns are scoped and show real records',()=>{
 const store=create(),w=createWorkspace(store,'avery');
 const cases=w.caseRows();assert.equal(cases.length,5);
 assert.ok(renderDetail(w,{kind:'case',id:'I001'}).includes('Fictional intervention opened.'));
 assert.ok(renderDetail(w,{kind:'notice',id:'NO1'}).includes('Review upcoming assessment deadlines.'));
 assert.match(renderPage(w,state('intervention',{caseFilter:'closed'})),/Closed/);
 const jordan=createWorkspace(store,'jordan');
 assert.throws(()=>jordan.noticeDetail('does-not-exist'),/outside/);
 assert.match(renderSearchResults(w,'Demo Student 121'),/data-id="student:P121"/);
});
test('route parsing, sorting, matching, escaping and tooltip definitions are predictable',()=>{
 assert.deepEqual(parseRoute('#classes/11-maths-1'),{page:'classes',classId:'11-maths-1'});
 assert.equal(routeHash('classes','a b'),'#classes/a%20b');
 assert.equal(parseRoute('#safeguarding').page,'home');
 assert.equal(parseRoute('#classes/%ZZ').classId,null);
 const rows=[{id:'a',n:null},{id:'b',n:0},{id:'c',n:42}];
 assert.deepEqual(sortRows(rows,'n').map(r=>r.id),['b','c','a']);
 assert.deepEqual(sortRows(rows,'n','desc').map(r=>r.id),['c','b','a']);
 assert.equal(matchText('math 11','Year 11','Mathematics'),true);
 assert.equal(pct(0),'0.0%');assert.equal(pct(null),'—');
 assert.equal(esc('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
 assert.match(HELP.average,/zero is valid/);
});
test('default root loads V2, archive still loads legacy, and dialogs have accessible names',()=>{
 const root=readFileSync(new URL('../index.html',import.meta.url),'utf8'),
   v2=readFileSync(new URL('../v2/index.html',import.meta.url),'utf8'),
   legacy=readFileSync(new URL('../legacy.html',import.meta.url),'utf8');
 assert.match(root,/src="\.\/v2\/hub\.mjs"/);
 assert.match(root,/href="\.\/v2\/hub\.css"/);
 assert.match(v2,/src="\.\/hub\.mjs"/);
 assert.match(legacy,/src="\.\/app\.js"/);
 for(const html of [root,v2]){
  assert.match(html,/id="search-dialog"[^>]*aria-labelledby="search-title"/);
  assert.match(html,/id="detail-dialog"[^>]*aria-labelledby="detail-title"/);
  assert.match(html,/id="tooltip"[^>]*role="tooltip"/);
  assert.match(html,/data-action="reset-demo"/);
  assert.match(html,/Fictional data only/);
 }
});
