import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderDetail,renderPage} from '../v2/views.mjs';
import {bookId} from '../v2/markbook-views.mjs';
import {definitionInput} from '../v2/markbook-controller.mjs';
const cls='11-maths-1',aid='11-maths-A1',qid='11-maths-A3',eid='P121@11-maths';
const w=s=>createWorkspace(s,'sam','faculty'),book=s=>w(s).markbook(cls);
function formFor(b,values={}){
 const f=new FormData();
 for(const [k,v] of Object.entries({title:'Quick test',date:'2026-11-24',unitId:'11-maths-U1',mode:'total','total-label':'Total','total-max':'50',weight:'1','boundary-unit':'percent',initialStatus:'published',...values})){
  if(Array.isArray(v))v.forEach(x=>f.append(k,x));else f.set(k,v);
 }
 if(!f.has('boundary'))b.defaultBands.forEach(x=>f.append('boundary',String(x.min)));
 return f;
}
test('simple assessment defaults are ready for entry; structured editor replaces text syntax',()=>{
 const s=createStore(),b=book(s),html=renderDetail(w(s),{kind:'assessment-new',id:bookId(cls,'')});
 assert.match(html,/name="total-max"/);
 assert.match(html,/name="initialStatus"/);
 assert.match(html,/Question-level analysis/);
 assert.doesNotMatch(html,/textarea[^>]*name="items"/);
 const input=definitionInput(formFor(b),b,null);
 const {id}=s.saveAssessment('sam',cls,null,input);
 assert.equal(book(s).detail(id).assessment.status,'published');
 assert.equal(book(s).detail(id).maxMarks,50);
 assert.match(renderPage(w(s),{page:'classes',classId:cls,classTab:'markbook',unitId:'',query:'',flag:'all',below:false,sorts:{}}),/data-action="assessment-settings"/);
});
test('topic and QLA rows support individual maxima, topics, objectives and raw boundaries',()=>{
 const s=createStore(),b=book(s),raw=b.defaultBands.map(x=>String(x.min*0.5));
 const f=formFor(b,{mode:'questions','item-label':['Q1','Q2'],'item-max':['20','30'],'item-topic':['Algebra','Geometry'],'item-ao':['AO1','AO3'],'boundary-unit':'marks',boundary:raw});
 const input=definitionInput(f,b,null);
 assert.deepEqual(input.items,[{label:'Q1',maxMarks:20,topic:'Algebra',ao:'AO1'},{label:'Q2',maxMarks:30,topic:'Geometry',ao:'AO3'}]);
 input.bands.forEach((v,i)=>assert.ok(Math.abs(v.min-b.defaultBands[i].min)<1e-10));
 const {id}=s.saveAssessment('sam',cls,null,input);
 assert.equal(book(s).detail(id).maxMarks,50);
 const t=definitionInput(formFor(b,{mode:'topics','item-label':['Algebra'],'item-max':['12'],'item-topic':[''],'item-ao':['']}),b,null);
 assert.equal(t.items[0].topic,'Algebra');
});
test('recorded marks survive maximum corrections and all assigned classes are checked',()=>{
 const s=createStore(),d=book(s).detail(aid),a=d.assessment,before=s.snapshot().results;
 const input={...a,bands:d.bands,items:a.items.map(i=>({...i,maxMarks:i.maxMarks+10}))};
 assert.throws(()=>s.saveAssessment('sam',cls,aid,input),/Confirm maximum mark/);
 s.saveAssessment('sam',cls,aid,{...input,confirmed:true,reason:'Corrected printed maximum'});
 assert.deepEqual(s.snapshot().results,before);
 assert.equal(book(s).detail(aid).maxMarks,50);
 assert.throws(()=>s.saveAssessment('sam',cls,aid,{...input,items:a.items.map(i=>({...i,maxMarks:1})),confirmed:true,reason:'Invalid change'}),/below a recorded mark/);
 assert.equal(book(s).detail(aid).maxMarks,50);
});
test('duplicate is a new definition; only empty drafts can be deleted; audit identifiers are not reused',()=>{
 const s=createStore(),b=book(s),template=b.template(qid);
 const {id}=s.saveAssessment('sam',cls,null,{...template,title:'Copy',classIds:[cls],initialStatus:'draft'});
 assert.equal(book(s).detail(id).rows.every(r=>r.status==='missing'),true);
 assert.throws(()=>s.deleteEmptyAssessment('avery',id,{confirmed:true}),/authorised/);
 assert.throws(()=>s.deleteEmptyAssessment('sam',id),/Confirm deleting/);
 assert.throws(()=>s.deleteEmptyAssessment('sam',qid,{confirmed:true}),/empty draft/);
 s.deleteEmptyAssessment('sam',id,{confirmed:true});
 assert.ok(!s.snapshot().assessments.some(a=>a.id===id));
 assert.equal(s.snapshot().audit.at(-1).action,'deleteEmptyAssessment');
 const next=s.saveAssessment('sam',cls,null,{...template,title:'Second copy',classIds:[cls],initialStatus:'draft'});
 assert.notEqual(next.id,id);
 s.saveResultBatch('sam',next.id,[{enrolmentId:eid,status:'present',marks:{item1:1}}],{confirmed:true});
 assert.throws(()=>s.deleteEmptyAssessment('sam',next.id,{confirmed:true}),/empty draft/);
});
