import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,STORAGE_KEY} from '../v2/store.mjs';
import {createDemoData} from '../v2/demo-data.mjs';
import {createWorkspace,sortRows,matchText,pct} from '../v2/workspace.mjs';
import {GROUPS,DEFAULT_GROUPS,registerColumns,filterRegister} from '../v2/class-overview.mjs';
import {renderPage,renderDetail} from '../v2/views.mjs';

const create=(options={})=>createStore({clock:()=> '2026-11-24T08:00:00.000Z',...options});
const w=(s,id='sam',scope='faculty')=>createWorkspace(s,id,scope);
const state=(classId='11-maths-1',extra={})=>({page:'classes',classId,query:'',flag:'all',below:false,sorts:{},...extra});
const pupil=(store,e='P121@11-maths',staff='sam',scope='faculty')=>{
 const cls=store.snapshot().enrolments.find(x=>x.id===e).classId;
 return w(store,staff,scope).classRecord(cls).roster.find(p=>p.enrolmentId===e);
};
test('register uses calculated overall and latest results, coverage, and next-grade distance',()=>{
 const s=create(),e='P121@11-maths',p=pupil(s),r=s.analytics().studentSummary(e);
 assert.equal(p.average,r.average);assert.equal(p.grade,r.grade);
 assert.equal(p.latestPercent,r.latest?.percent??null);assert.equal(p.latestGrade,r.latest?.grade??null);
 assert.equal(p.nextGradePoints,r.nextGrade?.percentagePoints??null);
 assert.equal(p.coverageCount,r.coverage.scored);
 assert.equal(p.gapToPrediction,r.gapToPrediction);
 const html=renderPage(w(s),state());
 assert.ok(html.includes('data-help="studentAverage"'));assert.ok(html.includes('data-help="nextGrade"'));
 assert.ok(html.includes('data-id="'+e+'"'));assert.match(html,/data-action="subject-summary"/);
 assert.match(html,/id="quick-class"/);assert.match(html,/Next ›/);
 assert.match(renderDetail(w(s),{kind:'subject-summary',id:e}),/Contributing assessment records/);
});
test('column groups toggle independently and always retain pupil names',()=>{
 const s=create(),workspace=w(s),columns=registerColumns(DEFAULT_GROUPS);
 assert.equal(columns[0][0],'name');assert.ok(columns.some(c=>c[0]==='latestPercent'));
 assert.ok(!columns.some(c=>c[0]==='latestTitle'));
 assert.deepEqual(registerColumns([]),[['name','Student']]);
 assert.ok(registerColumns(['detail']).some(c=>c[0]==='gapToPrediction'));
 const html=renderPage(workspace,state('11-maths-1',{columnGroups:['detail']}));
 assert.match(html,/Latest assessment/);assert.match(html,/Δ pred\./);
 assert.doesNotMatch(html,/data-id="roster:average"/);
 assert.match(html,/data-action="toggle-columns" data-id="detail" aria-pressed="true"/);
 assert.match(html,/class="sticky-first/);
});
test('grade sorting uses ordered course grades, not alphabetical grade labels',()=>{
 const s=create(),rows=w(s).classRecord('12-maths-1').roster;
 const sorted=sortRows(rows,'grade','asc').filter(p=>p.gradeRank!==null);
 assert.ok(sorted.every((p,i)=>i===0||p.gradeRank>=sorted[i-1].gradeRank));
 const sample=[{id:'a',grade:'A*',gradeRank:6},{id:'b',grade:'U',gradeRank:0},{id:'c',grade:'E',gradeRank:1},{id:'d',grade:null,gradeRank:null}];
 assert.deepEqual(sortRows(sample,'grade').map(p=>p.id),['b','c','a','d']);
 assert.deepEqual(sortRows(sample,'grade','desc').map(p=>p.id),['a','c','b','d']);
});
test('SOC follows visible active cases, wave stays subject-specific, closed cases do not create SOC',()=>{
 const s=create(),sl=w(s,'avery','school'),d=s.snapshot();
 const maths=pupil(s,'P121@11-maths','avery','school'),science=pupil(s,'P121@11-science','avery','school'),english=pupil(s,'P121@11-english','avery','school');
 assert.ok(maths.soc&&science.soc&&english.soc);
 assert.equal(maths.wave,1);assert.equal(science.wave,2);assert.equal(english.wave,0);
 assert.ok(english.flags.includes('SOC'));
 assert.equal(pupil(s,'P122@11-english','avery','school').soc,false);
 for(const staff of d.staff){
  const workspace=createWorkspace(s,staff.id,'accessible');
  for(const cls of workspace.classRows())for(const p of cls.roster){
   assert.equal(p.soc,p.visibleCases.length>0);
   assert.ok(p.visibleCases.every(c=>workspace.access.canViewCase(c.id)&&c.state!=='closed'));
  }
 }
});
test('register filters combine tutor group, House, administrative flags, support and attainment',()=>{
 const s=create(),r=w(s).classRecord('11-maths-1'),p=r.roster.find(p=>p.soc);
 assert.ok(p);
 const selected=filterRegister(r.roster,{tutorFilter:p.tutorGroupId,houseFilter:p.house,flag:'SOC',supportFilter:'w'+p.wave},matchText);
 assert.ok(selected.some(x=>x.id===p.id));
 assert.ok(selected.every(x=>x.tutorGroupId===p.tutorGroupId&&x.house===p.house&&x.soc&&x.wave===p.wave));
 const below=filterRegister(r.roster,{trackFilter:'below'},matchText);
 assert.deepEqual(below.map(x=>x.id),r.roster.filter(x=>x.onTrack===false).map(x=>x.id));
 const html=renderPage(w(s),state('11-maths-1',{flag:'SOC'}));
 assert.match(html,/id="tutor-filter"/);assert.match(html,/id="house-filter"/);assert.match(html,/id="support-filter"/);
 assert.match(html,/data-action="open-case"/);
 for(const x of r.roster.filter(x=>!x.soc))assert.ok(!html.includes('>'+x.name+'</button>'));
 const classIndex=renderPage(w(s),state(null,{classYear:'11',classFaculty:'Mathematics'}));
 assert.match(classIndex,/id="class-year"/);assert.match(classIndex,/id="class-faculty"/);
 assert.doesNotMatch(classIndex,/data-id="12-maths-1"/);
});
test('mark edits and exclusions flow into register evidence without stale independent metrics',()=>{
 const s=create(),e='P121@11-maths',a='11-maths-A3';
 s.saveResult('sam',a,e,{status:'present',marks:{q1:6,q2:10,q3:14}});
 let p=pupil(s,e);
 assert.equal(p.latestPercent,100);assert.equal(p.latestGrade,'9');
 assert.equal(p.average,s.analytics().studentSummary(e).average);
 assert.match(renderDetail(w(s),{kind:'subject-summary',id:e}),/30\/30/);
 s.setStudentExclusion('sam',a,e,{excluded:true,reason:'Fictional non-comparable sitting',confirmed:true});
 p=pupil(s,e);assert.notEqual(p.latest?.assessmentId,a);
 assert.equal(p.coverage.excluded,1);
 const html=renderDetail(w(s),{kind:'subject-summary',id:e});
 assert.match(html,/1 excluded/);assert.match(html,/30\/30/);
});
test('faculty target change propagates to register, student and Home; other roles cannot edit it',()=>{
 const s=create(),e='P121@11-maths';
 assert.throws(()=>s.setMinimumTarget('avery',e,'9'),/faculty leadership/);
 assert.throws(()=>s.setMinimumTarget('jordan',e,'9'),/faculty leadership/);
 assert.throws(()=>s.setMinimumTarget('sam',e,'A*'),/target\/prediction outside/);
 s.setMinimumTarget('sam',e,'9');const p=pupil(s,e),workspace=w(s);
 assert.equal(p.minimumGrade,'9');
 assert.equal(workspace.studentDetail('P121').subjects.find(x=>x.enrolmentId===e).minimumGrade,'9');
 assert.equal(workspace.classRecord('11-maths-1').below,workspace.classRecord('11-maths-1').roster.filter(x=>x.onTrack===false).length);
 assert.equal(workspace.classRows().reduce((n,c)=>n+c.below,0),workspace.home().cohort.belowTarget.length);
 assert.match(renderDetail(workspace,{kind:'target',id:e}),/Confirm the revised target/);
 assert.throws(()=>renderDetail(w(s,'avery','school'),{kind:'target',id:e}),/faculty leadership/);
});
test('subject comments preserve author/date, share across relevant views, reject unauthorised edits and persist',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const s=create({storage}),e='P121@11-maths',before=pupil(s,e).noteCount;
 assert.throws(()=>s.saveSubjectNote('avery',e,null,'Fictional observation'),/assigned teacher/);
 assert.throws(()=>s.saveSubjectNote('sam',e,null,'  '),/Enter a comment/);
 s.saveSubjectNote('sam',e,null,'  Demo: revise <algebra>  ');
 const note=s.snapshot().notes.find(x=>x.text==='Demo: revise <algebra>');
 assert.equal(note.authorStaffId,'sam');assert.equal(pupil(s,e).noteCount,before+1);
 assert.equal(w(s,'avery','school').subjectDetail(e).notes.some(x=>x.id===note.id),true);
 assert.equal(w(s,'avery','school').subjectDetail(e).canComment,false);
 assert.throws(()=>s.saveSubjectNote('jordan',e,note.id,'Changed'),/assigned teacher/);
 assert.throws(()=>s.saveSubjectNote('sam','P123@11-maths',note.id,'Changed'),/assigned author/);
 assert.match(renderDetail(w(s),{kind:'subject-comments',id:e}),/&lt;algebra&gt;/);
 assert.doesNotMatch(renderDetail(w(s,'avery','school'),{kind:'subject-comments',id:e}),/id="comment-form"/);
 s.saveSubjectNote('sam',e,note.id,'Demo: review equations');
 const edited=s.snapshot().notes.find(x=>x.id===note.id);
 assert.equal(edited.date,note.date);assert.equal(edited.authorStaffId,note.authorStaffId);
 assert.equal(edited.updatedDate,'2026-11-24');
 assert.equal(s.snapshot().audit.at(-1).before.text,note.text);
 assert.equal(w(create({storage})).noteDetail(note.id).text,'Demo: review equations');
});
test('pastoral notes do not appear as subject comments, scoped tutor class stays partial',()=>{
 const data=createDemoData();
 data.notes.push({id:'NP',enrolmentId:'P121@11-maths',authorStaffId:'sam',date:'2026-11-22',visibility:'pastoral',text:'Fictional pastoral observation'});
 const s=create({initialData:data});
 assert.ok(!w(s).subjectDetail('P121@11-maths').notes.some(n=>n.id==='NP'));
 assert.throws(()=>s.saveSubjectNote('sam','P121@11-maths','NP','Changed'),/assigned author/);
 const tutor=createWorkspace(s,'jordan','tutor'),cls=tutor.classRows().find(c=>c.partial);
 assert.ok(cls);
 assert.ok(cls.roster.every(p=>tutor.access.isTutor(p.studentId)));
 assert.equal(cls.students,cls.roster.length);
 assert.match(renderPage(tutor,state(cls.id)),/restricted to pupils/);
});
