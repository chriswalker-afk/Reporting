import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {HOUSES,houseIdentity,houseBadge,houseName,demoHouseFor} from '../v2/branding.mjs';
import {createDemoData} from '../v2/demo-data.mjs';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderPage,renderDetail,sidebar,renderSearchResults} from '../v2/views.mjs';
import {bookId} from '../v2/markbook-views.mjs';
const state=(page,extra={})=>({page,classId:null,query:'',flag:'all',below:false,caseFilter:'active',caseClass:null,sorts:{},...extra});
test('all sixteen supplied House logos are local, mapped to the supplied ring colours, and labelled accessibly',()=>{
 assert.equal(HOUSES.length,16);assert.equal(new Set(HOUSES.map(h=>h.key)).size,16);
 assert.equal(houseIdentity('argus').color,'#1a99fc');
 assert.equal(houseIdentity('barbet').color,'#5c7cb2');
 assert.equal(houseIdentity('blackeye').color,'#f2603d');
 assert.equal(houseIdentity('eagle').color,'#fac31c');
 assert.equal(houseIdentity('fireback').color,'#9468f9');
 assert.equal(houseIdentity('frogmouth').color,'#1cb6dc');
 assert.equal(houseIdentity('whistler').color,'#fac31c');
 for(const h of HOUSES){
  const file=new URL('../v2/assets/houses/'+h.key+'.jpg',import.meta.url);
  const bytes=readFileSync(file);assert.equal(bytes[0],255);assert.equal(bytes[1],216);assert.ok(statSync(file).size<20000);
  assert.match(houseBadge(h),new RegExp('alt="'+h.name+' House"'));
  assert.ok(houseBadge(h,{large:true,label:true}).includes(h.name));
 }
 for(const name of ['jis-crest','jis-campus']){
  const bytes=readFileSync(new URL('../v2/assets/'+name+'.webp',import.meta.url));assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 }
 assert.equal(houseBadge('unrecognised'),'');assert.equal(houseName('cedar'),'Argus');
});
test('new fixture has all 16 populated Houses, preserves class and tutor membership and prior head scopes',()=>{
 const d=createDemoData(),s=createStore({initialData:d});
 assert.equal(d.houses.length,16);assert.equal(d.students.length,210);assert.equal(d.tutorGroups.length,21);assert.equal(d.enrolments.length,630);
 assert.equal(new Set(d.students.map(p=>houseIdentity(p.houseId).key)).size,16);
 for(const p of d.students){
  const g=d.tutorGroups.find(t=>t.id===p.tutorGroupId);assert.equal(g.houseId,p.houseId);
  assert.equal(p.houseId,demoHouseFor(p.year,['A','B','C'].indexOf(p.tutorGroupId.slice(-1))));
 }
 for(const staff of ['imani','morgan','robin'])assert.equal(s.read(staff).access.scopeStudents('house').length,70);
 assert.equal(d.students.find(p=>p.id==='P121').houseId,'cedar');
});
test('student badges use enrolment data across roster, tracker, search, profile and intervention',()=>{
 const s=createStore(),w=createWorkspace(s,'sam','faculty'),id='11-maths-1',p='P121';
 const register=renderPage(w,state('classes',{classId:id,classTab:'information'}));
 assert.match(register,/house-logo[^>]*argus\.jpg/);
 const grid=renderDetail(w,{kind:'mark-grid',id:bookId(id,'11-maths-A3')});
 assert.match(grid,/data-mark-row="P121@11-maths"[^>]*><td[^>]*>[\s\S]*?argus\.jpg/);
 const profile=renderDetail(w,{kind:'student',id:p});assert.match(profile,/house-badge-large[\s\S]*?argus\.jpg/);
 assert.match(renderSearchResults(w,'Demo Student 121'),/house-logo[^>]*argus\.jpg/);
 assert.match(renderDetail(w,{kind:'case',id:'I001'}),/house-logo[^>]*argus\.jpg/);
 assert.match(renderPage(w,state('home')),/jis-campus\.webp/);
 assert.match(sidebar('home',w),/jis-crest\.webp/);
 assert.equal((renderDetail(w,{kind:'demo-guide',id:''}).match(/class="house-logo"/g)??[]).length,16);
});
test('legacy three-House demo snapshots retain assignments and map to three visual identities',()=>{
 const d=createDemoData(),oldIds=['cedar','willow','oak'];
 d.houses=d.houses.filter(h=>oldIds.includes(h.id));
 for(const [i,name] of ['Cedar','Willow','Oak'].entries())d.houses.find(h=>h.id===oldIds[i]).name=name;
 for(const g of d.tutorGroups)g.houseId=oldIds[['A','B','C'].indexOf(g.id.slice(-1))];
 for(const p of d.students)p.houseId=d.tutorGroups.find(g=>g.id===p.tutorGroupId).houseId;
 const s=createStore({initialData:d}),w=createWorkspace(s,'sam','faculty');
 assert.equal(s.snapshot().houses.length,3);
 assert.equal(w.studentProfile('P121').student.house,'Argus');
 assert.equal(w.studentProfile('P121').student.houseId,'cedar');
 assert.match(renderDetail(w,{kind:'student',id:'P121'}),/argus\.jpg/);
});
