import {pupilIdentity} from './branding.mjs';
import {maxMarks,previewRow,csvTemplate} from './markbook.mjs';
import {pct,displayDate} from './workspace.mjs';
import {assessmentCoverage} from './assessment-refinement.mjs';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,id='',kind='')=>'<button type="button" class="btn '+kind+'" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const link=(label,action,id)=>'<button type="button" class="inline-link" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const tag=(label,kind='')=>'<span class="tag '+kind+'">'+e(label)+'</span>';
const option=(id,label,value)=>'<option value="'+e(id)+'" '+(id===value?'selected':'')+'>'+e(label)+'</option>';
const select=(id,options,value,label)=>'<select class="select" id="'+e(id)+'" name="'+e(id)+'" aria-label="'+e(label)+'">'+options.map(([id,label])=>option(id,label,value)).join('')+'</select>';
const empty=(title,description='')=>'<div class="empty"><strong>'+e(title)+'</strong>'+e(description)+'</div>';
const modeName={total:'Overall mark',topics:'Topic marks',questions:'Question-level marks'};
const statusName={scored:'Scored',missing:'Missing',absent:'Absent',incomplete:'Incomplete',excluded:'Excluded'};
const statusBadge=status=>tag(statusName[status]??status,status==='excluded'?'tag-warning':status==='scored'?'tag-success':'');
export const bookId=(classId,assessmentId='',enrolmentId='')=>JSON.stringify([classId,assessmentId,enrolmentId]);
export function unpackBookId(value){const v=JSON.parse(value);if(!Array.isArray(v)||v.length!==3||v.some(x=>typeof x!=='string'))throw Error('Invalid assessment selection');return v;}
const flags=a=>'<div class="tags">'+tag(a.status==='draft'?'Draft':'Published',a.status==='draft'?'tag-warning':'tag-success')+(!a.includeInSummary?tag('Diagnostic / excluded','tag-warning'):'')+(a.classIds.length>1?tag('Common · '+a.classIds.length+' classes'):'')+'</div>';
export function classTabs(active='information'){
 return '<div class="tabs" aria-label="Class views">'+[['information','Student information'],['markbook','Assessment tracker'],['student-analysis','Student analysis'],['class-analysis','Class analysis'],['faculty-analysis','Faculty analysis']].map(([id,label])=>'<button type="button" class="tab" data-action="class-tab" data-id="'+id+'" aria-pressed="'+(active===id)+'">'+label+'</button>').join('')+'</div>';
}
export function renderMarkbook(w,s,r){
 const b=w.markbook(r.id),unitId=b.units.some(u=>u.id===s.unitId)?s.unitId:'',overview=b.overview(unitId),list=overview.assessments;
 const rows=overview.rows;
 const unitOptions=[['','All units'],...b.units.map(u=>[u.id,u.title])];
 const detailActions=a=>{
  const c=assessmentCoverage(rows,a.id);
  return '<div class="tracker-assessment">'+link(a.title,'open-markbook',bookId(r.id,a.id))+'<span class="cell-sub">'+e(displayDate(a.date)+' · /'+a.maxMarks)+'</span>'+flags(a)+
   '<div class="tracker-coverage"><span class="tracker-coverage-track" aria-hidden="true"><span style="width:'+(c.eligible?100*c.scored/c.eligible:0)+'%"></span></span><span>'+c.scored+'/'+c.eligible+' scored</span></div>'+
   (c.needsEntry?'<span class="tracker-needs-entry">'+c.needsEntry+' missing / incomplete</span>':'')+
   (a.status==='published'&&a.date<=w.asOf?btn('Analyse','markbook-analysis',bookId(r.id,a.id),'btn-quiet tracker-analysis'):'')+'</div>';
 };
 const cell=(a,p)=>{
  const x=p.results[a.id];
  const value=x.status==='scored'?'<span class="number">'+e(x.rawMark+'/'+x.maxMarks)+'</span><span class="cell-sub">'+e(pct(x.percent)+' · '+x.grade)+'</span>':
   statusBadge(x.status)+(x.recordedPercent!==null?'<span class="cell-sub">'+e(x.rawMark+'/'+x.maxMarks+' retained')+'</span>':'');
  return '<button type="button" class="tracker-cell tracker-'+e(x.status)+'" data-action="open-markbook" data-id="'+e(bookId(r.id,a.id,p.enrolmentId))+'" aria-label="'+e(p.name+' · '+a.title+' · '+(x.status==='scored'?pct(x.percent):x.status)+' · Open result')+'">'+value+'</button>';
 };
 return '<section class="surface"><div class="toolbar markbook-toolbar">'+select('markbook-unit',unitOptions,unitId,'Curriculum unit')+
 (b.canCreate?btn('Add assessment','new-assessment',bookId(r.id,unitId),'btn-primary'):'')+
 (b.canCreateUnit?btn('Add unit','new-unit',bookId(r.id)):'')+
 (b.canCreate&&b.templates.length?'<span class="reuse-control">'+select('reuse-assessment',[['','Choose previous assessment'],...b.templates.map(t=>[t.id,t.title+' · '+displayDate(t.date)])],'','Previous assessment template')+btn('Reuse','reuse-assessment',bookId(r.id,unitId))+'</span>':'')+
 '<span class="count">'+list.length+' assessments · '+rows.length+' pupils</span></div>'+
 (r.partial?'<div class="info-box scope-inline">Only pupils in the current scope appear here.</div>':'')+
 (list.length?'<div class="table-scroll markbook-summary" role="region" tabindex="0" aria-label="Assessment tracker"><table class="data-table"><thead><tr><th class="sticky-first" scope="col">Student</th><th scope="col">'+(unitId?'Unit':'Overall')+' % / grade</th>'+list.map(a=>'<th scope="col" class="assessment-heading">'+detailActions(a)+'</th>').join('')+'</tr></thead><tbody>'+
 rows.map(p=>'<tr><td class="sticky-first">'+pupilIdentity(link(p.name,'open-student',p.studentId)+'<span class="cell-sub">TG '+e(p.tutorGroupId)+'</span>',p)+'</td><td><strong>'+e(pct(p.summary.average))+'</strong><span class="cell-sub">'+e(p.summary.grade??'—')+' · '+p.summary.coverage.scored+'/'+p.summary.coverage.eligible+'</span></td>'+list.map(a=>'<td>'+cell(a,p)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':empty('No assessments in this unit',b.canCreate?'Add an assessment or reuse an existing definition.':'No visible assessments have been assigned.'))+
 '<div class="panel-body small muted">Select an assessment heading to open the mark grid, a pupil result to jump to that row, or Analyse to see the evidence. Overall/unit summaries use complete, included published results up to the demo reference date. Drafts and diagnostics remain visible here but do not contribute to summaries. A common assessment has one shared definition, with marks recorded separately for each class.</div></section>';
}
const facts=items=>'<dl class="drawer-summary">'+items.map(([k,v])=>'<div class="fact"><dt>'+e(k)+'</dt><dd>'+e(v??'—')+'</dd></div>').join('')+'</dl>';
const section=(title,body)=>'<section class="drawer-section"><h3>'+e(title)+'</h3><div class="content">'+body+'</div></section>';
const error='<div id="form-error" class="error" role="alert" hidden></div>';
const check=(name,label)=>'<label class="check-field"><input type="checkbox" name="'+e(name)+'"> '+e(label)+'</label>';
const submit=label=>'<button class="btn btn-primary" type="submit">'+e(label)+'</button>';
const textInput=(name,label,value='',type='text',required=true)=>'<label for="mb-'+name+'">'+e(label)+'<input class="input" id="mb-'+name+'" name="'+name+'" type="'+type+'" value="'+e(value)+'" '+(required?'required':'')+'></label>';
const area=(name,label,value='',required=false,rows=4)=>'<label for="mb-'+name+'">'+e(label)+'<textarea class="input text-area" id="mb-'+name+'" name="'+name+'" rows="'+rows+'" '+(required?'required':'')+'>'+e(value)+'</textarea></label>';
const choose=(name,label,options,value)=>'<label>'+e(label)+select(name,options,value,label)+'</label>';
const itemLines=items=>items.map(i=>[i.label,i.maxMarks,i.topic??'',i.ao??''].join(' | ')).join('\n');
export function renderBookDetail(w,detail){
 const [classId,assessmentId,enrolmentId]=unpackBookId(detail.id),b=w.markbook(classId),key=bookId(classId,assessmentId),kind=detail.kind;
 if(kind==='unit-form'){
  if(!b.canCreateUnit)throw Error('Only faculty leadership can add course units');
  return {title:'Add curriculum unit',sub:b.course.name,body:'<form id="unit-form" class="form-stack">'+textInput('title','Unit title')+error+submit('Save unit')+'</form>'};
 }
 if(['assessment-new','assessment-copy','assessment-edit'].includes(kind)){
  const old=kind==='assessment-edit'?b.detail(assessmentId):null;
  if(!b.canCreate||old&&!old.manageable)throw Error('You cannot manage this assessment definition');
  const template=kind==='assessment-copy'?b.template(assessmentId):null,a=old?.assessment??template;
  const bands=old?.bands??template?.bands??b.defaultBands,locked=old?.locked===true;
  const unitId=a?.unitId??(b.units.some(u=>u.id===assessmentId)?assessmentId:b.units[0]?.id??'');
  const assigned=old?a.classIds:[classId];
  const classes=b.assignmentOptions.map(c=>'<label class="check-field"><input type="checkbox" name="assigned" value="'+e(c.id)+'" '+(assigned.includes(c.id)?'checked ':'')+(locked||c.id===classId?'disabled':'')+'> '+e(c.code)+' · '+e(c.name)+'</label>').join('');
  const boundaries='<div class="boundary-grid">'+bands.map((x,i)=>'<label>'+e(x.grade)+' <input class="input boundary-input" type="number" name="boundary" min="0" max="100" step="any" required value="'+e(x.min)+'" aria-label="Minimum percentage for '+e(x.grade)+'" '+(i===0?'readonly':'')+'></label>').join('')+'</div>';
  const itemConfig=area('items','Items: label | maximum mark | topic | AO',itemLines(a?.items??[{label:'Total',maxMarks:40,topic:null,ao:null}]),true,5).replace('<textarea ','<textarea '+(locked?'readonly ':''));
  return {title:old?'Edit assessment':template?'Reuse assessment':'New assessment',sub:b.classCode+' · '+b.course.name,body:
   '<form id="assessment-form" class="form-stack">'+(template?'<div class="info-box">Copies the structure and boundaries only. No results, publication status or exclusions are copied.</div>':'')+
   textInput('title','Assessment title',template?template.title+' (copy)':a?.title??'')+
   '<div class="form-columns">'+textInput('date','Assessment date',old?a.date:w.asOf,'date')+choose('unitId','Curriculum unit',b.units.map(u=>[u.id,u.title]),unitId)+'</div>'+
   section('Assigned classes',classes+'<p class="small muted">'+(locked?'Assignments are locked because results exist.':'Faculty leadership can create one common assessment across parallel classes.')+'</p>')+
   section('Assessment format',(locked?'<input type="hidden" name="mode" value="'+e(a.mode)+'"><p>'+e(modeName[a.mode])+'</p>':choose('mode','Entry mode',Object.entries(modeName),a?.mode??'total'))+(locked?'<div class="info-box">The item structure is locked once any result exists. Reuse it as a new assessment to change questions or maximum marks.</div>':'')+itemConfig+
    '<p class="small muted">One item per line. For total-only enter Total | 40. For topic/question mode enter a topic for each item. AO1, AO2 or AO3 is optional. Item labels must be unique.</p>')+
   section('Weight and grade boundaries','<label>Summary weight<input class="input" type="number" name="weight" min="0.000001" max="1000" step="any" required value="'+e(a?.weight??b.course.defaultWeight)+'"></label><p class="small muted">A weight of 2 counts twice as much as a weight of 1. Boundaries are minimum percentages; the overall grade still uses the course tracker scheme.</p>'+boundaries+btn('Use course boundaries','reset-boundaries',key))+
   (old&&a.status==='published'?'<div class="alert">'+area('reason','Reason for changing published assessment','',false,2)+check('confirmed','Confirm these changes affect calculated results in all assigned classes')+'</div>':'')+
   error+submit(old?'Save definition':'Create draft')+'</form>'};
 }
 const d=b.detail(assessmentId),a=d.assessment;
 if(kind==='mark-grid'){
  if(enrolmentId&&!d.rows.some(r=>r.enrolmentId===enrolmentId))throw Error('Pupil outside current assessment scope');
  const stats=(label,key,n)=>'<div class="entry-stat"><span>'+e(label)+'</span><strong id="entry-stat-'+key+'">'+e(n)+'</strong></div>';
  const body='<div class="markbook-detail-head">'+flags(a)+'<p class="small muted">'+e(modeName[a.mode]+' · '+d.maxMarks+' marks · Weight '+a.weight+' · '+displayDate(a.date))+'</p></div>'+
   '<div class="entry-overview" aria-label="Assessment entry progress">'+stats('Scored','scored',d.coverage.scored+'/'+d.coverage.eligible)+stats('Missing / incomplete','pending',d.coverage.missing+d.coverage.incomplete)+stats('Absent','absent',d.coverage.absent)+stats('Excluded','excluded',d.coverage.excluded)+stats('Invalid','invalid',0)+'</div>'+
   '<div class="entry-context"><span class="small muted">Assigned classes: '+e(d.affectedClasses.join(', '))+(d.editable?' · Local preview until saved':'')+'</span>'+(a.status==='published'&&a.date<=w.asOf?btn('Analyse assessment','markbook-analysis',key,'btn-quiet'):'')+'</div>'+
   (d.editable?'<div class="entry-guide"><div><strong>Mark entry</strong> <span class="small muted">Enter / ↑ ↓ move vertically · Tab / Shift+Tab across · ← → at cell edges</span><p class="small muted">Paste a block from Excel. Blank is not zero. Save explicitly; Ctrl / Cmd+S also saves.</p></div>'+btn('Next unfinished','next-unfinished-mark','','btn-quiet')+'</div><div id="mark-focus" class="mark-focus" aria-live="polite">Select a mark cell to begin.</div>':'<p class="info-box">Read-only view. Only assigned class teachers can enter marks.</p>')+
   '<form id="mark-grid-form" class="form-stack"><div class="table-scroll entry-table" role="region" tabindex="0" aria-label="Assessment mark entry"><table class="data-table"><thead><tr><th class="sticky-first">Student</th><th>Entry status</th>'+
   a.items.map((i,j)=>'<th data-mark-header="'+j+'">'+e(i.label)+'<span class="cell-sub">'+e('/'+i.maxMarks+(i.topic?' · '+i.topic:'')+(i.ao?' · '+i.ao:''))+'</span></th>').join('')+'<th>Total</th><th>%</th><th>Grade</th><th>Result status</th><th>Inclusion</th></tr></thead><tbody>'+
   d.rows.map((r,n)=>{
    const p=previewRow(a,d.bands,r.entryStatus,r.marks,Boolean(r.exclusionReason));
    return '<tr data-mark-row="'+e(r.enrolmentId)+'" data-student-id="'+e(r.studentId)+'" data-entry-state="'+e(p.state)+'" tabindex="-1"'+(r.enrolmentId===enrolmentId?' class="requested-mark-row"':'')+'><td class="sticky-first">'+pupilIdentity(e(r.name)+'<span class="cell-sub">'+e(r.studentId)+'</span>',r)+'</td><td>'+
    (r.editable?'<select class="select entry-status" aria-label="Entry status for '+e(r.name)+'">'+[['missing','Missing'],['present','Present'],['absent','Absent']].map(([v,l])=>option(v,l,r.entryStatus)).join('')+'</select>':e(r.entryStatus))+'</td>'+
    a.items.map((i,j)=>'<td data-mark-column="'+j+'">'+(r.editable?'<input class="input mark-cell" type="text" inputmode="decimal" autocomplete="off" data-item="'+e(i.id)+'" data-row="'+n+'" data-col="'+j+'" value="'+e(r.marks[i.id]??'')+'" aria-label="'+e(r.name+' '+i.label+' out of '+i.maxMarks)+'">':e(r.marks[i.id]??'—'))+'</td>').join('')+
    '<td data-preview="total">'+e(p.total===null?'—':p.total+'/'+d.maxMarks)+'</td><td data-preview="percent">'+e(pct(p.percent))+'</td><td data-preview="grade">'+e(p.grade??'—')+'</td><td data-preview="status">'+statusBadge(p.state)+'</td><td>'+
    (r.editable?link(r.exclusionReason?'Re-include':'Exclude','student-exclusion',bookId(classId,a.id,r.enrolmentId)):r.exclusionReason?tag('Excluded','tag-warning'):'—')+'</td></tr>';
   }).join('')+'</tbody></table></div>'+
   (d.editable?'<div class="mark-save-bar"><div><span id="mark-dirty" class="small muted" role="status">No unsaved changes</span><p id="mark-clear-count" class="small muted"></p></div>'+check('confirmClear','Confirm clearing previously entered marks')+submit('Save changes')+'</div>'+error:'')+'</form>'+
   (d.editable?'<details class="drawer-section import-panel"><summary>Import from Excel / CSV</summary><div class="content"><p>Copy this template to Excel, or save it as CSV. Keep Student ID and item identifiers in the header. Leave Status blank to infer Present when entering new marks, or set Present explicitly. Blank import cells leave existing marks unchanged; type CLEAR to remove a mark. Preview changes before applying them to the unsaved grid.</p>'+
   '<textarea id="csv-template" class="input text-area" rows="3" readonly aria-label="CSV template">'+e(csvTemplate(a,d.rows))+'</textarea><div class="page-actions">'+btn('Copy template','copy-mark-template')+btn('Download CSV','download-mark-template')+'</div><label>Choose CSV file (fictional data only)<input id="mark-import-file" type="file" accept=".csv,.tsv,text/csv,text/plain"></label><textarea id="mark-import-text" class="input text-area" rows="5" placeholder="Paste CSV or tab-separated data with Student ID header" aria-label="Paste assessment results"></textarea>'+btn('Preview import','preview-mark-import')+'<div id="mark-import-preview" aria-live="polite"></div></div></details>':'');
  const footer=d.manageable?btn('Edit definition','edit-assessment',key)+ (a.status==='draft'?btn('Publish draft','publish-assessment',key,'btn-primary'):'')+btn(a.includeInSummary?'Exclude assessment':'Re-include assessment','assessment-exclusion',key,a.includeInSummary?'btn-danger':''):'';
  return {title:a.title,sub:b.classCode+' · '+b.course.name,body,footer,wide:true};
 }
 if(kind==='student-exclusion'){
  const r=d.rows.find(r=>r.enrolmentId===enrolmentId);
  if(!r?.editable)throw Error('Only the assigned teacher can change student exclusion');
  const excluding=!r.exclusionReason;
  return {title:excluding?'Exclude individual result':'Re-include individual result',sub:r.name+' · '+a.title,body:
   facts([['Recorded mark',r.rawMark===null?'—':r.rawMark+'/'+r.maxMarks],['Recorded percentage',pct(r.recordedPercent)],['Current status',statusName[r.status]??r.status]])+
   '<div class="alert">'+e(excluding?'This result will be omitted from this pupil’s summaries, class statistics and assessment analysis. Recorded marks are retained.':'The result becomes eligible again, subject to publication, date, completeness and whole-assessment inclusion.')+'</div>'+
   (r.exclusionReason?'<p>Existing reason: '+e(r.exclusionReason)+'</p>':'')+'<form id="assessment-guard-form" class="form-stack">'+area('reason','Reason for change','',true,3)+check('confirmed','I confirm this pupil’s inclusion change')+error+submit(excluding?'Exclude result':'Re-include result')+'</form>'};
 }
 if(kind==='assessment-exclusion'||kind==='publish-assessment'){
  if(!d.manageable)throw Error('Only authorised assessment owner/faculty lead can manage this assessment');
  const publish=kind==='publish-assessment',excluding=a.includeInSummary;
  if(publish&&a.status!=='draft')throw Error('Assessment is already published');
  return {title:publish?'Publish assessment':excluding?'Exclude whole assessment':'Re-include whole assessment',sub:a.title,body:
   facts([['Assigned classes',d.affectedClasses.join(', ')],['Potential pupils affected',d.affectedPupils],['Current class scored',d.coverage.scored+'/'+d.coverage.eligible]])+
   '<div class="alert">'+e(publish?'Publishing makes complete included results eligible for summaries from the assessment date. Missing or incomplete results remain unscored.':excluding?'All assigned classes will stop using this assessment in overall/unit summaries, trends and target comparisons. Marks and standalone analysis are retained.':'Complete published results become eligible for summaries again. Individually excluded results stay excluded.')+'</div>'+
   (a.exclusionReason?'<p>Existing reason: '+e(a.exclusionReason)+'</p>':'')+
   '<form id="assessment-guard-form" class="form-stack">'+(!publish?area('reason','Reason for change','',true,3):'')+(!publish&&excluding?textInput('phrase','Type EXCLUDE to confirm'):'')+
   check('confirmed',publish?'I confirm publication to all assigned classes':'I confirm the change affects all assigned classes')+error+submit(publish?'Publish assessment':excluding?'Exclude assessment':'Re-include assessment')+'</form>'};
 }
 throw Error('Unknown assessment panel');
}
