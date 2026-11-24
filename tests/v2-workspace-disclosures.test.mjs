import test from 'node:test';
import assert from 'node:assert/strict';
import {disclosure,activeFilterCount,filterLabel,defaultDisclosureOpen} from '../v2/workspace-disclosures.mjs';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderPage} from '../v2/views.mjs';

test('disclosure defaults and active filters',()=>{
 assert.equal(defaultDisclosureOpen('standard','compact'),false);
 assert.equal(defaultDisclosureOpen('standard','standard'),true);
 assert.equal(defaultDisclosureOpen('closed','standard'),false);
 assert.equal(defaultDisclosureOpen('always','compact'),true);
 assert.equal(activeFilterCount(['all'],['7'],[''],[false,false],[true,false],['2026-01-01','2026-01-01']),2);
 assert.equal(filterLabel(0),'Filters');
 assert.equal(filterLabel(2),'Filters (2 active)');
 const html=disclosure('a','Details < &','<p>Body</p>',{note:'<script>',kind:'help',defaultOpen:'closed'});
 assert.match(html,/Details &lt; &amp;/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/<details[^>]* open/);
});
test('page disclosures preserve important identity, flags, status and controls',()=>{
 const w=createWorkspace(createStore(),'sam','faculty');
 const state={page:'classes',classId:'11-maths-1',classTab:'markbook',unitId:'',query:'',flag:'all',below:false,sorts:{}};
 const gradebook=renderPage(w,state);
 assert.match(gradebook,/<h1>[^<]*Mathematics/);
 assert.match(gradebook,/data-workspace-disclosure="page-context"/);
 assert.match(gradebook,/data-workspace-disclosure="gradebook-help"/);
 assert.ok(gradebook.indexOf('id="gradebook-save-status"')>gradebook.indexOf('data-workspace-disclosure="gradebook-help"'));
 assert.ok(gradebook.indexOf('id="gradebook-error"')>gradebook.indexOf('data-workspace-disclosure="gradebook-help"'));
 const register=renderPage(w,{...state,classTab:'information'});
 assert.match(register,/data-workspace-disclosure="class-summary"/);
 assert.match(register,/active cases/);
 assert.match(register,/data-action="register-focus"/);
 const directory=renderPage(w,{...state,page:'students',classId:null,studentYear:'11'});
 assert.match(directory,/data-workspace-disclosure="student-filters"/);
 assert.match(directory,/Filters \(1 active\)/);
 assert.match(directory,/reviews due/);
 const analysis=renderPage(w,{...state,classTab:'class-analysis'});
 assert.match(analysis,/data-workspace-disclosure="analysis-filters"/);
 assert.match(analysis,/Published results through/);
 const report=renderPage(w,{...state,classTab:'report-grades'});
 assert.match(report,/data-workspace-disclosure="report-grade-help"/);
 assert.match(report,/Fictional internal submission only/);
});


test('compact workspace headers preserve scope, directory actions, and class navigation',()=>{
 const store=createStore();
 const w=createWorkspace(store,'sam','faculty');
 const state={page:'classes',classId:null,classTab:'information',query:'',sorts:{}};
 const header=html=>html.match(/<section class="surface compact-workspace-header[^"]*"[\s\S]*?<\/section>/)?.[0]??'';
 const classes=renderPage(w,state),classHeader=header(classes);
 assert.match(classHeader,/<h1>Classes<\/h1>/);
 assert.match(classHeader,/teaching groups/);
 for(const id of ['page-query','quick-class'])assert.ok(classHeader.includes('id="'+id+'"'));
 assert.match(classHeader,/data-action="clear-register-filters"/);
 assert.doesNotMatch(classes,/data-workspace-disclosure="page-context"/);
 assert.match(classes,/data-workspace-disclosure="class-index-filters" data-disclosure-default="closed"/);
 const filtered=header(renderPage(w,{...state,query:'no matching class at all'}));
 assert.match(filtered,/0 of [0-9]+ teaching groups/);
 const students=renderPage(w,{...state,page:'students'}),studentHeader=header(students);
 for(const action of ['students-reset','students-below','students-soc','students-due'])assert.ok(studentHeader.includes('data-action="'+action+'"'));
 assert.doesNotMatch(students,/data-workspace-disclosure="student-summary"/);
 assert.match(students,/data-workspace-disclosure="student-filters"/);
 const interventions=renderPage(w,{...state,page:'intervention'}),caseHeader=header(interventions);
 for(const action of ['filter-active','filter-due','go-personal-actions','filter-closed'])assert.ok(caseHeader.includes('data-action="'+action+'"'));
 assert.match(interventions,/data-workspace-disclosure="case-progression" data-disclosure-default="closed"/);
 assert.match(caseHeader,/data-action="new-case"/);
 assert.doesNotMatch(interventions,/class="metrics intervention-metrics"/);
 for(const classTab of ['information','class-analysis','report-grades']){
  const classView=renderPage(w,{...state,classId:'11-maths-1',classTab});
  assert.match(header(classView),/Mathematics/);
  assert.match(header(classView),/data-action="go-classes"/);
  assert.match(header(classView),/id="quick-class"/);
 }
});
