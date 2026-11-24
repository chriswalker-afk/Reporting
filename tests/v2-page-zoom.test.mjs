import test from 'node:test';
import assert from 'node:assert/strict';
import {PAGE_ZOOM_MIN,PAGE_ZOOM_MAX,PAGE_ZOOM_STEP,PAGE_ZOOM_DEFAULT,pageZoomKey,pageZoomStorageKey,normalizeZoom,normalizeZoomPrefs,loadPageZoom,savePageZoom,zoomControls} from '../v2/page-zoom.mjs';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderPage} from '../v2/views.mjs';

test('zoom is bounded, deterministic, and restricted to known page and tab keys',()=>{
 assert.deepEqual([PAGE_ZOOM_MIN,PAGE_ZOOM_MAX,PAGE_ZOOM_STEP,PAGE_ZOOM_DEFAULT],[70,150,10,100]);
 assert.equal(normalizeZoom(72),70);assert.equal(normalizeZoom(106),110);assert.equal(normalizeZoom(999),150);
 for(const value of ['90',null,NaN,Infinity,undefined])assert.equal(normalizeZoom(value),100);
 assert.equal(pageZoomKey({page:'home'}),'home');
 assert.equal(pageZoomKey({page:'classes'}),'classes');
 for(const tab of ['information','markbook','report-grades','student-analysis','class-analysis','faculty-analysis']){
  assert.equal(pageZoomKey({page:'classes',classId:'a',classTab:tab}),'classes:'+tab);
  assert.equal(pageZoomKey({page:'classes',classId:'b',classTab:tab}),'classes:'+tab);
 }
 assert.equal(pageZoomKey({page:'classes',classId:'a',classTab:'invalid'}),'classes:information');
 assert.deepEqual(normalizeZoomPrefs({home:80,'classes:markbook':90,students:100,invalid:70,notices:'150'}),{home:80,'classes:markbook':90});
});
test('preferences persist independently per staff, fail safely, and reset to an empty map',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.deepEqual(loadPageZoom(storage,'sam'),{});
 assert.equal(savePageZoom(storage,'sam',{home:90,'classes:markbook':80}),true);
 assert.equal(savePageZoom(storage,'avery',{home:120}),true);
 assert.deepEqual(loadPageZoom(storage,'sam'),{home:90,'classes:markbook':80});
 assert.deepEqual(loadPageZoom(storage,'avery'),{home:120});
 data.set(pageZoomStorageKey('sam'),'{broken');assert.deepEqual(loadPageZoom(storage,'sam'),{});
 assert.deepEqual(loadPageZoom({getItem(){throw Error('denied');}},'sam'),{});
 assert.equal(savePageZoom({setItem(){throw Error('denied');}},'sam',{}),false);
 assert.equal(savePageZoom(storage,'sam',{}),true);assert.deepEqual(loadPageZoom(storage,'sam'),{});
});
test('accessible zoom controls have no duplicate ids and the gradebook provides a focus instance',()=>{
 const markup=zoomControls();
 assert.match(markup,/role="group" aria-label="Page zoom"/);
 for(const action of ['page-zoom-in','page-zoom-out','page-zoom-reset'])assert.equal(markup.split('data-action="'+action+'"').length-1,1);
 assert.match(markup,/data-page-zoom-value>100%/);assert.doesNotMatch(markup,/\sid="/);
 const store=createStore(),w=createWorkspace(store,'sam','faculty'),state={page:'classes',classId:'11-maths-1',classTab:'markbook',unitId:'',query:'',sorts:{}};
 const html=renderPage(w,state);
 assert.match(html,/class="page-zoom-controls page-zoom-focus"/);
 assert.equal(store.revision(),0);
});
