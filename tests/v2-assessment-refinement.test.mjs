import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../v2/store.mjs';
import {createWorkspace,pct} from '../v2/workspace.mjs';
import {markBufferSummary,nextMarkCell,rankedEvidence,assessmentCoverage,evidenceShare} from '../v2/assessment-refinement.mjs';
import {previewRow} from '../v2/markbook.mjs';
import {renderPage,renderDetail} from '../v2/views.mjs';
import {bookId} from '../v2/markbook-views.mjs';
import {analysisId} from '../v2/analysis-views.mjs';
const make=()=>createStore({clock:()=> '2026-11-24T08:00:00.000Z'});
const cls='11-maths-1',a3='11-maths-A3',pupil='P121@11-maths';
const w=(s,id='sam',scope='faculty')=>createWorkspace(s,id,scope);
const state=(tab,extra={})=>({page:'classes',classId:cls,classTab:tab,query:'',flag:'all',below:false,sorts:{},...extra});
test('entry buffer counts keep zero, absent, excluded, missing, partial and invalid distinct and do not mutate the store',()=>{
 const s=make(),d=w(s).markbook(cls).detail(a3),original=d.rows.find(r=>r.enrolmentId===pupil),before=markBufferSummary(d);
 for(const k of ['scored','missing','incomplete','absent','excluded'])assert.equal(before.counts[k],d.coverage[k]);
 assert.equal(before.changedIds.length,0);
 assert.equal(before.eligible,d.rows.length);
 const buffer=new Map([[pupil,{...original,entryStatus:'present',marks:{q1:0,q2:0,q3:0}}]]);
 let next=markBufferSummary(d,buffer);
 assert.ok(next.changedIds.includes(pupil));
 assert.equal(previewRow(d.assessment,d.bands,'present',buffer.get(pupil).marks).percent,0);
 buffer.set(pupil,{...original,entryStatus:'present',marks:{q1:0}});
 next=markBufferSummary(d,buffer);assert.ok(next.pendingIds.includes(pupil));assert.ok(next.clearingIds.includes(pupil));
 buffer.set(pupil,{enrolmentId:pupil,invalid:true});next=markBufferSummary(d,buffer);
 assert.equal(next.counts.invalid,1);assert.ok(next.pendingIds.includes(pupil));
 buffer.set(pupil,{...original,entryStatus:'absent',marks:{}});next=markBufferSummary(d,buffer);
 assert.ok(!next.pendingIds.includes(pupil));assert.ok(next.clearingIds.includes(pupil));
 buffer.set(pupil,original);assert.equal(markBufferSummary(d,buffer).changedIds.length,0);
 assert.deepEqual(s.analytics().resultFor(a3,pupil).marks,original.marks);assert.equal(s.revision(),0);
});
test('keyboard movement follows only editable coordinates and respects row and column boundaries',()=>{
 const cells=[{row:0,col:0},{row:0,col:1},{row:2,col:0},{row:2,col:1}];
 const [a,b,c,d]=cells;
 assert.equal(nextMarkCell(cells,a,'Tab'),b);
 assert.equal(nextMarkCell(cells,b,'Tab'),c);
 assert.equal(nextMarkCell(cells,c,'Tab',true),b);
 assert.equal(nextMarkCell(cells,a,'Enter'),c);
 assert.equal(nextMarkCell(cells,c,'Enter',true),a);
 assert.equal(nextMarkCell(cells,b,'ArrowDown'),d);
 assert.equal(nextMarkCell(cells,d,'ArrowUp'),b);
 assert.equal(nextMarkCell(cells,c,'ArrowRight'),d);
 assert.equal(nextMarkCell(cells,d,'ArrowLeft'),c);
 assert.equal(nextMarkCell(cells,d,'Tab'),null);
 assert.equal(nextMarkCell(cells,b,'ArrowRight'),null);
});
test('tracker coverage and direct pupil mark links respect scopes and published dates',()=>{
 const s=make();
 for(const staff of s.snapshot().staff){
  const workspace=createWorkspace(s,staff.id,'accessible');
  const c=workspace.classRows()[0];if(!c)continue;
  const b=workspace.markbook(c.id),overview=b.overview('');
  const html=renderPage(workspace,state('markbook',{classId:c.id}));
  for(const a of overview.assessments){
   const d=b.detail(a.id),coverage=assessmentCoverage(overview.rows,a.id);
   for(const k of ['scored','missing','incomplete','absent','excluded','eligible'])assert.equal(coverage[k],d.coverage[k]);
   assert.ok(html.includes(coverage.scored+'/'+coverage.eligible+' scored'));
   const row=d.rows[0];if(!row)continue;
   const targeted=renderDetail(workspace,{kind:'mark-grid',id:bookId(c.id,a.id,row.enrolmentId)});
   assert.match(targeted,/class="requested-mark-row"/);assert.match(targeted,/id="entry-stat-scored"/);
   assert.equal(targeted.includes('data-action="next-unfinished-mark"'),d.editable);
   assert.equal(targeted.includes('data-action="markbook-analysis"'),a.status==='published'&&a.date<=workspace.asOf);
   assert.throws(()=>renderDetail(workspace,{kind:'mark-grid',id:bookId(c.id,a.id,'not-in-scope')}),/outside/);
  }
 }
 const sl=w(s,'avery','school').markbook(cls).detail(a3);
 assert.equal(markBufferSummary(sl).pendingIds.length,0);
 assert.doesNotMatch(renderDetail(w(s,'avery','school'),{kind:'mark-grid',id:bookId(cls,a3,pupil)}),/class="input mark-cell"/);
});
test('teaching priorities rank actual zero before positive results and missing evidence last',()=>{
 const rows=[{label:'No data',percent:null,available:0},{label:'Strong',percent:90,available:10},{label:'Zero',percent:0,available:10},{label:'Partial',percent:30,available:20}];
 assert.deepEqual(rankedEvidence(rows).map(r=>r.label),['Zero','Partial','Strong','No data']);
 assert.equal(evidenceShare(2,8),25);assert.equal(evidenceShare(0,0),null);
 const workspace=w(make()),a=workspace.academicAnalysis(cls),o=a.filters(),d=a.classOverview(o);
 const html=renderPage(workspace,state('class-analysis'));
 assert.ok(html.indexOf('Pupils to review')<html.indexOf('Grade distribution'));
 assert.ok(html.indexOf('Topic strengths and areas to revisit')<html.indexOf('Grade distribution'));
 for(const t of d.topics){
  const rows=a.drilldown({kind:'topic',key:t.topic,...o}).rows;
  assert.equal(rows.reduce((n,r)=>n+r.earned,0),t.earned);
  assert.equal(rows.reduce((n,r)=>n+r.available,0),t.available);
  assert.ok(html.includes(t.earned+'/'+t.available+' marks'));
  assert.ok(html.includes(pct(t.percent)));
 }
 const assessed=renderPage(workspace,state('class-analysis',{analysisAssessment:a3}));
 assert.ok(assessed.indexOf('Follow up assessment evidence')<assessed.indexOf('Grade distribution'));
 assert.ok(assessed.indexOf('Question-level analysis')<assessed.indexOf('Grade distribution'));
 assert.match(assessed,/vertical axis frequency/);
 const x=a.assessment(a3,o);
 for(const item of x.items){
  const evidence=renderDetail(workspace,{kind:'analysis-evidence',id:analysisId(cls,'item',item.id,o,{assessmentId:a3})});
  if(item.available){assert.ok(evidence.includes(item.earned+'/'+item.available+' marks'));assert.match(evidence,/View marks/);}
 }
});
test('assessment analysis and tracker progress refresh after explicit mark commits',()=>{
 const s=make(),before=w(s).academicAnalysis(cls).assessment(a3);
 s.saveResultBatch('sam',a3,[{enrolmentId:pupil,status:'present',marks:{q1:6,q2:10,q3:14}}],{confirmed:true});
 const workspace=w(s),d=workspace.academicAnalysis(cls).assessment(a3),book=workspace.markbook(cls);
 assert.equal(d.rows.find(r=>r.enrolmentId===pupil).percent,100);
 assert.equal(assessmentCoverage(book.overview('').rows,a3).scored,d.coverage.scored);
 assert.equal(markBufferSummary(book.detail(a3)).counts.scored,d.coverage.scored);
 assert.ok(d.items.every(i=>i.available===d.statistics.n*book.detail(a3).assessment.items.find(x=>x.id===i.id).maxMarks));
 assert.equal(d.statistics.n,before.statistics.n+(before.rows.find(r=>r.enrolmentId===pupil).status==='scored'?0:1));
});
