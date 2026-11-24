import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoData} from '../v2/demo-data.mjs';
import {createStore} from '../v2/store.mjs';
import {createWorkspace,parseRoute} from '../v2/workspace.mjs';
import {renderPage,renderDetail} from '../v2/views.mjs';
import {bookId} from '../v2/markbook-views.mjs';
import {attainmentAverage} from '../v2/analytics.mjs';
import {liveSummary,structuredPreview,decodeDraft,editDraftItem,draftFromResult} from '../v2/gradebook-entry.mjs';
import {validateData} from '../v2/model.mjs';

const cls='11-maths-1',eid='P121@11-maths',period='D1';
const w=(s,id='sam',scope='faculty')=>createWorkspace(s,id,scope);
const policy=(method,level='course',defaultWeight=2)=>({level,method,defaultWeight,confirmed:true,reason:'Faculty moderation decision'});
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,a+' != '+b);
const submit=(grade,reason='')=>({action:'submit',grade,reason,confirmed:true});
const report=(s,id='sam',scope='faculty')=>w(s,id,scope).reportGrades(cls,period).rows.find(p=>p.enrolmentId===eid);
test('four methods use complete numeric evidence rather than averaging grade labels',()=>{
 const rows=[
  {assessmentId:'a',date:'2026-10-01',status:'scored',percent:100,weight:1,maxMarks:20},
  {assessmentId:'b',date:'2026-11-01',status:'scored',percent:50,weight:2,maxMarks:100},
  {assessmentId:'c',date:'2026-11-02',status:'absent',percent:null,weight:10,maxMarks:100},
  {assessmentId:'d',date:'2026-11-03',status:'incomplete',percent:null,weight:10,maxMarks:100}
 ];
 approx(attainmentAverage(rows),200/3);
 approx(attainmentAverage(rows,'equal-percentage'),75);
 approx(attainmentAverage(rows,'weighted-marks'),12000/220);
 assert.equal(attainmentAverage(rows,'latest'),50);
 assert.equal(attainmentAverage(rows.slice(2),'latest'),null);
 assert.equal(attainmentAverage([{...rows[0],percent:0}]),0);
});
test('faculty settings inherit, course overrides win, and existing marks/targets/weights are unchanged',()=>{
 const s=createStore(),before=s.snapshot();
 assert.equal(w(s).calculationPolicy(cls).effective.source,'default');
 assert.throws(()=>s.setCalculationPolicy('jordan',cls,policy('latest')),/leadership/);
 assert.throws(()=>s.setCalculationPolicy('sam',cls,{...policy('latest'),confirmed:false}),/Confirm/);
 s.setCalculationPolicy('sam',cls,policy('equal-percentage','faculty'));
 assert.equal(w(s).calculationPolicy(cls).effective.method,'equal-percentage');
 assert.equal(w(s).calculationPolicy('10-maths-1').effective.source,'faculty');
 s.setCalculationPolicy('sam',cls,policy('weighted-marks'));
 const p=w(s).calculationPolicy(cls);
 assert.equal(p.effective.method,'weighted-marks');assert.equal(p.effective.source,'course');assert.equal(p.defaultWeight,2);
 assert.deepEqual(s.snapshot().results,before.results);assert.deepEqual(s.snapshot().targets,before.targets);assert.deepEqual(s.snapshot().assessments,before.assessments);
 const summary=s.analytics().studentSummary(eid);
 approx(summary.average,attainmentAverage(summary.results,'weighted-marks'));
 assert.equal(w(s).academicAnalysis(cls).student(eid).cumulative.at(-1).percent,summary.average);
 s.setCalculationPolicy('sam',cls,policy(null));assert.equal(w(s).calculationPolicy(cls).effective.method,'equal-percentage');
 assert.equal(s.snapshot().audit.at(-1).action,'setCalculationPolicy');
});
test('gradebook live previews use the selected calculation policy',()=>{
 const s=createStore();
 for(const method of ['weighted-percentage','equal-percentage','weighted-marks','latest']){
  s.setCalculationPolicy('sam',cls,policy(method));
  const b=w(s).markbook(cls),o=b.overview(''),p=o.rows.find(p=>p.enrolmentId===eid),a=o.assessments.find(a=>a.id==='11-maths-A1'),r=p.results[a.id];
  const d=editDraftItem(a,draftFromResult(a,r),'total','40'),entry=decodeDraft(a,r,d).entry;
  const live=liveSummary(p.summary,new Map([[a.id,structuredPreview(a,r,entry)]]),{bands:b.defaultBands});
  s.saveGradebookBatch('sam',cls,[entry],{confirmed:true,confirmClear:true});
  approx(s.analytics().studentSummary(eid).average,live.average);
 }
});
test('report draft and submission are separate from prediction and calculated grades; submission freezes evidence',()=>{
 const s=createStore(),original=s.snapshot(),row=report(s);
 assert.ok(row.editable);assert.equal(row.evidence.cutoff,s.snapshot().asOf);
 const grade=row.evidence.calculatedGrade;
 assert.ok(grade);
 const alternate=grade==='9'?'8':'9';
 assert.throws(()=>s.saveReportGrade('jordan',period,eid,submit(grade)),/assigned teacher/);
 assert.throws(()=>s.saveReportGrade('sam','D3',eid,submit(grade)),/outside pupil scope/);
 assert.throws(()=>s.saveReportGrade('sam',period,eid,submit('A*')),/course’s scale/);
 assert.throws(()=>s.saveReportGrade('sam',period,eid,submit(alternate)),/Explain/);
 s.saveReportGrade('sam',period,eid,{action:'draft',grade:alternate});
 assert.equal(report(s).record.status,'draft');assert.equal(report(s).record.evidence,null);
 s.saveReportGrade('sam',period,eid,submit(alternate,'Professional judgement'));
 const saved=report(s).record;assert.equal(saved.status,'submitted');assert.equal(saved.grade,alternate);assert.equal(saved.evidence.calculatedGrade,grade);
 assert.deepEqual(s.snapshot().targets,original.targets);assert.deepEqual(s.snapshot().results,original.results);
 assert.throws(()=>s.saveReportGrade('sam',period,eid,submit(grade)),/locked/);
 s.setCalculationPolicy('sam',cls,policy('latest'));
 s.setPrediction('sam',eid,'9');
 assert.deepEqual(report(s).record,saved);
 assert.equal(report(s,'avery','school').canReopen,true);
 assert.throws(()=>s.saveReportGrade('jordan',period,eid,{action:'reopen',confirmed:true,reason:'Correction'}),/leadership/);
 assert.throws(()=>s.saveReportGrade('avery',period,eid,{action:'reopen',confirmed:false,reason:'Correction'}),/Confirm/);
 s.saveReportGrade('avery',period,eid,{action:'reopen',confirmed:true,reason:'Correction'});
 assert.equal(report(s).record.status,'draft');
 assert.deepEqual(s.snapshot().audit.at(-1).before,saved);
 assert.deepEqual(validateData(s.snapshot()),[]);
});
test('period selection uses audience, archived periods remain readable, and legacy snapshots load',()=>{
 const d=createDemoData();delete d.reportGrades;
 const s=createStore({initialData:d}),b=w(s).reportGrades(cls);
 assert.ok(b.periods.some(p=>p.id===period));assert.ok(!b.periods.some(p=>p.id==='D2'));
 const grade=report(s).evidence.calculatedGrade;s.saveReportGrade('sam',period,eid,submit(grade));
 const state={page:'classes',classId:cls,classTab:'report-grades',reportPeriod:period,query:'',sorts:{}};
 const html=renderPage(w(s),state);assert.match(html,/Reporting grades/);assert.match(html,/Submitted/);assert.match(html,/Calculated at cutoff/);
 assert.match(renderDetail(w(s),{kind:'report-grade',id:bookId(cls,period,eid)}),/Reopen submitted grade/);
 assert.match(renderDetail(w(s,'avery','school'),{kind:'calculation-policy',id:bookId(cls)}),/Faculty default/);
 assert.equal(parseRoute('#classes/11-maths-1/report-grades').classTab,'report-grades');
 assert.deepEqual(validateData(s.snapshot()),[]);
});
