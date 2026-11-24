import test from 'node:test';
import assert from 'node:assert/strict';
import {createYearFixture,AUDIT_CLASS as cls,AUDIT_PARALLEL as parallel,auditAssessment} from './fixtures/gradebook-year.mjs';
import {createStore,STORAGE_KEY} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {createAnalytics,gradeFor} from '../v2/analytics.mjs';
import {validateData} from '../v2/model.mjs';
import {renderPage} from '../v2/views.mjs';
import {parseDelimited} from '../v2/markbook.mjs';
import {exchangeColumns,exportGradebook,planKeyedImport,createEditHistory,selectedRectangle} from '../v2/gradebook-bulk.mjs';
import {entryKey,structuredPreview,liveSummary,blockEntries} from '../v2/gradebook-entry.mjs';
import {projectGradebook,groupSummary} from '../v2/gradebook-layout.mjs';
import {nextMarkCell} from '../v2/assessment-refinement.mjs';

const workspace=(s,staff='sam',scope='faculty')=>createWorkspace(s,staff,scope);
const book=s=>workspace(s).markbook(cls);
const state={page:'classes',classId:cls,classTab:'markbook',unitId:'',query:'',flag:'all',below:false,sorts:{}};
const csv=rows=>rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
const close=(a,b)=>assert.ok(a===b||typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<1e-8,a+' != '+b);
function storage(){
 const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
}
const policy=(method)=>({level:'course',method,defaultWeight:1,confirmed:true,reason:'Fictional audit'});
function expected(rows,method){
 const scored=rows.filter(r=>r.status==='scored');
 if(!scored.length)return null;
 if(method==='latest')return scored.at(-1).percent;
 if(method==='equal-percentage')return scored.reduce((n,r)=>n+r.percent,0)/scored.length;
 if(method==='weighted-marks')return 100*scored.reduce((n,r)=>n+r.rawMark*r.weight,0)/scored.reduce((n,r)=>n+r.maxMarks*r.weight,0);
 return scored.reduce((n,r)=>n+r.percent*r.weight,0)/scored.reduce((n,r)=>n+r.weight,0);
}
test('30 pupils and 50 mixed assessments round-trip CSV, including missing marks and quoted headers',()=>{
 const s=createStore({initialData:createYearFixture()}),b=book(s),o=b.overview('');
 assert.equal(o.rows.length,30);assert.equal(o.assessments.length,50);
 assert.strictEqual(b.overview(''),o,'Repeated render/controller reads reuse the snapshot projection');
 const raw=exportGradebook(o),rows=parseDelimited(raw),header=rows[0];
 assert.equal(rows.length,31);assert.ok(header.some(h=>h.includes('"A"\tand B')));
 assert.throws(()=>planKeyedImport(o,raw),/No changed results/);
 const columns=exchangeColumns(o),newColumns=columns.filter(c=>c.a.id.startsWith('AUDIT-A')&&c.item);
 const indexes=newColumns.map(c=>header.indexOf(c.header));
 const p=o.rows[0],id=p.enrolmentId,firstStatus=columns.find(c=>c.a.id===auditAssessment(1)&&!c.item);
 assert.equal(rows[1][header.indexOf(firstStatus.header)],'');
 const edited=rows.slice(1).reverse().map((row,i)=>{
  const out=[...row];for(const [j,col] of newColumns.entries())out[indexes[j]]=String((i+j)%(col.item.maxMarks+1));
  return out;
 });
 const planned=planKeyedImport(o,csv([header,...edited]));
 assert.equal(planned.length,30*45);
 const reverseRow=edited.find(row=>row[0]===id),first=planned.find(c=>c.entry.enrolmentId===id&&c.entry.assessmentId===auditAssessment(1));
 assert.equal(first.entry.marks.total,Number(reverseRow[indexes[0]]));
 const before=s.snapshot(),other=before.results.find(r=>r.id==='AUDIT-OTHER');
 const h=createEditHistory();const after=new Map(planned.map(c=>[c.key,c.draft]));
 h.record(new Map(),after);assert.equal(h.undo().size,0);assert.equal(h.redo().size,1350);
 const valid=planned.map(c=>c.entry),invalid={...valid.at(-1),marks:{wrong:999}};
 assert.throws(()=>s.saveGradebookBatch('sam',cls,[...valid.slice(0,-1),invalid],{confirmed:true}),/Invalid mark/);
 assert.deepEqual(s.snapshot(),before,'Invalid final entry rolls back the entire batch');
 s.saveGradebookBatch('sam',cls,valid,{confirmed:true,expectedRevision:0});
 assert.equal(s.revision(),1);assert.equal(s.snapshot().audit.at(-1).after.length,1350);
 assert.deepEqual(s.snapshot().results.find(r=>r.id===other.id),other);
 assert.deepEqual(s.snapshot().targets,before.targets);
 assert.deepEqual(validateData(s.snapshot()),[]);
 const saved=book(s).overview('');
 assert.throws(()=>planKeyedImport(saved,exportGradebook(saved)),/No changed results/);
 for(const p of saved.rows)for(const a of saved.assessments.filter(a=>a.id.startsWith('AUDIT-A')))assert.equal(p.results[a.id].status,'scored');
});
test('all four methods agree across a full-year gradebook, hidden groups, analysis and submission',()=>{
 const s=createStore({initialData:createYearFixture()}),initial=book(s).overview(''),a=initial.assessments.find(a=>a.id===auditAssessment(1)),q=initial.assessments.find(a=>a.id===auditAssessment(3)),p=initial.rows[0],id=p.enrolmentId;
 const entries=[{assessmentId:a.id,enrolmentId:id,status:'present',marks:{total:0}},{assessmentId:q.id,enrolmentId:id,status:'present',marks:Object.fromEntries(q.items.map(i=>[i.id,i.maxMarks]))}];
 for(const method of ['weighted-percentage','equal-percentage','weighted-marks','latest']){
  s.setCalculationPolicy('sam',cls,policy(method));
  const w=workspace(s),b=w.markbook(cls),o=b.overview(''),row=o.rows.find(p=>p.enrolmentId===id),scheme={bands:b.defaultBands};
  const previews=new Map(entries.map(e=>{const a=o.assessments.find(a=>a.id===e.assessmentId);return [a.id,structuredPreview(a,row.results[a.id],e)];}));
  const draft=liveSummary(row.summary,previews,scheme);
  s.saveGradebookBatch('sam',cls,entries,{confirmed:true});
  const w2=workspace(s),summary=s.analytics().studentSummary(id);
  close(summary.average,expected(summary.results,method));close(draft.average,summary.average);
  assert.equal(summary.grade,gradeFor(summary.average,scheme));
  close(w2.academicAnalysis(cls).student(id).cumulative.at(-1).percent,summary.average);
  const o2=w2.markbook(cls).overview(''),r=o2.rows.find(p=>p.enrolmentId===id),projection=projectGradebook(o2,b.units,{group:'unit',hidden:[q.id],collapsed:['unit:11-maths-U1']},[],w2.asOf);
  assert.equal(projection.shownIds.has(q.id),false);
  close(r.summary.average,summary.average);
  for(const g of projection.groups)close(groupSummary(r.summary,g,new Map(),scheme).average,expected(summary.results.filter(x=>g.all.includes(x.assessmentId)),method));
  assert.ok(summary.results.every(r=>r.date<=w2.asOf));
 }
 const row=workspace(s).reportGrades(cls,'D1').rows.find(p=>p.enrolmentId===id);
 s.saveReportGrade('sam','D1',id,{action:'submit',grade:row.evidence.calculatedGrade,reason:'',confirmed:true});
 const frozen=s.snapshot().reportGrades[0];
 s.setCalculationPolicy('sam',cls,policy('weighted-marks'));
 s.saveGradebookBatch('sam',cls,[{...entries[0],marks:{total:40}}],{confirmed:true});
 assert.deepEqual(s.snapshot().reportGrades[0],frozen);
});
test('cross-class, exclusions, stale tabs, invalid ranges and persistence failures are atomic',()=>{
 const initial=createYearFixture(),st=storage(),s=createStore({initialData:initial,storage:st}),other=createStore({initialData:initial,storage:st});
 const o=book(s).overview(''),a=o.assessments.find(x=>x.id===auditAssessment(1)),p=o.rows[0],id=p.enrolmentId,otherId=initial.enrolments.find(x=>x.classId===parallel).id;
 const entry={assessmentId:a.id,enrolmentId:id,status:'present',marks:{total:20}};
 assert.throws(()=>s.saveGradebookBatch('sam',cls,[entry,{...entry,enrolmentId:otherId}],{confirmed:true}),/assigned teaching staff/);
 assert.throws(()=>s.saveGradebookBatch('avery',cls,[entry],{confirmed:true}),/assigned teaching staff/);
 assert.throws(()=>s.saveGradebookBatch('sam',cls,[entry,entry],{confirmed:true}),/Duplicate result/);
 assert.equal(s.revision(),0);
 s.saveGradebookBatch('sam',cls,[entry],{confirmed:true});
 assert.throws(()=>other.saveGradebookBatch('sam',cls,[{...entry,marks:{total:39}}],{confirmed:true}),/another tab/);
 assert.equal(other.revision(),0);
 const reloaded=createStore({initialData:initial,storage:st});
 assert.equal(reloaded.analytics().resultFor(a.id,id).rawMark,20);
 assert.throws(()=>s.saveGradebookBatch('sam',cls,[entry],{confirmed:true,expectedRevision:0}),/changed since/);
 s.setStudentExclusion('sam',a.id,id,{excluded:true,reason:'Different sitting',confirmed:true});
 assert.throws(()=>s.saveGradebookBatch('sam',cls,[entry],{confirmed:true}),/excluded results/);
 const b=book(s),overview=b.overview(''),projection=projectGradebook(overview,b.units,{group:'unit'},[auditAssessment(3)],workspace(s).asOf);
 const groupCol=projection.columns.findIndex(c=>c.kind==='group');
 assert.throws(()=>blockEntries(overview,0,groupCol,'1',projection.columns),/read-only or structured/);
 assert.throws(()=>selectedRectangle(overview,projection.columns,{row:0,col:groupCol},{row:0,col:groupCol}),/read-only cell/);
 const protectedOverview=workspace(s,'avery','school').markbook(cls).overview('');
 assert.ok(protectedOverview.rows.every(p=>Object.values(p.results).every(r=>!r.editable)));
 const broken=createStore({initialData:initial,storage:{getItem:()=>null,setItem:()=>{throw Error('quota exceeded');}}});
 assert.throws(()=>broken.saveGradebookBatch('sam',cls,[entry],{confirmed:true}),/quota exceeded/);
 assert.equal(broken.revision(),0);assert.deepEqual(broken.snapshot(),initial);
});
test('full-year view renders mixed columns and keyboard navigation skips protected gaps',()=>{
 const s=createStore({initialData:createYearFixture()}),w=workspace(s);
 const html=renderPage(w,{...state,gradebookExpanded:{[cls]:[auditAssessment(3)]},gradebookLayout:{group:'unit'}});
 assert.match(html,/50 assessments · 30 pupils/);assert.match(html,/gradebook-group-heading/);
 assert.match(html,/AUDIT-A03/);assert.doesNotMatch(html,/NaN|undefined/);
 const cells=[{row:0,col:0},{row:0,col:2},{row:1,col:0},{row:1,col:2}];
 assert.deepEqual(nextMarkCell(cells,cells[0],'ArrowRight'),cells[1]);
 assert.deepEqual(nextMarkCell(cells,cells[1],'Tab'),cells[2]);
 assert.deepEqual(nextMarkCell(cells,cells[2],'Enter',true),cells[0]);
 assert.equal(nextMarkCell(cells,cells.at(-1),'Tab'),null);
 assert.deepEqual(parseDelimited('"title, with\ttab","line\nheader"\r\n"1","2"'),[['title, with\ttab','line\nheader'],['1','2']]);
});
