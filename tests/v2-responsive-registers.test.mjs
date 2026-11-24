import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderPage} from '../v2/views.mjs';
import {projectGradebook,normalizeLayout,singleAssessmentSelection} from '../v2/gradebook-layout.mjs';
import {renderResponsiveRegister,splitRegisterColumns,registerView} from '../v2/responsive-register.mjs';
import {createYearFixture} from './fixtures/gradebook-year.mjs';

const cls='11-maths-1';
const state={page:'classes',classId:cls,classTab:'markbook',unitId:'',query:'',flag:'all',below:false,sorts:{}};
const w=(s,staff='sam',scope='faculty')=>createWorkspace(s,staff,scope);
test('single-assessment view is a temporary projection, not an evidence or preference change',()=>{
 const s=createStore({initialData:createYearFixture()}),b=w(s).markbook(cls),o=b.overview('');
 const p=normalizeLayout({group:'unit',display:'grade',hidden:['AUDIT-A03'],summary:['mtg','overall']});
 const before=JSON.stringify(p),selected=projectGradebook(o,b.units,p,[],w(s).asOf,{assessmentId:'AUDIT-A03',itemId:'i5'});
 assert.equal(selected.layout.display,'marks');assert.deepEqual(selected.layout.summary,[]);
 assert.equal(selected.columns.length,2);assert.equal(selected.columns[0].item.id,'i5');assert.equal(selected.columns[1].kind,'summary');
 assert.deepEqual([...selected.shownIds],['AUDIT-A03']);assert.equal(selected.single.list.length,50);
 assert.equal(JSON.stringify(p),before);assert.equal(o.assessments.length,50);
 const total=projectGradebook(o,b.units,p,[],w(s).asOf,{assessmentId:'AUDIT-A01'});
 assert.equal(total.columns.length,1);assert.equal(total.columns[0].kind,'total');
 const fallback=singleAssessmentSelection(o,{assessmentId:'invalid',itemId:'invalid'},w(s).asOf);
 assert.ok(fallback.assessment);assert.equal(fallback.item.id,fallback.assessment.items[0].id);
 assert.equal(singleAssessmentSelection({assessments:[]}).assessment,null);
 assert.equal(s.revision(),0);
});
test('single-assessment markup includes one editable item per pupil, a status selector, and no duplicate inputs',()=>{
 const s=createStore({initialData:createYearFixture()}),ws=w(s),single={...state,gradebookEntryView:'single',gradebookSingle:{assessmentId:'AUDIT-A03',itemId:'i5'}};
 const html=renderPage(ws,single);
 assert.match(html,/data-entry-view="single" data-entry-assessment="AUDIT-A03" data-entry-item="i5"/);
 assert.match(html,/id="gradebook-single-assessment"/);assert.match(html,/id="gradebook-single-item"/);
 assert.equal((html.match(/class="gradebook-cell"/g)||[]).length,30);
 assert.equal((html.match(/class="select gradebook-result-status"/g)||[]).length,30);
 assert.match(html,/inputmode="decimal"/);
 assert.doesNotMatch(html,/id="gradebook-quick-display"/);
 assert.match(renderPage(ws,{...single,gradebookEntryView:'spreadsheet'}),/id="gradebook-quick-display"/);
 const total=renderPage(ws,{...single,gradebookSingle:{assessmentId:'AUDIT-A01'}});
 assert.equal((total.match(/class="gradebook-cell"/g)||[]).length,30);
 assert.match(total,/class="select gradebook-result-status"/);
 assert.doesNotMatch(total,/id="gradebook-single-item"/);
 const readonly=renderPage(w(s,'avery','school'),single);
 assert.doesNotMatch(readonly,/class="gradebook-cell"/);assert.doesNotMatch(readonly,/data-action="gradebook-save"/);
 assert.match(readonly,/Read-only for this class/);
});
test('responsive register card fields preserve the supplied rows and all configured fields',()=>{
 const columns=[['name','Pupil'],['average','Attainment'],['minimumGrade','MTG'],['noteCount','Comments']];
 const split=splitRegisterColumns('roster',columns,'name');
 assert.deepEqual(split.primary.map(c=>c[0]),['average','minimumGrade']);
 assert.deepEqual(split.secondary.map(c=>c[0]),['noteCount']);
 const html=renderResponsiveRegister('roster',columns,[{name:'Fictional pupil',average:'65%',minimumGrade:'6',noteCount:'2 notes'}],(r,k)=>r[k],'<div class="table-scroll">Table</div>',{registerPresentation:{roster:'cards'}});
 assert.match(html,/data-register-view="cards"/);assert.match(html,/More details/);assert.match(html,/2 notes/);
 assert.match(html,/65%/);assert.match(html,/Fictional pupil/);assert.match(html,/roster:average/);
 assert.equal(registerView('invalid'),'auto');
});
test('class, student, intervention and reporting card registers keep scoped controls and important flags',()=>{
 const ws=w(createStore()),views=[
 [{...state,classTab:'information'},'roster'],
 [{...state,classId:null,classTab:'information'},'classes'],
 [{...state,page:'students',classId:null},'students'],
 [{...state,page:'intervention',classId:null,caseFilter:'active'},'cases'],
 [{...state,classTab:'report-grades'},'reports']
 ];
 for(const [page,name] of views){
  const html=renderPage(ws,page);
  assert.match(html,new RegExp('data-register-name="'+name+'" data-register-view="auto"'));
  assert.match(html,/class="register-card"/);
  assert.match(html,/data-action="register-display"/);
 }
 const register=renderPage(ws,{...state,classTab:'information',columnGroups:[]});
 const cards=register.slice(register.indexOf('class="register-cards"'));
 assert.ok(cards.includes('TG '));assert.ok(cards.includes('SOC')||cards.includes('SEN')||cards.includes('EAL'));
 const report=renderPage(ws,{...state,classTab:'report-grades'});
 assert.match(report,/class="register-card-primary"/);assert.match(report,/data-action="report-grade-detail"/);
});
