import {renderResponsiveRegister} from './responsive-register.mjs';
import {disclosure} from './workspace-disclosures.mjs';
import {METHODS,methodLabel} from './calculation-policy.mjs';
import {pct,displayDate} from './workspace.mjs';
import {bookId,unpackBookId} from './markbook-views.mjs';
import {pupilIdentity} from './branding.mjs';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opt=(id,label,value)=>'<option value="'+e(id)+'" '+(id===value?'selected':'')+'>'+e(label)+'</option>';
const select=(name,options,value,required=false)=>'<select class="select" id="'+e(name)+'" name="'+e(name)+'" '+(required?'required':'')+'>'+options.map(([id,label])=>opt(id,label,value)).join('')+'</select>';
const btn=(label,action,id='',kind='')=>'<button type="button" class="btn '+kind+'" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const facts=items=>'<dl class="drawer-summary">'+items.map(([k,v])=>'<div class="fact"><dt>'+e(k)+'</dt><dd>'+e(v??'—')+'</dd></div>').join('')+'</dl>';
const check=label=>'<label class="check-field"><input type="checkbox" name="confirmed"> '+e(label)+'</label>';
const reason=(label,value='',required=false)=>'<label>'+e(label)+'<textarea name="reason" class="input text-area" rows="3" maxlength="1000" '+(required?'required':'')+'>'+e(value)+'</textarea></label>';
const error='<div id="form-error" class="error" role="alert" hidden></div>';
const submit=label=>'<button class="btn btn-primary" type="submit">'+e(label)+'</button>';
const status=r=>r?.status==='submitted'?'Submitted':r?.status==='draft'?'Draft':'Not entered';
const methodOptions=METHODS.map(m=>[m.id,m.label]);

export function renderReportGrades(w,s,r){
 const book=w.reportGrades(r.id,s.reportPeriod),d=book.period,c=book.coverage;
 const columns=[['student','Student'],['mtg','MTG'],['calculated','Calculated at cutoff'],['prediction','Prediction'],['reportGrade','Report grade'],['status','Status'],['action','Action']];
 const cell=(p,key)=>{
  const ev=p.record?.status==='submitted'?p.record.evidence:p.evidence;
  const action=p.editable?(p.record?'Edit draft':'Enter grade'):p.canReopen?'View / reopen':p.record?'View record':'View evidence';
  if(key==='student')return pupilIdentity('<button class="inline-link" type="button" data-action="open-student" data-id="'+e(p.studentId)+'">'+e(p.name)+'</button>',w.pupilHouse(p.studentId));
  if(key==='mtg')return e(ev.minimumGrade??'—');
  if(key==='calculated')return '<strong>'+e(ev.calculatedGrade??'—')+'</strong><span class="cell-sub">'+e(pct(ev.average))+' · '+ev.scored+'/'+ev.eligible+' scored</span>';
  if(key==='prediction')return e(ev.predictedGrade??'—');
  if(key==='reportGrade')return '<strong class="report-grade-value">'+e(p.record?.grade??'—')+'</strong>';
  if(key==='status')return '<span class="tag '+(p.record?.status==='submitted'?'tag-success':p.record?'tag-warning':'')+'">'+status(p.record)+'</span>';
  if(key==='action')return btn(action,'report-grade-detail',bookId(r.id,d.id,p.enrolmentId),p.editable?'':'btn-quiet');
  return '';
 };
 const tableHtml=d?'<div class="table-scroll workspace-fill-scroll report-grade-scroll" role="region" tabindex="0" aria-label="Reporting grades table"><table class="data-table report-grade-table"><thead><tr>'+columns.map(([,label])=>'<th scope="col">'+e(label)+'</th>').join('')+'</tr></thead><tbody>'+
 book.rows.map(p=>'<tr>'+columns.map(([key])=>'<td'+(key==='reportGrade'?' class="report-grade-value"':'')+'>'+cell(p,key)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<div class="empty"><strong>No reporting periods for this class</strong>School leadership can create a Reports or SIMS grades deadline in Notices.</div>';
 const table=d?renderResponsiveRegister('reports',columns,book.rows,cell,tableHtml,s,{identity:'student',sortable:false}):tableHtml;
 return '<section class="surface workspace-fill-panel report-grades"><div class="panel-head"><h2>Reporting grades</h2>'+btn('Reporting schedule','go-schedule','','btn-quiet')+'</div>'+
 '<div class="toolbar report-grade-toolbar">'+(d?'<label>Reporting period '+select('report-period',book.periods.map(p=>[p.id,p.title+' · '+displayDate(p.dueDate)+(p.archived?' (archived)':'')]),d.id)+'</label>':'')+
 (d?'<span class="count">'+c.submitted+'/'+c.eligible+' submitted · '+c.draft+' drafts · '+c.missing+' not entered</span>':'')+'</div>'+
 (d?'<div class="info-box scope-inline">'+e(d.archived?'Archived period · read-only.':'Evidence cutoff: '+displayDate(d.dueDate<w.asOf?d.dueDate:w.asOf)+'. Submitted rows show frozen evidence; unsubmitted rows show current calculated evidence.')+'</div>':'')+
 table+disclosure('report-grade-help','About report grades','<div class="panel-body small muted">A report grade is a separate teacher judgement for this period. Enter a grade, save a draft or confirm submission. An authorised leadership member can reopen a submitted grade with a reason.</div>',{kind:'help',defaultOpen:'closed'})+'<div class="reporting-demo-note small muted">Fictional internal submission only · No external submission to SIMS or parents.</div></section>';
}
export function renderReportingDetail(w,detail){
 const [classId,periodId,enrolmentId]=unpackBookId(detail.id);
 if(detail.kind==='calculation-policy'){
  const p=w.calculationPolicy(classId),effective=methodLabel(p.effective.method);
  const methodDescription=METHODS.map(m=>'<div class="calculation-method"><strong>'+e(m.label)+'</strong><p class="small muted">'+e(m.description)+'</p></div>').join('');
  const explanation='<div class="info-box">Only complete, published, included assessment results on or before the evidence cutoff contribute. Missing, absent, incomplete and excluded results are not treated as zero. Course boundaries convert the calculated percentage into a grade. Changing a policy recalculates live attainment but never rewrites marks, targets, predictions or submitted reports.</div>';
  const form=(level,opts,value)=>'<form id="calculation-'+level+'-form" class="form-stack"><h3>'+e(level==='faculty'?'Faculty default · '+p.facultyName:'Course override · '+p.courseName)+'</h3>'+
   '<input type="hidden" name="level" value="'+level+'"><label>Calculation method'+select('calculation-'+level+'-method',opts,value)+'</label>'+
   (level==='course'?'<label>Default weight for new assessments<input type="number" class="input" name="defaultWeight" min="0.000001" max="1000" step="any" required value="'+e(p.defaultWeight)+'"></label><p class="small muted">Existing assessment weights remain unchanged. Individual assessment weights can be edited in assessment settings.</p>':'<p class="small muted">Changes affect all courses in this faculty that inherit its default.</p>')+
   reason('Reason for change','',true)+check('Confirm recalculation of live attainment')+submit('Save '+level+' settings')+'</form>';
  return {title:'Calculation settings',sub:p.courseName,body:facts([['Effective method',effective],['Source',p.effective.source],['Faculty default',p.facultyMethod?methodLabel(p.facultyMethod):'School default'],['Course override',p.courseMethod?methodLabel(p.courseMethod):'Inherit faculty'],['Default assessment weight',p.defaultWeight]])+
   explanation+'<div class="calculation-methods">'+methodDescription+'</div>'+error+
   (p.editable?'<div class="calculation-settings-forms">'+form('faculty',[['','School default'],...methodOptions],p.facultyMethod??'')+form('course',[['','Inherit faculty default'],...methodOptions],p.courseMethod??'')+'</div>':'<p class="small muted">Read-only. Only relevant faculty or school leadership can change these settings.</p>')};
 }
 const b=w.reportGrades(classId,periodId),d=b.period,row=b.rows.find(p=>p.enrolmentId===enrolmentId);
 if(!row||d?.id!==periodId)throw Error('Report grade outside current class or period');
 const r=row.record,ev=r?.status==='submitted'?r.evidence:row.evidence;
 const summary=facts([['Period',d.title],['Due date',displayDate(d.dueDate)],['Evidence cutoff',displayDate(ev.cutoff)],['Calculation method',methodLabel(ev.method)],['Calculated attainment',pct(ev.average)+' · '+(ev.calculatedGrade??'—')],['Complete assessments',ev.scored+'/'+ev.eligible],['MTG',ev.minimumGrade],['Prediction',ev.predictedGrade],['Report grade',r?.grade],['Status',status(r)]]);
 const submitted=r?.status==='submitted'?'<div class="info-box">Submitted on '+e(displayDate(r.submittedDate))+' · evidence preserved at submission.'+(r.reason?' Reason: '+e(r.reason):'')+'</div>':'';
 const form=row.editable?'<form id="report-grade-form" class="form-stack"><label>Report grade'+select('report-grade',[['','Select grade'],...b.grades.map(g=>[g,g])],r?.grade??'',true)+'</label>'+
 (ev.calculatedGrade?btn('Use calculated grade '+ev.calculatedGrade,'use-calculated-report',ev.calculatedGrade,'btn-quiet'):'')+
 reason('Reason (required for submission differing from calculated grade or without evidence)',r?.reason??'')+
 '<label>Action'+select('report-action',[['draft','Save draft'],['submit','Submit report grade']],'draft')+'</label>'+
 check('Confirm final submission (required for Submit)')+error+submit('Save report grade')+'</form>':
 row.canReopen?'<form id="report-grade-form" class="form-stack"><input type="hidden" name="report-action" value="reopen">'+reason('Reason for reopening','',true)+check('Confirm reopening to draft')+error+submit('Reopen submitted grade')+'</form>':
 '<p class="small muted">Read-only report record.</p>';
 return {title:'Report grade',sub:row.name+' · '+b.course.name,body:summary+submitted+form+'<p class="small muted">This is a fictional internal reporting record, not an external submission. MTG, predictions and marks are unchanged.</p>'};
}
