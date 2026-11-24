import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStore,STORAGE_KEY} from '../v2/store.mjs';
import {createWorkspace,HELP,parseRoute,routeHash,CLASS_TABS} from '../v2/workspace.mjs';
import {renderPage,renderDetail,sidebar,topbar,renderSearchResults} from '../v2/views.mjs';
import {bookId} from '../v2/markbook-views.mjs';
import {analysisId} from '../v2/analysis-views.mjs';
import {caseActionId} from '../v2/intervention-views.mjs';
import {weightedMean,histogram} from '../v2/analytics.mjs';

const make=(opts={})=>createStore({clock:()=> '2026-11-24T08:00:00.000Z',...opts});
const state=(page,extra={})=>({page,classId:null,query:'',flag:'all',below:false,caseFilter:'active',caseClass:null,sorts:{},...extra});
const controller=readFileSync(new URL('../v2/hub.mjs',import.meta.url),'utf8');
const handlers=new Set([...controller.matchAll(/case '([^']+)':/g)].map(m=>m[1]));
function audit(html){
 for(const [,action] of html.matchAll(/data-action="([^"]+)"/g))assert.ok(handlers.has(action),'No action handler for '+action);
 for(const [,key] of html.matchAll(/data-help="([^"]+)"/g))assert.ok(HELP[key],'Missing tooltip '+key);
 assert.doesNotMatch(html,/>undefined<|>NaN(?:%| pp)?<|style="[^"]*NaN/);
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'Duplicate HTML IDs: '+ids.filter((v,i)=>ids.indexOf(v)!==i).join(', '));
}
test('all eight personas and their supported scopes render connected pages, valid actions and tooltips',()=>{
 const s=make();
 for(const staff of s.snapshot().staff){
  const first=createWorkspace(s,staff.id);
  for(const {id:scope} of first.scopeOptions){
   const w=createWorkspace(s,staff.id,scope),classes=w.classRows(),students=w.studentRows(),home=w.home();
   assert.equal(classes.reduce((n,c)=>n+c.students,0),home.cohort.enrolments);
   assert.equal(classes.reduce((n,c)=>n+c.below,0),home.cohort.belowTarget.length);
   assert.equal(students.reduce((n,p)=>n+p.subjects,0),home.cohort.enrolments);
   assert.equal(students.length,home.cohort.students);
   for(const page of ['home','notices','classes','students','intervention']){
    audit(renderPage(w,state(page)));
   }
   audit(sidebar('home',w));audit(topbar(w));audit(renderSearchResults(w,'Demo'));
   const c=classes[0],p=students[0];
   if(c){
    for(const tab of CLASS_TABS)audit(renderPage(w,state('classes',{classId:c.id,classTab:tab})));
    const b=w.markbook(c.id),a=b.assessments.find(a=>a.status==='published');
    if(a)audit(renderDetail(w,{kind:'mark-grid',id:bookId(c.id,a.id)}));
   }
   if(p){
    for(const tab of ['overview','assessments','comments','support'])audit(renderDetail(w,{kind:'student',id:p.id,tab}));
   }
   for(const c of w.caseRows()){
    audit(renderDetail(w,{kind:'case',id:c.id}));
    for(const action of c.actions.filter(a=>a!=='view'))audit(renderDetail(w,{kind:'case-action',id:caseActionId(c.id,action)}));
   }
   audit(renderDetail(w,{kind:'demo-guide',id:''}));
  }
 }
});
test('class tab links round-trip without changing existing routes',()=>{
 for(const tab of CLASS_TABS){
  const hash=routeHash('classes','11-maths-1',tab),route=parseRoute(hash);
  assert.equal(route.classId,'11-maths-1');assert.equal(route.classTab??'information',tab);
 }
 assert.deepEqual(parseRoute('#classes/11-maths-1/no-such-tab'),{page:'classes',classId:'11-maths-1'});
 assert.deepEqual(parseRoute('#classes/11-maths-1'),{page:'classes',classId:'11-maths-1'});
});
test('read model and markbook agree for partial tutor access; forged IDs cannot enlarge the cohort',()=>{
 const s=make(),w=createWorkspace(s,'jordan','tutor'),c=w.classRows().find(c=>c.partial&&c.subject.id==='science'&&!w.access.canViewClass(c.id));
 assert.ok(c);
 const book=w.markbook(c.id),a=book.assessments.find(a=>a.status==='published'),r=s.read('jordan');
 const got=r.assessment(a.id,{classIds:[c.id]});
 const allowed=book.detail(a.id).rows.map(r=>r.enrolmentId);
 assert.deepEqual(got.rows.map(r=>r.enrolmentId).sort(),allowed.sort());
 const denied=s.snapshot().enrolments.find(e=>e.classId===c.id&&!w.access.canViewEnrolment(e.id));
 assert.ok(denied);
 assert.equal(r.assessment(a.id,{classIds:[c.id],enrolmentIds:[denied.id]}).rows.length,0);
 assert.throws(()=>r.assessment(book.course.id+'-A5',{classIds:[c.id]}),/outside|Unknown/);
 assert.ok(got.rows.every(row=>w.access.canViewEnrolment(row.enrolmentId)));
});
test('fractional weights retain perfect marks and histogram bounds without rounding away real differences',()=>{
 const weights=[.1,.2,.3,.7,1.1];
 assert.equal(weightedMean(weights.map(weight=>({value:100,weight}))),100);
 assert.equal(weightedMean(weights.map(weight=>({value:0,weight}))),0);
 assert.equal(histogram([weightedMean(weights.map(weight=>({value:100,weight})))]).at(-1).count,1);
 assert.ok(weightedMean([{value:89.99999,weight:.1},{value:89.99999,weight:.2}])<90);
});
test('a second browser tab cannot overwrite a newer local demo snapshot',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const one=make({storage}),two=make({storage}),e='P121@11-maths';
 one.setPrediction('sam',e,'9');const saved=map.get(STORAGE_KEY);
 assert.throws(()=>two.setPrediction('sam',e,'1'),/another tab/);
 assert.throws(()=>two.reset({confirmed:true}),/another tab/);
 assert.equal(map.get(STORAGE_KEY),saved);assert.equal(two.revision(),0);
 const reloaded=make({storage});reloaded.setPrediction('sam',e,'8');
 assert.equal(make({storage}).analytics().studentSummary(e).predictedGrade,'8');
});
test('marks, targets, subject comments and intervention records stay connected after consecutive writes and reload',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},s=make({storage}),e='P121@11-maths',cls='11-maths-1',a='11-maths-A3';
 s.saveResultBatch('sam',a,[{enrolmentId:e,status:'present',marks:{q1:6,q2:10,q3:14}}],{confirmed:true});
 s.setMinimumTarget('sam',e,'9');s.setPrediction('sam',e,'8');
 s.saveSubjectNote('sam',e,null,'Demo integration observation');
 s.interventionAction('sam','I001','update',{text:'Demo integrated academic update'});
 const reloaded=make({storage}),w=createWorkspace(reloaded,'sam','faculty'),core=reloaded.analytics().studentSummary(e);
 const row=w.classRecord(cls).roster.find(r=>r.enrolmentId===e),profile=w.studentProfile('P121'),subject=profile.subjects.find(x=>x.enrolmentId===e);
 assert.equal(row.average,core.average);assert.equal(subject.average,core.average);
 assert.equal(row.minimumGrade,'9');assert.equal(subject.predictedGrade,'8');
 assert.equal(w.markbook(cls).detail(a).rows.find(r=>r.enrolmentId===e).percent,100);
 assert.equal(w.academicAnalysis(cls).student(e).cumulative.at(-1).result,100);
 assert.ok(profile.notes.some(n=>n.text==='Demo integration observation'));
 assert.ok(w.caseDetail('I001').history.some(h=>h.text.includes('Demo integrated academic update')));
 assert.equal(w.home().cohort.belowTarget.length,w.classRows().reduce((n,c)=>n+c.below,0));
 const evidence=renderDetail(w,{kind:'analysis-evidence',id:analysisId(cls,'assessment-histogram','90',{}, {assessmentId:a})});
 assert.match(evidence,/Demo Student 121/);
 audit(evidence);
});
test('both entrypoints have a demonstration guide and a permanent fictional-data warning',()=>{
 for(const file of ['../index.html','../v2/index.html']){
  const html=readFileSync(new URL(file,import.meta.url),'utf8');assert.match(html,/data-action="demo-guide"/);assert.match(html,/Fictional data only/);audit(html);
 }
});
