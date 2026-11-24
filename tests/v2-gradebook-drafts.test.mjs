import test from 'node:test';
import assert from 'node:assert/strict';
import {draftStorageKey,serializeDrafts,restorableDrafts,createDraftStore,DRAFT_PREFIX} from '../v2/gradebook-drafts.mjs';
import {entryKey} from '../v2/gradebook-entry.mjs';

const a={id:'A1',mode:'total',items:[{id:'total',maxMarks:40}]};
const result=(marks={},extra={})=>({editable:true,entryStatus:'present',marks,...extra});
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size;}};};

test('draft keys are scoped by staff, class and unit',()=>{
 assert.notEqual(draftStorageKey('sam','c1',''),draftStorageKey('alex','c1',''));
 assert.notEqual(draftStorageKey('sam','c1','u1'),draftStorageKey('sam','c1','u2'));
 assert.ok(draftStorageKey('sam','c1').startsWith(DRAFT_PREFIX));
});

test('unsaved drafts round-trip when the saved result is unchanged',()=>{
 const key=entryKey('A1','P1'),records=new Map([[key,{a,r:result({total:20})}]]);
 const edits=new Map([[key,{draft:{status:'present',raw:{total:'33'}}}]]);
 const payload=JSON.parse(JSON.stringify(serializeDrafts(edits,records)));
 const {restored,skipped}=restorableDrafts(payload,records);
 assert.equal(skipped,0);
 assert.deepEqual(restored,[[key,{status:'present',raw:{total:'33'}}]]);
});

test('a draft is skipped if marks were saved elsewhere, the pupil left or the result became read-only',()=>{
 const k1=entryKey('A1','P1'),k2=entryKey('A1','P2'),k3=entryKey('A1','P3');
 const before=new Map([[k1,{a,r:result({total:20})}],[k2,{a,r:result()}],[k3,{a,r:result()}]]);
 const edits=new Map([[k1,{draft:{status:'present',raw:{total:'33'}}}],[k2,{draft:{status:'present',raw:{total:'5'}}}],[k3,{draft:{status:'present',raw:{total:'7'}}}]]);
 const payload=serializeDrafts(edits,before);
 const after=new Map([[k1,{a,r:result({total:25})}],[k3,{a,r:result({},{editable:false})}]]);
 assert.deepEqual(restorableDrafts(payload,after),{restored:[],skipped:3});
});

test('corrupt or foreign payloads are ignored and storage failures do not throw',()=>{
 assert.deepEqual(restorableDrafts(null,new Map()),{restored:[],skipped:0});
 assert.deepEqual(restorableDrafts({v:99,entries:[]},new Map()),{restored:[],skipped:0});
 const broken={getItem(){throw Error('denied');},setItem(){throw Error('full');},removeItem(){throw Error('denied');}};
 const store=createDraftStore(broken),key=entryKey('A1','P1');
 assert.equal(store.load('k'),null);
 assert.equal(store.save('k',new Map([[key,{draft:{status:'present',raw:{total:'1'}}}]]),new Map([[key,{a,r:result()}]])),false);
});

test('saving an empty draft set removes it, and clearAll only touches gradebook drafts',()=>{
 const storage=memory(),store=createDraftStore(storage),key=entryKey('A1','P1'),records=new Map([[key,{a,r:result()}]]);
 const k=draftStorageKey('sam','c1','');
 storage.setItem('other','keep');
 store.save(k,new Map([[key,{draft:{status:'present',raw:{total:'9'}}}]]),records);
 assert.ok(store.load(k));
 store.save(k,new Map(),records);
 assert.equal(store.load(k),null);
 store.save(k,new Map([[key,{draft:{status:'present',raw:{total:'9'}}}]]),records);
 store.clearAll();
 assert.equal(store.load(k),null);
 assert.equal(storage.getItem('other'),'keep');
});
