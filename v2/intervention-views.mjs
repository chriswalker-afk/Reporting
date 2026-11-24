import {pct,displayDate,gradeGap} from './workspace.mjs';
import {STRATEGIES,WAVE2_TRIGGERS,WAVE3_TRIGGERS,CASE_ACTION_LABELS} from './interventions.mjs';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,id='',kind='')=>'<button type="button" class="btn '+kind+'" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const link=(label,action,id)=>'<button type="button" class="inline-link" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const tag=(label,kind='')=>'<span class="tag '+kind+'">'+e(label)+'</span>';
const help=(id,label)=>'<button type="button" class="help" data-help="'+e(id)+'" aria-label="'+e('About '+label)+'" aria-expanded="false">ⓘ</button>';
const empty=(title,detail='')=>'<div class="empty"><strong>'+e(title)+'</strong>'+e(detail)+'</div>';
const section=(title,body,tip='')=>'<section class="drawer-section"><h3>'+e(title)+(tip?help(tip,title):'')+'</h3><div class="content">'+body+'</div></section>';
const facts=items=>'<dl class="drawer-summary">'+items.map(([k,v])=>'<div class="fact"><dt>'+e(k)+'</dt><dd>'+v+'</dd></div>').join('')+'</dl>';
const text=v=>'<p>'+e(v??'Not recorded')+'</p>';
const field=(name,label,value='',type='text',required=true)=>'<label for="case-'+name+'">'+e(label)+'<input class="input" id="case-'+name+'" name="'+name+'" type="'+type+'" value="'+e(value)+'" '+(required?'required':'')+'></label>';
const area=(name,label,value='',required=true,rows=4,max=4000)=>'<label for="case-'+name+'">'+e(label)+'<textarea class="input text-area" id="case-'+name+'" name="'+name+'" maxlength="'+max+'" rows="'+rows+'" '+(required?'required':'')+'>'+e(value)+'</textarea></label>';
const choose=(name,label,options,value='',required=true)=>'<label for="case-'+name+'">'+e(label)+'<select class="select" name="'+name+'" id="case-'+name+'" '+(required?'required':'')+'>'+options.map(([k,l])=>'<option value="'+e(k)+'" '+(k===value?'selected':'')+'>'+e(l)+'</option>').join('')+'</select></label>';
const check=(name,label,required=false)=>'<label class="check-field"><input type="checkbox" name="'+name+'" '+(required?'required':'')+'> '+e(label)+'</label>';
const confirmation=label=>'<div class="alert">'+check('confirmed',label,true)+'</div>';
const error='<div id="form-error" class="error" role="alert" hidden></div>';
const form=(body,submit)=>'<form id="intervention-form" class="form-stack">'+body+error+'<button type="submit" class="btn btn-primary">'+e(submit)+'</button></form>';
const staffOptions=ps=>ps.map(p=>[p.id,p.name]);
const nextDate=asOf=>{const d=new Date(asOf+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+7);return d.toISOString().slice(0,10);};
const reviewDate=(w,c)=>field('reviewDate','Review / next action date',c?.reviewDate>w.asOf?c.reviewDate:nextDate(w.asOf),'date');
const actionId=(id,action)=>JSON.stringify([id,action]);
export const caseActionId=actionId;
export function unpackCaseAction(value){
 const a=JSON.parse(value);if(!Array.isArray(a)||a.length!==2||a.some(v=>typeof v!=='string'))throw Error('Invalid intervention action');return a;
}
const actionButton=(c,action,kind='')=>btn(CASE_ACTION_LABELS[action],'case-action',actionId(c.id,action),kind);
const staff=ps=>e(ps.map(p=>p.name).join(', ')||'—');
function evidence(s){
 if(!s)return empty('No accessible academic summary');
 return facts([['Current attainment',e(pct(s.average))+' · '+e(s.grade??'—')],['Minimum target',e(s.minimumGrade??'—')],['Grade gap',e(gradeGap(s.gapToTarget))],['Prediction',e(s.predictedGrade??'—')],['Results scored',e(s.coverage.scored+'/'+s.coverage.eligible)],['Latest result',e(s.latest?pct(s.latest.percent)+' · '+s.latest.grade:'—')]])+
 '<p class="small muted">Calculated from the current assessment tracker. A low grade is evidence for discussion, not an automatic referral.</p>';
}
const stageStatus=c=>c.state==='closed'?'Closed':c.status;
const step=(n,label,c)=>{
 const pending=c.state==='wave'+n+'_requested',reached=c.wave>=n,active=c.state==='wave'+n;
 return '<div class="case-step '+(pending?'pending':active?'current':reached?'reached':'')+'"><span>'+n+'</span><div><strong>'+e(label)+'</strong><small>'+e(pending?'Requested':active?'Active':reached?'Recorded':'Not reached')+'</small></div></div>';
};
const referral=(r,actor,legacy)=>r?facts([['Trigger',e(r.trigger)],['Requested by',e(actor)],['Date',e(displayDate(r.date))]])+text(r.reason):text(legacy);
export function renderCase(w,id){
 const c=w.caseDetail(id),p=c.studyPlan,active=c.state!=='closed',permitted=c.actions.filter(a=>a!=='view');
 const priority=c.pending.map(a=>a.type);
 const actionOrder=[...new Set([...priority,...permitted])].filter(a=>a!=='view');
 const primary=actionOrder[0];
 const actions=active&&actionOrder.length?'<div class="case-action-strip">'+actionOrder.map(a=>actionButton(c,a,a===primary?'btn-primary':'')).join('')+'</div>':'<p class="small muted">'+(active?'Read only for your current responsibilities.':'Closed record — retained for reference.')+'</p>';
 const plan=p?facts([['Owner',e(p.owner)],['Review date',e(displayDate(p.reviewDate))],['Status',p.completedDate?tag('Achieved','tag-success'):!active?tag('Case closed'):p.reviewDate<=w.asOf?tag('Review due','tag-warning'):tag('Active')]])+
 '<strong>Measurable target</strong>'+text(p.target)+'<ul class="study-actions">'+p.actions.map(a=>'<li>'+e(a)+'</li>').join('')+'</ul>'+
 (p.evaluation?'<strong>Latest evaluation</strong>'+text(p.evaluation):'')+
 ((p.history??[]).length?'<details><summary>Study plan review history ('+p.history.length+')</summary>'+p.history.slice().reverse().map(h=>'<p><strong>'+e(displayDate(h.date)+' · '+h.actor+' · '+h.outcome)+'</strong>\n'+e(h.text)+'</p>').join('')+'</details>':''):empty('No individual study plan',c.actions.includes('saveStudyPlan')?'Create one using the action above.':'No plan has been recorded.');
 const house=c.houseRequest?'<strong>Assigned House support</strong>'+text(c.houseRequest)+facts([['Responsible staff',e(c.houseOwner)],['Status',c.houseResponse?.complete?tag('Completed','tag-success'):tag('Outstanding','tag-warning')]])+
 (c.houseResponse?'<strong>Latest response</strong>'+text(c.houseResponse.response)+'<p class="small muted">'+e(c.houseResponder+' · '+displayDate(c.houseResponse.date))+'</p>':'<p class="muted">Awaiting House response.</p>'):'';
 const history=c.history.slice().reverse().map(h=>'<article class="case-history-event"><div class="case-history-meta"><strong>'+e(h.action?CASE_ACTION_LABELS[h.action]??h.action:'Recorded event')+'</strong><span>'+e(displayDate(h.date)+' · '+h.actor)+'</span></div><p>'+e(h.text)+'</p>'+(h.plan?'<p class="small muted">Plan: '+e(h.plan)+'</p>':'')+(h.reviewDate?'<p class="small muted">Next review: '+e(displayDate(h.reviewDate))+'</p>':'')+'</article>').join('');
 return {title:c.studentName,sub:c.classInfo.name+' · '+c.id,body:
 '<div class="case-context">'+tag(stageStatus(c),active?'tag-warning':'tag-success')+(c.overdue?tag('Overdue','tag-danger'):c.due?tag('Due today','tag-warning'):'')+
 link('Student profile','open-student-support',c.student.id)+'</div><div class="case-steps">'+step(1,'Classroom',c)+step(2,'Faculty & House',c)+step(3,'Leadership',c)+'</div>'+
 facts([['Tutor group',e(c.student.tutorGroupId)],['House',e(c.house)],['Case owner',e(c.owner)],['Review date',e(displayDate(c.reviewDate))],['Opened',e(displayDate(c.openedDate))],['Updated',e(displayDate(c.updatedDate))]])+
 actions+section('Academic context',evidence(c.summary),'studentAverage')+
 section('Wave 1 · Classroom intervention','<strong>Initial concern</strong>'+text(c.reason)+'<div class="tags">'+(c.strategies??[]).map(s=>tag(s)).join('')+'</div><strong>Classroom plan</strong>'+text(c.wave1Plan??'No separate classroom plan recorded in this earlier demo case.'),'caseWorkflow')+
 (c.wave>=2?section('Wave 2 · Faculty and House','<strong>Referral evidence</strong>'+referral(c.wave2Referral,c.wave2Referrer,'Earlier demo referral; no separate reason recorded.')+'<strong>Faculty plan</strong>'+text(c.facultyPlan??'Awaiting faculty activation.')+house):'')+
 (c.wave>=3?section('Wave 3 · School leadership','<strong>Referral evidence</strong>'+referral(c.wave3Referral,c.wave3Referrer,'Earlier demo referral; no separate reason recorded.')+'<strong>Leadership plan</strong>'+text(c.leadershipPlan??'Awaiting leadership activation.')):'')+
 section('Individual study plan',plan,'studyPlan')+
 section('Responsible staff',facts([['Class teacher',staff(c.participants.teachers)],['Faculty lead',staff(c.participants.faculty)],['Head of House',staff(c.participants.house)],['Tutor',staff(c.participants.tutors)]]))+
 (c.evaluation?section(active?'Latest review evaluation':'Closure evaluation',text(c.evaluation)+(c.closedDate?'<p class="small muted">Closed '+e(displayDate(c.closedDate))+'</p>':'')):'')+
 section('Case history',history||empty('No recorded history'))+
 '<p class="stage-note">Academic support only. This fictional prototype does not create SIMS behaviour points, send emails, or store safeguarding records.</p>',
 footer:btn('Student profile','open-student-support',c.student.id,'btn-quiet')};
}
export function renderCaseStart(w,id){
 if(!id){
  const options=w.caseStartOptions().filter(o=>o.scoped);
  if(!options.length)throw Error('No pupils in this scope are eligible for a new Wave 1 case');
  return {title:'New intervention',sub:'Select an assigned pupil and subject',body:'<form id="case-select-form" class="form-stack">'+choose('enrolmentId','Student / teaching class',options.map(o=>[o.id,o.label]),options[0].id)+error+'<button type="submit" class="btn btn-primary">Continue</button></form><p class="stage-note">Existing active cases are omitted. Open the existing case to add support instead.</p>'};
 }
 const d=w.caseStartDetail(id);
 const strategies='<fieldset class="case-strategies"><legend>Classroom strategies (select at least one)</legend>'+STRATEGIES.map(s=>'<label class="check-field"><input type="checkbox" name="strategies" value="'+e(s)+'"> '+e(s)+'</label>').join('')+'</fieldset>';
 const direct='<details class="drawer-section case-extra"><summary>Serious concern — optional direct Wave 2 referral</summary><div class="content">'+
 check('directReferral','Request Wave 2 immediately for a serious concern')+area('referralReason','Reason for early referral (required if selected)','',false)+
 choose('ownerStaffId','Assigned faculty lead',staffOptions(d.participants.faculty),d.participants.faculty[0]?.id??'',false)+check('confirmed','Confirm early referral and handover')+'</div></details>';
 return {title:'Start Wave 1',sub:d.student.name+' · '+d.classInfo.code+' · '+d.classInfo.subject.name,body:
 section('Academic context',evidence(d.summary),'studentAverage')+
 form(area('reason','Academic concern and observed evidence')+strategies+area('plan','Specific classroom intervention and success measure')+reviewDate(w)+direct,'Save intervention')+
 '<p class="stage-note">Only fictional academic concerns. Discuss referrals using the approved school process; do not enter safeguarding or confidential details.</p>'};
}
export function renderCaseAction(w,value){
 const [id,action]=unpackCaseAction(value),c=w.caseDetail(id),p=c.studyPlan;
 if(!c.actions.includes(action)||action==='view')throw Error('Action not permitted for your role or this case stage');
 const title=CASE_ACTION_LABELS[action],context='<div class="case-context">'+tag(c.status,'tag-warning')+'<span class="small muted">Current owner: '+e(c.owner)+'</span>'+link('Full case record','open-case',id)+'</div>'+
 '<div class="info-box"><strong>Original concern</strong>'+text(c.reason)+(c.wave1Plan?'<p class="small">Classroom plan: '+e(c.wave1Plan)+'</p>':'')+(c.facultyPlan?'<p class="small">Faculty plan: '+e(c.facultyPlan)+'</p>':'')+(c.leadershipPlan?'<p class="small">Leadership plan: '+e(c.leadershipPlan)+'</p>':'')+'</div>';
 let fields='',submit=title;
 if(action==='requestWave2'||action==='requestWave3'){
  const w2=action==='requestWave2',triggers=w2?WAVE2_TRIGGERS:WAVE3_TRIGGERS,owners=w2?c.participants.faculty:c.participants.leadership;
  fields=choose('trigger','Reason for escalation',[['','Choose a trigger'],...triggers.map(t=>[t,t])])+area('reason','Evidence, previous support and reason for referral')+
   choose('ownerStaffId',w2?'Assigned faculty lead':'Assigned leadership reviewer',staffOptions(owners),owners[0]?.id??'')+reviewDate(w,c)+
   confirmation('Confirm this referral and transfer to the selected reviewer. Existing records and plans are retained.');
 }else if(action==='activateWave2'){
  fields=section('Referral',referral(c.wave2Referral,c.wave2Referrer,'Earlier demo referral; no separate reason recorded.'))+
   area('plan','Faculty intervention plan and success measure',c.facultyPlan??'')+
   area('houseRequest','Specific request for House / tutor support',c.houseRequest??'')+choose('houseOwnerStaffId','Responsible Head of House',staffOptions(c.participants.house),c.participants.house[0]?.id??'')+
   reviewDate(w,c)+confirmation('Confirm Wave 2 activation and assign the House request');
 }else if(action==='respondHouse'){
  fields=section('Assigned House request',text(c.houseRequest))+
   area('response','Response, action taken and next steps',c.houseResponse?.response??'')+
   choose('complete','Request status',[['false','Further action pending'],['true','Completed']],c.houseResponse?.complete?'true':'false');
 }else if(action==='respondLeadership'){
  fields=section('Referral',referral(c.wave3Referral,c.wave3Referrer,'Earlier demo referral; no separate reason recorded.'))+
   area('plan','Leadership intervention plan and success measure',c.leadershipPlan??'')+reviewDate(w,c)+confirmation('Confirm Wave 3 activation and leadership ownership');
 }else if(action==='review'){
  const current=c.wave===1?c.wave1Plan:c.wave===2?c.facultyPlan:c.leadershipPlan;
  fields=area('evaluation','Review evidence: impact and progress')+
   choose('outcome','Outcome',[['continue','Continue current intervention'],['revise','Revise intervention'],['resolved','Resolved — close case']],'continue')+
   '<div class="case-review-fields">'+reviewDate(w,c)+area('plan','Revised plan (required only for Revise)',current??'',false)+'</div>'+
   '<p class="small muted">Continue or Revise needs a future review date. Escalate using the separate referral action. Closing requires a resolved outcome and completed House request, if applicable.</p>'+
   confirmation('Confirm review outcome and update the shared record');
 }else if(action==='update'){
  fields=area('text','Academic progress update / agreed next step');
 }else if(action==='saveStudyPlan'){
  fields='<p class="small muted">You become the responsible study-plan owner. Enter a specific, measurable target and one short action per line, with who will do it.</p>'+
   area('target','Measurable target',p?.target??'',true,3,1000)+area('actions','Study actions (one per line)',p?.actions.join('\n')??'',true,5)+
   reviewDate(w,p)+(p?.completedDate?confirmation('Confirm reopening the achieved study plan'):'');
 }else if(action==='reviewStudyPlan'){
  fields=section('Current study plan','<strong>Target</strong>'+text(p.target)+'<ul class="study-actions">'+p.actions.map(a=>'<li>'+e(a)+'</li>').join('')+'</ul>')+
   area('evaluation','Evaluation against the study target')+
   choose('outcome','Outcome',[['continue','Continue plan'],['revise','Revise plan'],['achieved','Target achieved']],'continue')+
   reviewDate(w,p)+area('target','Revised target (required for Revise)',p.target,false,3,1000)+area('actions','Revised actions (one per line, for Revise)',p.actions.join('\n'),false,5)+
   confirmation('Confirm study plan review. This does not close the case.');
 }else throw Error('Unknown intervention action');
 return {title,sub:c.studentName+' · '+c.classInfo.code+' · '+c.id,body:context+section('Current academic evidence',evidence(c.summary),'studentAverage')+form(fields,submit)};
}
export function caseFormInput(form,action){
 const get=k=>String(form.get(k)??'');
 return {reason:get('reason'),plan:get('plan'),strategies:form.getAll('strategies').map(String),reviewDate:get('reviewDate'),
  directReferral:form.has('directReferral'),referralReason:get('referralReason'),trigger:action==='startWave1'?WAVE2_TRIGGERS[2]:get('trigger'),
  ownerStaffId:get('ownerStaffId'),houseOwnerStaffId:get('houseOwnerStaffId'),houseRequest:get('houseRequest'),response:get('response'),
  complete:get('complete')==='true',evaluation:get('evaluation'),outcome:get('outcome'),text:get('text'),
  target:get('target'),actions:get('actions').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),confirmed:form.has('confirmed')};
}
