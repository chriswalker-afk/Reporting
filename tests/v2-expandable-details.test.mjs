import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderPage,renderDetail} from '../v2/views.mjs';
import {expandButton,panelAttributes,panelKey,nextExpandedPanel,createDrawerDisplay} from '../v2/expandable-details.mjs';
import {bookId} from '../v2/markbook-views.mjs';

const state={page:'classes',classId:'11-maths-1',classTab:'class-analysis',unitId:'',query:'',sorts:{}};
test('panel keys and labels are escaped and toggles are exclusive',()=>{
 const title='Topic < & "marks"';
 assert.equal(panelKey('analysis',title),'analysis:'+title);
 assert.match(panelAttributes('analysis',title),/&lt; &amp; &quot;marks&quot;/);
 assert.match(expandButton('analysis',title),/aria-expanded="false"/);
 assert.doesNotMatch(expandButton('analysis',title),/Topic < &/);
 assert.equal(nextExpandedPanel('a','a'),'');
 assert.equal(nextExpandedPanel('a','b'),'b');
});
test('each analysis view exposes its original evidence controls and unique expandable panels',()=>{
 const w=createWorkspace(createStore(),'sam','faculty');
 for(const classTab of ['student-analysis','class-analysis','faculty-analysis']){
  const html=renderPage(w,{...state,classTab});
  const keys=[...html.matchAll(/data-expandable-panel="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(keys.length>0,classTab);assert.equal(keys.length,new Set(keys).size);
  assert.equal((html.match(/data-action="expand-panel"/g)||[]).length,keys.length);
  assert.match(html,/data-workspace-disclosure="analysis-filters"/);
  assert.match(html,/data-action="analysis-evidence"|data-action="open-markbook"/);
 }
});
test('profiles retain pupil flags, contacts and all labelled assessment and support fields',()=>{
 const w=createWorkspace(createStore(),'sam','faculty');
 for(const tab of ['overview','assessments','support','comments']){
  const html=renderDetail(w,{kind:'student',id:'P121',tab});
  assert.match(html,/id="detail-title"/);
  assert.match(html,/data-action="drawer-expand"/);
  assert.match(html,/Tutor &amp; House contacts/);
  assert.match(html,/class="profile-identity-main"/);
  assert.match(html,/data-action="profile-tab"/);
  assert.match(html,/data-action="expand-panel"/);
  if(tab==='overview'||tab==='assessments'){
   assert.match(html,/profile-responsive-table/);assert.match(html,/role="columnheader"/);
   assert.match(html,/profile-mobile-label" aria-hidden="true"/);
   assert.match(html,/role="cell"/);
  }
 }
 const editor=renderDetail(w,{kind:'mark-grid',id:bookId('11-maths-1','11-maths-A3','P121@11-maths')});
 assert.match(editor,/data-action="drawer-expand"/);
 assert.match(editor,/id="mark-grid-form"/);
 assert.match(editor,/data-action="close-detail"/);
});
test('drawer expansion modifies presentation, not form contents or scroll offsets',()=>{
 const field={value:'unsaved'};
 const button={textContent:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;}};
 const body={scrollTop:125},table={scrollTop:22,scrollLeft:40};
 const dialog={open:true,dataset:{},querySelector(s){if(s==='.drawer-body')return body;if(s.includes('drawer-expand'))return button;return field;},querySelectorAll(){return [table];}};
 const controller=createDrawerDisplay(dialog);
 controller.sync();assert.equal(dialog.dataset.drawerExpanded,'false');
 controller.toggle();assert.equal(dialog.dataset.drawerExpanded,'true');assert.equal(button.attrs['aria-pressed'],'true');
 assert.equal(body.scrollTop,125);assert.equal(table.scrollLeft,40);assert.equal(field.value,'unsaved');assert.ok(button.focused);
 assert.equal(controller.restore(),true);assert.equal(controller.isExpanded(),false);
 controller.toggle();controller.reset();assert.equal(dialog.dataset.drawerExpanded,'false');
 dialog.open=false;assert.equal(controller.toggle(),false);
});
