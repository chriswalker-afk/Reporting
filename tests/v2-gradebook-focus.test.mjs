import test from 'node:test';
import assert from 'node:assert/strict';
import {focusContext,nextFocusPanel,FOCUS_PANELS} from '../v2/gradebook-focus.mjs';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderPage} from '../v2/views.mjs';

const state={staffId:'sam',scope:'faculty',page:'classes',classId:'11-maths-1',classTab:'markbook',unitId:'',query:'',flag:'all',below:false,sorts:{}};
test('focus session is scoped to staff, class and access scope, not a curriculum unit',()=>{
 const key=focusContext(state);
 assert.equal(focusContext({...state,unitId:'another-unit'}),key);
 for(const patch of [{staffId:'avery'},{scope:'school'},{classId:'11-maths-2'}])assert.notEqual(focusContext({...state,...patch}),key);
 for(const patch of [{page:'students'},{classTab:'report-grades'},{classId:null}])assert.equal(focusContext({...state,...patch}),null);
});
test('focus panel controls are exclusive and repeat clicks close them',()=>{
 for(const panel of FOCUS_PANELS){assert.equal(nextFocusPanel('',panel),panel);assert.equal(nextFocusPanel(panel,panel),'');}
 assert.equal(nextFocusPanel('tools','layout'),'layout');
 assert.equal(nextFocusPanel('tools','unknown'),'');
});
test('focus and standard modes share one table, one save bar, and unique accessible controls',()=>{
 const s=createStore(),w=createWorkspace(s,'sam','faculty'),html=renderPage(w,state);
 for(const id of ['gradebook-surface','markbook-unit','gradebook-save-status','gradebook-error','gradebook-quick-display','gradebook-import-text'])assert.equal(html.split('id="'+id+'"').length-1,1,id);
 assert.equal(html.split('data-action="gradebook-focus-toggle"').length-1,1);
 for(const panel of FOCUS_PANELS){assert.match(html,new RegExp('aria-controls="gradebook-focus-'+panel+'"'));assert.match(html,new RegExp('id="gradebook-focus-'+panel+'" data-gradebook-focus-section="'+panel+'"'));}
 assert.match(html,/gradebook-focus-heading/);
 assert.match(html,/Fictional data only · Not secure/);
 assert.ok(html.indexOf('data-gradebook-hidden-edits')>html.indexOf('data-gradebook-focus-section="help"'));
 assert.ok(html.indexOf('gradebook-scroll')<html.indexOf('id="gradebook-save-status"'));
 assert.doesNotMatch(renderPage(w,{...state,classTab:'information'}),/data-action="gradebook-focus-toggle"/);
 assert.equal(s.revision(),0);
});

test('secondary options are explicitly hidden initially, with one toolbar and inline calculation metadata',()=>{
 const s=createStore(),w=createWorkspace(s,'sam','faculty'),html=renderPage(w,state);
 assert.match(html,/class="gradebook-secondary-panels gradebook-toolbar-flyout" role="region" aria-label="Gradebook options panel" hidden/);
 for(const panel of FOCUS_PANELS)assert.match(html,new RegExp('data-gradebook-focus-section="'+panel+'" hidden'));
 const toolbarStart=html.indexOf('class="toolbar markbook-toolbar"'),flyoutStart=html.indexOf('class="gradebook-secondary-panels gradebook-toolbar-flyout"');
 assert.ok(toolbarStart>=0&&toolbarStart<html.indexOf('id="gradebook-quick-display"')&&html.indexOf('id="gradebook-quick-display"')<flyoutStart);
 assert.match(html,/data-action="gradebook-close-panel"/);
 assert.equal(html.split('class="gradebook-policy-line').length-1,1);
 assert.ok(html.indexOf('class="gradebook-policy-line')>html.indexOf('id="gradebook-save-status"'));
 assert.ok(html.indexOf('class="gradebook-policy-line')>html.indexOf('class="gradebook-save-bar"'));
 assert.equal(s.revision(),0);
});
