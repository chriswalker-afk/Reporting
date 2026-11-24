import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../v2/store.mjs';
import {createDemoData} from '../v2/demo-data.mjs';
import {createWorkspace,pct,HELP} from '../v2/workspace.mjs';
import {renderPage,renderDetail} from '../v2/views.mjs';
import {analysisId} from '../v2/analysis-views.mjs';
import {classTabs} from '../v2/markbook-views.mjs';

const make=(options={})=>createStore({clock:()=> '2026-11-24T08:00:00.000Z',...options});
const cls='11-maths-1',other='11-maths-2',enrolment='P121@11-maths',a1='11-maths-A1',a2='11-maths-A2',a3='11-maths-A3',diagnostic='11-maths-A4';
const w=(s,id='sam',scope='faculty')=>createWorkspace(s,id,scope);
const analysis=(s,id='sam',scope='faculty',classId=cls)=>w(s,id,scope).academicAnalysis(classId);
const state=(tab,extra={})=>({page:'classes',classId:cls,classTab:tab,query:'',flag:'all',below:false,sorts:{},...extra});
const equal=(x,y)=>assert.ok(Math.abs(x-y)<1e-9,String(x)+' != '+String(y));
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const evidence=(a,kind,key,o={},extra={})=>a.drilldown({kind,key,...o,...extra}).rows;

test('all five class tabs are enabled and analysis views render actual data',()=>{
 const s=make(),workspace=w(s),a=workspace.academicAnalysis(cls),tabs=classTabs('student-analysis');
 for(const id of ['information','markbook','student-analysis','class-analysis','faculty-analysis'])assert.match(tabs,new RegExp('data-id="'+id+'"'));
 assert.doesNotMatch(tabs,/disabled/);
 const student=renderPage(workspace,state('student-analysis',{analysisStudent:enrolment}));
 assert.match(student,/Attainment over time/);assert.match(student,/Assessment evidence/);
 assert.ok(student.includes(pct(a.student(enrolment).summary.average)));
 const clsHtml=renderPage(workspace,state('class-analysis'));
 assert.match(clsHtml,/Grade distribution/);assert.match(clsHtml,/Percentage distribution/);assert.match(clsHtml,/Overall box plot/);
 assert.ok(clsHtml.includes(pct(a.classOverview().mean)));
 const faculty=renderPage(workspace,state('faculty-analysis',{analysisCommon:a3}));
 assert.match(faculty,/Common assessment comparison/);assert.match(faculty,/Same assessment ID/);
 assert.match(faculty,/Year-group and course overview/);assert.match(faculty,/data-action="analysis-evidence"/);
 for(const html of [student,clsHtml,faculty])assert.doesNotMatch(html,/NaN|undefined/);
 assert.ok(HELP.analysisBox&&HELP.analysisTrend&&HELP.analysisComparison);
});
test('student cumulative weighted trend, target boundary, units and topic evidence agree with core calculations',()=>{
 const s=make(),a=analysis(s),v=a.student(enrolment),expected=s.analytics().studentSummary(enrolment);
 assert.equal(v.summary.average,expected.average);
 assert.equal(v.summary.grade,expected.grade);
 equal(v.cumulative.at(-1).percent,expected.average);
 assert.equal(v.targetBoundary,a.scheme.bands.find(b=>b.grade===expected.minimumGrade).min);
 assert.ok(v.cumulative.every(p=>p.assessmentId!==diagnostic));
 for(const t of v.topics){
  const rows=evidence(a,'topic',t.topic,{}, {studentId:enrolment});
  assert.equal(sum(rows.map(r=>r.earned)),t.earned);
  assert.equal(sum(rows.map(r=>r.available)),t.available);
  equal(t.percent,100*t.earned/t.available);
 }
 for(const u of v.units)assert.equal(u.summary.average,s.analytics().unitSummary(enrolment,u.id).average);
});
test('date and unit filters govern all summary and drilldown selectors, including empty date ranges',()=>{
 const s=make(),a=analysis(s),o={from:'2026-10-01',to:'2026-10-31',unitId:'11-maths-U1'};
 const c=a.classOverview(o),v=a.student(enrolment,o);
 assert.deepEqual(c.assessments.map(x=>x.id),[a2]);
 assert.ok(v.summary.results.every(r=>r.id===a2));
 assert.ok(c.topics.every(t=>evidence(a,'topic',t.topic,o).every(r=>r.assessmentId===a2)));
 assert.throws(()=>a.assessment(a3,o),/outside/);
 assert.throws(()=>a.filters({from:'2026-11-25',to:'2026-10-01'}),/valid date/);
 assert.throws(()=>a.filters({to:'2026-12-01'}),/after/);
 assert.throws(()=>a.filters({unitId:'12-maths-U1'}),/outside/);
 const empty=a.classOverview({from:'2026-11-21',to:'2026-11-24'});
 assert.equal(empty.statistics.n,0);assert.equal(empty.mean,null);
 assert.equal(empty.unknownTargetStatus,empty.coverage.eligible);
 const html=renderPage(w(s),state('class-analysis',{analysisFrom:'2026-11-21',analysisTo:'2026-11-24'}));
 assert.match(html,/No scored pupils/);assert.doesNotMatch(html,/NaN|undefined/);
});
test('grade, histogram, and target drilldowns exactly partition selected pupil rows',()=>{
 const a=analysis(make()),d=a.classOverview();
 for(const g of d.gradeDistribution)assert.equal(evidence(a,'grade',g.grade).length,g.count);
 for(const b of d.histogram)assert.equal(evidence(a,'histogram',String(b.lo)).length,b.count);
 assert.equal(sum(d.gradeDistribution.map(g=>g.count)),d.statistics.n);
 assert.equal(sum(d.histogram.map(b=>b.count)),d.statistics.n);
 for(const [k,n] of [['below',d.belowTarget.length],['on',d.onTrack],['unknown',d.unknownTargetStatus]])assert.equal(evidence(a,'target',k).length,n);
 assert.equal(d.belowTarget.length+d.onTrack+d.unknownTargetStatus,d.coverage.eligible);
});
test('diagnostics are standalone only; question, topic, objective and coverage drilldowns match earned marks',()=>{
 const s=make(),a=analysis(s),c=a.classOverview();
 assert.ok(c.assessments.some(x=>x.id===diagnostic));
 assert.ok(!c.eligibleAssessments.some(x=>x.id===diagnostic));
 const diagnosticResult=a.assessment(diagnostic);
 assert.equal(diagnosticResult.included,false);
 assert.ok(diagnosticResult.statistics.n>0);
 assert.ok(!c.rows.some(r=>r.results.some(x=>x.id===diagnostic)));
 const d=a.assessment(a3);
 for(const [kind,groups] of [['item',d.items],['assessment-topic',d.topics],['ao',d.objectives]])for(const g of groups){
  const rows=evidence(a,kind,g.id,{}, {assessmentId:a3});
  assert.equal(sum(rows.map(r=>r.earned)),g.earned);
  assert.equal(sum(rows.map(r=>r.available)),g.available);
  assert.equal(rows.length,g.n);
 }
 for(const k of ['scored','absent','missing','incomplete','excluded'])assert.equal(evidence(a,'assessment-status',k,{}, {assessmentId:a3}).length,d.coverage[k]);
 for(const g of d.gradeDistribution)assert.equal(evidence(a,'assessment-grade',g.grade,{}, {assessmentId:a3}).length,g.count);
 for(const b of d.histogram)assert.equal(evidence(a,'assessment-histogram',String(b.lo),{}, {assessmentId:a3}).length,b.count);
 const html=renderPage(w(s),state('class-analysis',{analysisAssessment:a3}));
 assert.match(html,/Question-level analysis/);assert.match(html,/Assessment objectives/);
 assert.match(renderPage(w(s),state('class-analysis',{analysisAssessment:diagnostic})),/Total-only assessment/);
});
test('faculty summaries compare parallel classes by pupils and common assessments by identical definition',()=>{
 const s=make(),a=analysis(s),f=a.faculty(),c=a.common(a3),all=s.analytics().cohortSummary(w(s).access.scopeEnrolments('faculty'));
 assert.equal(f.classes.length,2);
 assert.equal(f.courseSummary.mean,all.courses.find(c=>c.courseId==='11-maths').mean);
 assert.equal(f.courseSummary.coverage.eligible,sum(f.classes.map(x=>x.coverage.eligible)));
 assert.equal(f.years.length,7);
 assert.equal(c.classes.length,2);
 assert.equal(c.total.statistics.n,sum(c.classes.map(x=>x.statistics.n)));
 equal(c.total.statistics.mean,sum(c.classes.map(x=>x.statistics.n*x.statistics.mean))/c.total.statistics.n);
 for(const x of c.classes)assert.equal(evidence(a,'common-class',x.classId,{}, {assessmentId:a3}).length,x.coverage.eligible);
 for(const x of f.classes)assert.equal(evidence(a,'faculty-class',x.classId).length,x.coverage.eligible);
 for(const x of f.years)assert.equal(evidence(a,'faculty-course',x.courseId).length,x.coverage.eligible);
 const unit=a.faculty({unitId:'11-maths-U1'});
 assert.equal(unit.years.find(c=>c.courseId==='12-maths').mean,f.years.find(c=>c.courseId==='12-maths').mean);
});
test('teaching and pastoral scopes never expand through comparisons or evidence requests',()=>{
 const s=make(),teacher=analysis(s,'jordan','teaching',other);
 assert.equal(teacher.faculty().classes.length,1);assert.equal(teacher.commonOptions.length,0);
 assert.throws(()=>teacher.common(a3),/outside/);
 assert.throws(()=>teacher.student(enrolment),/outside/);
 assert.throws(()=>teacher.drilldown({kind:'faculty-class',key:cls}),/outside/);
 const tutor=createWorkspace(s,'jordan','tutor'),partial=tutor.classRows().find(c=>c.partial&&c.subject.id==='science');
 assert.ok(partial);
 const a=tutor.academicAnalysis(partial.id),d=a.classOverview();
 assert.equal(d.coverage.eligible,partial.students);
 assert.ok(d.rows.every(r=>tutor.access.isTutor(r.studentId)));
 assert.ok(a.faculty().years.flatMap(c=>c.rows).every(r=>tutor.access.isTutor(r.studentId)));
 for(const t of d.topics)assert.ok(evidence(a,'topic',t.topic).every(r=>tutor.access.isTutor(r.studentId)));
 const sl=w(s,'avery','school').academicAnalysis(cls);assert.equal(sl.faculty().classes.length,2);
 assert.throws(()=>sl.assessment('11-maths-A5'),/outside/);
});
test('batch mark edits, publication and exclusions refresh distributions, topic evidence and cumulative trend',()=>{
 const s=make();
 s.saveResultBatch('sam',a3,[{enrolmentId:enrolment,status:'present',marks:{q1:6,q2:10,q3:14}}],{confirmed:true});
 let a=analysis(s),v=a.student(enrolment),d=a.assessment(a3);
 assert.equal(v.cumulative.at(-1).result,100);
 assert.ok(evidence(a,'assessment-histogram','90',{}, {assessmentId:a3}).some(r=>r.enrolmentId===enrolment));
 assert.ok(evidence(a,'item','q1',{}, {assessmentId:a3}).some(r=>r.enrolmentId===enrolment&&r.earned===6));
 assert.equal(d.rows.find(r=>r.enrolmentId===enrolment).percent,100);
 s.setStudentExclusion('sam',a3,enrolment,{excluded:true,reason:'Demo',confirmed:true});
 a=analysis(s);assert.ok(!a.student(enrolment).cumulative.some(r=>r.assessmentId===a3));
 assert.ok(!evidence(a,'item','q1',{}, {assessmentId:a3}).some(r=>r.enrolmentId===enrolment));
 assert.ok(evidence(a,'assessment-status','excluded',{}, {assessmentId:a3}).some(r=>r.enrolmentId===enrolment));
 s.setAssessmentInclusion('sam',a2,{included:false,reason:'Demo diagnostic',confirmed:true,phrase:'EXCLUDE'});
 a=analysis(s);assert.ok(!a.classOverview().eligibleAssessments.some(x=>x.id===a2));assert.ok(a.assessment(a2).statistics.n>0);
 const draft='11-maths-A5';assert.throws(()=>a.assessment(draft),/outside/);
 s.publishAssessment('sam',draft,{confirmed:true});
 assert.throws(()=>analysis(s).assessment(draft),/outside/); // future date still excluded
});
test('evidence drawers preserve filters and render the exact underlying records',()=>{
 const s=make(),workspace=w(s),a=workspace.academicAnalysis(cls),o={from:'2026-10-01',to:'2026-10-31',unitId:'11-maths-U1'},topic=a.classOverview(o).topics[0].topic;
 const rows=evidence(a,'topic',topic,o);
 const id=analysisId(cls,'topic',topic,o);
 const html=renderDetail(workspace,{kind:'analysis-evidence',id});
 assert.ok(html.includes(rows.length+' contributing item records'));
 for(const r of rows)assert.ok(html.includes(r.name));
 assert.match(html,/actual records used/);
 assert.throws(()=>renderDetail(createWorkspace(s,'jordan','teaching'),{kind:'analysis-evidence',id}),/outside/);
});
