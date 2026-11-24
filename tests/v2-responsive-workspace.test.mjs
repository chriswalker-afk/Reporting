import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_WORKSPACE_PREFS,normalizeWorkspacePrefs,workspaceLayout,workspacePrefsKey,loadWorkspacePrefs,saveWorkspacePrefs} from '../v2/responsive-workspace.mjs';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderPage,sidebar,topbar} from '../v2/views.mjs';

test('auto display accounts for height and width; explicit modes respect device navigation',()=>{
 assert.deepEqual(workspaceLayout({},1920,1080),{density:'standard',navigation:'full'});
 assert.deepEqual(workspaceLayout({},1366,768),{density:'compact',navigation:'rail'});
 assert.deepEqual(workspaceLayout({},1280,1024),{density:'compact',navigation:'rail'});
 assert.deepEqual(workspaceLayout({},844,390),{density:'compact',navigation:'rail'});
 assert.deepEqual(workspaceLayout({density:'standard'},1024,768),{density:'standard',navigation:'full'});
 assert.deepEqual(workspaceLayout({density:'compact',navigation:'full'},1920,1080),{density:'compact',navigation:'full'});
 for(const width of [320,390,760]){
  assert.equal(workspaceLayout({density:'standard',navigation:'full'},width,844).navigation,'overlay');
  assert.equal(workspaceLayout({density:'compact',navigation:'rail'},width,844).navigation,'overlay');
 }
 assert.equal(workspaceLayout({},761,844).navigation,'rail');
});
test('preferences are validated, saved per fictional staff member and fail safely',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert.deepEqual(normalizeWorkspacePrefs({density:'invalid',navigation:'invalid',extra:true}),DEFAULT_WORKSPACE_PREFS);
 assert.equal(saveWorkspacePrefs(storage,'sam',{density:'compact',navigation:'full'}),true);
 assert.deepEqual(loadWorkspacePrefs(storage,'sam'),{density:'compact',navigation:'full'});
 assert.deepEqual(loadWorkspacePrefs(storage,'avery'),DEFAULT_WORKSPACE_PREFS);
 values.set(workspacePrefsKey('sam'),'bad JSON');
 assert.deepEqual(loadWorkspacePrefs(storage,'sam'),DEFAULT_WORKSPACE_PREFS);
 assert.deepEqual(loadWorkspacePrefs({getItem(){throw Error('denied');}},'sam'),DEFAULT_WORKSPACE_PREFS);
 assert.equal(saveWorkspacePrefs({setItem(){throw Error('denied');}},'sam',{}),false);
 assert.equal(saveWorkspacePrefs(null,'sam',{}),false);
});
test('shared layout markers and named navigation controls retain accessible identities',()=>{
 const store=createStore(),w=createWorkspace(store,'sam','faculty'),state={page:'classes',classId:'11-maths-1',classTab:'markbook',unitId:'',query:'',flag:'all',below:false,sorts:{}};
 const nav=sidebar('classes',w),bar=topbar(w),gradebook=renderPage(w,state);
 assert.match(nav,/aria-label="Classes" title="Classes"/);
 assert.match(nav,/aria-current="page"/);
 assert.match(bar,/aria-controls="sidebar"/);
 assert.match(bar,/id="workspace-density"/);
 assert.match(bar,/data-action="toggle-workspace-navigation"/);
 assert.match(gradebook,/data-workspace-fill="true"/);
 assert.match(gradebook,/workspace-fill-panel gradebook-surface/);
 assert.match(gradebook,/workspace-fill-scroll markbook-summary/);
 const reporting=renderPage(w,{...state,classTab:'report-grades'});
 assert.match(reporting,/workspace-fill-panel report-grades/);
 assert.match(reporting,/workspace-fill-scroll report-grade-scroll/);
 assert.doesNotMatch(renderPage(w,{...state,page:'home',classId:null}),/data-workspace-fill="true"/);
 assert.equal(store.revision(),0);
});

test('navigation prioritises working pages with a collapsed planned modules disclosure',()=>{
 const store=createStore(),w=createWorkspace(store,'sam','faculty'),html=sidebar('notices',w);
 assert.match(html,/class="sidebar-scroll" role="region" aria-label="Staff workspace navigation" tabindex="0"/);
 assert.match(html,/<details class="sidebar-future"><summary[^>]*aria-label="Planned modules"/);
 assert.equal((html.match(/data-action="navigate"/g)||[]).length,5);
 assert.equal((html.match(/class="future-link" aria-disabled="true"/g)||[]).length,7);
 assert.ok(html.indexOf('class="brand"')<html.indexOf('class="sidebar-scroll"'));
 assert.ok(html.indexOf('aria-current="page"')<html.indexOf('class="sidebar-future"'));
 assert.equal(store.revision(),0);
});
