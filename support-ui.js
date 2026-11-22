/* Accessible fictional intervention workspace UI. Uses server-independent demo case model. */
(function(){
 'use strict';
 const data=window.SchoolHubData,Access=window.SchoolHubAccess,Support=window.SchoolHubSupport;
 if(!data||!Access||!Support)return;
 const state={modal:null,caseId:null,studentId:null,classId:null,form:null,filter:'actions',error:''};
 const clean=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const person=id=>data.students.find(x=>x.id===id);
 const group=id=>data.classes.find(x=>x.id===id);
 const fmt=date=>date&&/^\d{4}-\d\d-\d\d$/.test(date)?new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):date||'—';
 const stageLabel=c=>Support.states[c.state]||c.state;
 const stageNumber=c=>c.wave||1;
 const caseFor=(studentId,classId)=>Support.activeFor(studentId,classId);
 const button=(label,action,id='',kind='light',extra='')=>
   '<button class="btn btn-'+kind+'" data-action="'+action+'" '+(id?'data-id="'+clean(id)+'"':'')+' '+extra+'>'+label+'</button>';
 const chip=(t,cls='')=>'<span class="tag '+cls+'">'+clean(t)+'</span>';
 function context(){
   return {viewer:Access.viewer(),visible:Support.visible(Access.viewer()),queue:Support.queues(Access.viewer())};
 }
 function caseFlags(studentId,classId){
   const c=caseFor(studentId,classId);
   if(!c)return [];
   return c.wave===1?['W1']:c.wave===2?['SOC','W2']:['SOC','W3'];
 }
 function caseRow(c,icon){
   const s=person(c.studentId),g=group(c.classId),hasAction=context().queue.some(x=>x.caseId===c.id);
   return '<button class="support-case-row" data-action="support-open" data-id="'+c.id+'">'+
     '<span class="support-student"><strong>'+clean(s?.name||'Student')+'</strong><small>'+clean(g?.id||'')+' · '+clean(g?.faculty||'')+' · '+clean(s?.house||'')+' House</small></span>'+
     '<span class="support-wave wave-'+stageNumber(c)+'">'+stageLabel(c)+'</span>'+
     '<span class="support-case-topic">'+clean(c.wave1.focus)+'</span>'+
     '<span class="support-next">'+(hasAction?'<span class="support-needs-action">Action in your scope</span>':'<span class="support-muted">View shared record</span>')+'</span>'+
     icon('chevron',15)+'</button>';
 }
 function dashboard({icon}){
   const {viewer,visible,queue}=context();
   const filtered=state.filter==='actions'?visible.filter(c=>queue.some(x=>x.caseId===c.id)):
     state.filter==='all'?visible:visible.filter(c=>c.wave===Number(state.filter));
   const counts={w1:visible.filter(c=>c.wave===1).length,w2:visible.filter(c=>c.wave===2).length,
     w3:visible.filter(c=>c.wave===3).length};
   return '<div class="page-intro"><div><p class="eyebrow">Shared student support</p><h1 class="page-title">Intervention overview</h1>'+
    '<p class="subtitle">One record from class teacher to faculty, House and leadership · Fictional data</p></div>'+
    '<div class="page-controls">'+chip(queue.length+' relevant actions','teal')+'</div></div>'+
    '<div class="support-dashboard-head">'+
    '<div class="support-summary-stat"><strong>'+queue.length+'</strong><span>Needs your attention</span></div>'+
    '<div class="support-summary-stat"><strong>'+counts.w1+'</strong><span>Wave 1 · Class</span></div>'+
    '<div class="support-summary-stat"><strong>'+counts.w2+'</strong><span>Wave 2 · Faculty/House</span></div>'+
    '<div class="support-summary-stat"><strong>'+counts.w3+'</strong><span>Wave 3 · Leadership</span></div></div>'+
    '<div class="support-filter-bar"><div class="class-filters" role="group" aria-label="Intervention filter">'+
    [['actions','My actions'],['all','All in my scope'],['1','Wave 1'],['2','Wave 2'],['3','Wave 3']].map(([key,label])=>
      '<button class="class-filter '+(state.filter===key?'active':'')+'" data-action="support-filter" data-id="'+key+'" aria-pressed="'+(state.filter===key)+'">'+label+'</button>').join('')+
    '</div><span class="small-muted">'+filtered.length+' record(s)</span></div>'+
    '<section class="surface support-list"><div class="support-list-caption">Students are shown only when a demo role provides relevant access. Multi-role staff see a combined queue.</div>'+
    (filtered.length?filtered.map(c=>caseRow(c,icon)).join(''):
      '<div class="empty-state">'+icon('check',23)+'<strong>No interventions in this view</strong><p>Choose another filter to see accessible cases.</p></div>')+'</section>'+
    '<div class="support-footnote">'+icon('info',14)+' Wave 2 and Wave 3 are deliberate staff hand-offs. SIMS reporting and automated notifications are not connected in this prototype.</div>';
 }
 function homeQueue({icon}){
   const q=context().queue.slice(0,3);
   return '<div class="support-home-queue">'+(q.length?q.map(t=>
     '<button class="support-home-action" data-action="support-open" data-id="'+t.caseId+'"><span class="support-home-dot"></span>'+
     '<span><strong>'+clean(t.title)+'</strong><small>'+clean(t.student)+' · '+clean(t.classId)+'</small></span>'+icon('chevron',14)+'</button>').join(''):
     '<p class="tiny-copy">No intervention actions are pending in your demo scope.</p>')+
     '</div>';
 }
 function studentPanel(studentId,classId,icon){
   const s=person(studentId),g=group(classId),c=caseFor(studentId,classId),viewer=Access.viewer();
   if(!Access.canViewStudent(viewer,s,data.classes))return '';
   if(c&&!Access.canViewCase(viewer,c,s,g)){
     return '<div class="support-mini"><p class="tiny-copy">An intervention is recorded, but its detailed case history is outside your current demo role scope.</p></div>';
   }
   if(!c)return '<div class="support-mini"><p class="tiny-copy">No active wave intervention for this subject.</p>'+
     (Access.canStartWave1(viewer,g)?button('Tag for Wave 1','support-start',studentId,'soft','data-class-id="'+clean(classId)+'"'):'')+'</div>';
   const allowed=Access.canRequestWave2(viewer,c,g);
   return '<div class="support-mini"><div class="support-mini-row">'+
     '<span class="support-wave wave-'+stageNumber(c)+'">'+clean(stageLabel(c))+'</span>'+
     button('Open shared record','support-open',c.id,'light')+'</div>'+
     '<div class="support-mini-focus">'+clean(c.wave1.focus)+'</div>'+
     '<div class="support-mini-row"><span class="small-muted">Current review date · '+fmt(c.state==='wave1'?c.wave1.reviewDate:c.state==='wave2'?c.wave2?.reviewDate:c.wave3?.reviewDate)+'</span>'+
     (allowed?button('Request Wave 2','support-form-wave2',c.id,'soft'):'')+'</div></div>';
 }
 const roleAction=(c,v)=>{
   const s=person(c.studentId),g=group(c.classId),arr=[];
   if(Access.canRequestWave2(v,c,g))arr.push(['Request Wave 2','support-form-wave2','soft']);
   if(Access.canActivateWave2(v,c,g))arr.push(['Complete Wave 2 plan','support-form-activate','primary']);
   if(Access.canRespondHouse(v,c,s))arr.push(['Respond to House request','support-form-house','primary']);
   if(Access.canEscalateWave3(v,c,s,g))arr.push(['Escalate to Wave 3','support-form-wave3','light']);
   if(Access.canRespondLeadership(v,c))arr.push(['Leadership response','support-form-leadership','primary']);
   if(Access.canAddUpdate(v,c,s,g))arr.push(['Record review / update','support-form-review','light']);
   return arr;
 };
 function detailView(c,icon){
   const s=person(c.studentId),g=group(c.classId),v=Access.viewer(),
     timeline=[...c.history].reverse();
   const heading=(title,body,extra='')=>'<section class="support-section '+extra+'"><h3>'+title+'</h3>'+body+'</section>';
   const itemText=(label,value)=>'<div class="support-fact"><span>'+label+'</span><strong>'+clean(value||'—')+'</strong></div>';
   const strategyList=(items)=>items?.length?'<div class="support-strategies">'+items.map(x=>chip(x,'blue')).join('')+'</div>':'<p class="tiny-copy">No selected suggestions</p>';
   let content='<div class="support-stage-track">'+[1,2,3].map(i=>
     '<div class="support-stage-item '+(c.wave>=i?'done':'')+'"><span>W'+i+'</span><strong>'+(['Classroom','Faculty / House','Leadership'][i-1])+'</strong></div>').join('')+'</div>'+
     '<div class="support-meta-grid">'+itemText('Subject / class',g?.faculty+' · '+g?.id)+itemText('House',s?.house)+
     itemText('Form / tutor group',s?.form)+itemText('Last update',c.updatedAt)+'</div>'+
     heading('Wave 1 · Class teacher','<div class="support-detail-title">'+clean(c.wave1.focus)+'</div><p>'+clean(c.wave1.description)+'</p>'+
       strategyList(c.wave1.strategies)+itemText('Wave 1 review',fmt(c.wave1.reviewDate)))+
     (c.wave>=2?heading('Wave 2 · Faculty and House',
       (c.requestTrigger?itemText('Request trigger',c.requestTrigger):'')+
       (c.requestReason?'<p><strong>Teacher explanation:</strong> '+clean(c.requestReason)+'</p>':'')+
       (c.wave2?'<div class="support-detail-title">Faculty plan</div><p>'+clean(c.wave2.plan)+'</p>'+
         strategyList(c.wave2.strategies)+
         '<div class="support-house-request"><strong>Requested from Housemaster/mistress</strong><p>'+clean(c.wave2.houseRequest)+'</p></div>'+
         '<div class="support-house-response"><strong>House response</strong><p>'+clean(c.houseResponse?.response||'Awaiting response')+'</p>'+
         chip(c.houseResponse?.complete?'Completed':'Pending',c.houseResponse?.complete?'teal':'amber')+'</div>'+
         itemText('Review date',fmt(c.wave2.reviewDate)):
         '<div class="support-awaiting">Awaiting the relevant Head of Faculty to complete the Wave 2 plan and House request.</div>')):'')+
     (c.wave>=3?heading('Wave 3 · School Leadership','<p>'+clean(c.wave3?.reason||'')+'</p>'+
       (c.wave3?.plan?'<div class="support-detail-title">Leadership plan</div><p>'+clean(c.wave3.plan)+'</p>'+
         itemText('Review date',fmt(c.wave3.reviewDate)):
         '<div class="support-awaiting">Awaiting leadership intervention and review arrangements.</div>')):'')+
     (c.reviews.length?heading('Reviews & outcomes',c.reviews.map(r=>'<div class="support-review"><strong>'+clean(r.outcome)+'</strong>'+
       '<span>'+clean(r.date)+' · '+clean(r.actor)+'</span><p>'+clean(r.note)+'</p></div>').join('')):'')+
     heading('Shared intervention history','<div class="support-timeline">'+timeline.map(event=>
       '<div class="support-history-item"><span class="support-history-mark"></span><div>'+
       '<strong>'+clean(event.actor)+'</strong><small>'+clean(event.date)+' · '+clean(event.roles)+'</small>'+
       '<p>'+clean(event.text)+'</p></div></div>').join('')+'</div>','support-history-section');
   return '<div class="support-case-hero"><div><p class="eyebrow">Shared case · '+clean(c.id)+'</p>'+
     '<h2 id="support-modal-title">'+clean(s.name)+'</h2><p>'+clean(g.name)+' · '+clean(s.house)+' House</p></div>'+
     '<span class="support-wave wave-'+stageNumber(c)+'">'+clean(stageLabel(c))+'</span></div>'+
     '<div class="support-case-content">'+content+'</div>'+
     '<div class="support-modal-foot"><button class="btn btn-light" data-action="support-close">Close</button>'+
       '<div>'+roleAction(c,v).map(([label,action,kind])=>button(label,action,c.id,kind)).join('')+'</div></div>';
 }
 const textarea=(name,label,placeholder,required=true)=>
   '<label class="support-field"><span>'+label+'</span><textarea name="'+name+'" rows="3" maxlength="900" placeholder="'+clean(placeholder)+'" '+(required?'required':'')+'></textarea></label>';
 const textInput=(name,label,placeholder)=>
   '<label class="support-field"><span>'+label+'</span><input name="'+name+'" type="text" maxlength="220" placeholder="'+clean(placeholder)+'" required></label>';
 const reviewDate=(name='reviewDate')=>'<label class="support-field"><span>Review date</span><input type="date" name="'+name+'" value="2026-12-04" required></label>';
 const strategyChecks=(key,list)=>
   '<fieldset class="support-suggestion-field"><legend>Suggested strategies <span>(optional; select any)</span></legend>'+
     list.map((x,i)=>'<label><input name="'+key+'" type="checkbox" value="'+clean(x.name)+'">'+
       '<span>'+clean(x.name)+'</span><small>'+clean(x.group)+'</small></label>').join('')+'</fieldset>';
 function formView(kind,c,icon){
   const s=person(state.studentId||c?.studentId),g=group(state.classId||c?.classId);
   let title='',desc='',body='';
   if(kind==='wave1'){
     title='Start Wave 1';desc='Class teacher · Record a specific classroom intervention and review.';
     body=textInput('focus','Specific area of concern','e.g. Uncertain with algebraic rearrangement')+
       textarea('description','What will you do in class?','Describe the targeted support, how often and how you will judge progress.')+
       strategyChecks('strategies',Support.strategies.wave1)+reviewDate()+
       '<label class="support-checkbox-switch"><input name="requiresWave2" id="support-requires-wave2" type="checkbox">'+
       '<span><strong>Requires Wave 2 intervention</strong><small>Request Head of Faculty involvement as part of this submission.</small></span></label>'+
       '<div class="support-conditional" id="support-wave2-extra" hidden>'+
       '<div class="support-warning">Wave 2 is a referral to the Head of Faculty, not an automatic escalation. Existing SIMS records must still be updated via the approved school process.</div>'+
       '<label class="support-field"><span>Reason for requesting Wave 2</span><select name="trigger">'+
       Support.strategies.triggers.map(t=>'<option>'+clean(t)+'</option>').join('')+'</select></label>'+
       textarea('reason','Why is Wave 2 needed?','Describe what has been tried and why faculty / house help is required.',false)+
       '<label class="support-confirm"><input type="checkbox" name="confirmEscalation"> I have reviewed this referral and intend to notify the Head of Faculty.</label></div>';
   }else if(kind==='wave2'){
     title='Request Wave 2';desc='Class teacher · Explain why faculty intervention is required.';
     body='<div class="support-warning">Only the relevant Head of Faculty can activate Wave 2 and request House actions. This step creates a request for review.</div>'+
       '<label class="support-field"><span>Reason for moving to Wave 2</span><select name="trigger">'+
       Support.strategies.triggers.map(t=>'<option>'+clean(t)+'</option>').join('')+'</select></label>'+
       textarea('reason','What have you tried, and what needs to change?','Describe Wave 1 actions, impact and why further intervention is needed.')+
       '<label class="support-confirm"><input type="checkbox" name="confirmEscalation" required> I confirm this Wave 2 referral is intentional.</label>';
   }else if(kind==='activate'){
     title='Complete Wave 2 plan';desc='Head of Faculty · Coordinate faculty action and hand off to the relevant House.';
     body='<div class="support-info">In the school guidance, the HoF works with the class teacher and key-stage coordinator. The relevant tutor and House team are notified.</div>'+
       textarea('plan','Faculty intervention plan','Which actions will the faculty take, with whom, and how will progress be reviewed?')+
       strategyChecks('strategies',Support.strategies.wave2)+
       textarea('houseRequest','Specific action requested from Housemaster/mistress','e.g. Contact tutor, discuss the wider picture, coordinate a home response.')+
       reviewDate()+
       '<label class="support-confirm"><input type="checkbox" name="confirmEscalation" required> I have agreed the faculty plan and reviewed the requested House action.</label>';
   }else if(kind==='house'){
     title='Respond to House request';desc='Housemaster / Housemistress · Record what the House will do or has done.';
     body='<div class="support-info">'+clean(c.wave2?.houseRequest||'No house request recorded')+'</div>'+
       textarea('response','House response and actions','Explain what you agreed with the tutor, family or other colleagues.')+
       '<label class="support-confirm"><input type="checkbox" name="complete"> Mark the requested House action complete.</label>';
   }else if(kind==='wave3'){
     title='Escalate to Wave 3';desc='Head of Faculty or relevant Housemaster/mistress · Refer to School Leadership.';
     body='<div class="support-warning">Wave 3 is for unsuccessful intervention, a persistent issue, or wider concerns requiring leadership. Do not use this instead of the approved urgent safeguarding route.</div>'+
       textarea('reason','Why is School Leadership needed?','Summarise the Wave 1 and Wave 2 actions, outcomes and any wider concerns.')+
       '<label class="support-confirm"><input type="checkbox" name="confirmEscalation" required> I have reviewed the case and intend to request School Leadership intervention.</label>';
   }else if(kind==='leadership'){
     title='Leadership intervention';desc='School Leadership · Record the coordinated Wave 3 plan.';
     body=textarea('plan','Leadership intervention and owner','Outline the actions, responsible staff and intended outcome.')+reviewDate()+
       '<label class="support-confirm"><input type="checkbox" name="confirmEscalation" required> Confirm leadership plan.</label>';
   }else if(kind==='review'){
     title='Record a review';desc='Relevant staff · Keep one shared history with outcomes and next steps.';
     body='<label class="support-field"><span>Review outcome</span><select name="outcome">'+
       ['Further monitoring','Improving','No improvement','Resolved'].map(x=>'<option>'+x+'</option>').join('')+'</select></label>'+
       textarea('note','Evidence and next step','Record an objective update on what has improved or what still needs action.')+
       '<label class="support-confirm"><input type="checkbox" name="close"> Close the intervention if the review outcome is Resolved.</label>';
   }
   return '<div class="support-form-hero"><p class="eyebrow">Student support workflow</p><h2 id="support-modal-title">'+title+'</h2>'+
     '<p>'+clean(s?.name||'Student')+' · '+clean(g?.name||'')+'</p><small>'+clean(desc)+'</small></div>'+
     '<form id="support-form" data-kind="'+kind+'"><div class="support-form-body">'+
     (state.error?'<div class="support-form-error" role="alert">'+clean(state.error)+'</div>':'')+
     body+'</div><div class="support-modal-foot"><button type="button" class="btn btn-light" data-action="'+(kind==='wave1'?'support-close':'support-back')+'">Cancel</button>'+
     '<button type="submit" class="btn btn-primary">'+(kind==='wave1'?'Save Wave 1':kind==='review'?'Record review':'Confirm and hand off')+'</button></div></form>';
 }
 function modalHTML(icon){
   if(!state.modal)return '';
   const c=Support.findCase(state.caseId);
   const content=state.modal==='detail'&&c?detailView(c,icon):state.modal==='form'?
     formView(state.form,c,icon):'';
   return '<div class="support-backdrop" data-action="support-close"></div>'+
     '<div class="support-dialog" role="dialog" aria-modal="true" aria-labelledby="support-modal-title">'+
     '<button class="support-dialog-close" data-action="support-close" aria-label="Close intervention">✕</button>'+
     content+'</div>';
 }
 function action(action,el,ctx){
   if(!action?.startsWith('support-'))return false;
   const id=el?.dataset?.id||'',v=Access.viewer(),c=Support.findCase(id);
   const s=c&&person(c.studentId),g=c&&group(c.classId);
   const setForm=(kind,inc)=>{
     state.modal='form';state.form=kind;state.error='';
     if(inc){state.caseId=inc.id;state.studentId=inc.studentId;state.classId=inc.classId;}
     ctx.render({wizardTop:true});
   };
   if(action==='support-filter'){state.filter=id;ctx.render();return true;}
   if(action==='support-close'){state.modal=null;state.form=null;state.error='';ctx.render();return true;}
   if(action==='support-back'){state.modal='detail';state.form=null;state.error='';ctx.render();return true;}
   if(action==='support-open'){
     if(!c||!Access.canViewCase(v,c,s,g)){ctx.notify('Intervention not accessible in this demo role');return true;}
     state.caseId=c.id;state.modal='detail';state.form=null;state.error='';ctx.render();return true;
   }
   if(action==='support-start'){
     const pupil=person(id),klass=group(el?.dataset?.classId||pupil?.classId);
     if(!Access.canStartWave1(v,klass)){ctx.notify('Only the class teacher can start Wave 1');return true;}
     state.caseId=null;state.studentId=id;state.classId=klass.id;setForm('wave1');return true;
   }
   const kind={
     'support-form-wave2':'wave2','support-form-activate':'activate',
     'support-form-house':'house','support-form-wave3':'wave3',
     'support-form-leadership':'leadership','support-form-review':'review'
   }[action];
   if(kind&&c){
     const permissions={wave2:Access.canRequestWave2(v,c,g),activate:Access.canActivateWave2(v,c,g),
       house:Access.canRespondHouse(v,c,s),wave3:Access.canEscalateWave3(v,c,s,g),
       leadership:Access.canRespondLeadership(v,c),review:Access.canAddUpdate(v,c,s,g)};
     if(!permissions[kind]){ctx.notify('This action is not allowed for your current demo roles');return true;}
     setForm(kind,c);
     return true;
   }
   return true;
 }
 function onChange(event){
   if(!state.modal)return false;
   if(event.target?.id==='support-requires-wave2'){
     const extra=document.getElementById('support-wave2-extra');
     if(extra)extra.hidden=!event.target.checked;
     return true;
   }
   return false;
 }
 function onSubmit(event,ctx){
   if(event.target?.id!=='support-form')return false;
   event.preventDefault();
   const form=event.target,kind=form.dataset.kind,v=Access.viewer(),fd=new FormData(form);
   const val=n=>String(fd.get(n)||'').trim();
   const strategies=key=>fd.getAll(key).map(String);
   const confirmed=()=>fd.get('confirmEscalation')==='on';
   let result;
   if(kind==='wave1'){
     const requireSecond=fd.get('requiresWave2')==='on';
     if(requireSecond&&(!confirmed()||!val('reason'))){
       state.error='Confirm the Wave 2 referral and provide a written explanation.';ctx.render();return true;
     }
     result=Support.startWave1(v,state.studentId,state.classId,
       {focus:val('focus'),description:val('description'),strategies:strategies('strategies'),reviewDate:val('reviewDate')});
     if(result.ok&&requireSecond){
       result=Support.requestWave2(v,result.case.id,{reason:val('reason'),trigger:val('trigger')});
     }
   }else if(kind==='wave2'){
     if(!confirmed())result={ok:false,error:'Confirm this referral before sending it.'};
     else result=Support.requestWave2(v,state.caseId,{reason:val('reason'),trigger:val('trigger')});
   }else if(kind==='activate'){
     if(!confirmed())result={ok:false,error:'Confirm the faculty and House hand-off.'};
     else result=Support.activateWave2(v,state.caseId,
       {plan:val('plan'),houseRequest:val('houseRequest'),strategies:strategies('strategies'),reviewDate:val('reviewDate')});
   }else if(kind==='house'){
     result=Support.respondHouse(v,state.caseId,{response:val('response'),complete:fd.get('complete')==='on'});
   }else if(kind==='wave3'){
     if(!confirmed())result={ok:false,error:'Confirm the leadership escalation.'};
     else result=Support.requestWave3(v,state.caseId,{reason:val('reason')});
   }else if(kind==='leadership'){
     if(!confirmed())result={ok:false,error:'Confirm the leadership plan.'};
     else result=Support.respondLeadership(v,state.caseId,{plan:val('plan'),reviewDate:val('reviewDate')});
   }else if(kind==='review'){
     result=Support.review(v,state.caseId,{outcome:val('outcome'),note:val('note'),close:fd.get('close')==='on'});
   }
   if(!result?.ok){
     state.error=result?.error||'Unable to record this action.';
     const body=document.querySelector('#support-form .support-form-body');
     if(body){
       const existing=body.querySelector('.support-form-error');
       if(existing)existing.textContent=state.error;
       else body.insertAdjacentHTML('afterbegin','<div class="support-form-error" role="alert">'+clean(state.error)+'</div>');
     }
     return true;
   }
   state.caseId=result.case.id;state.studentId=result.case.studentId;state.classId=result.case.classId;
   state.form=null;state.error='';state.modal='detail';
   ctx.render();ctx.notify(result.message);return true;
 }
 window.SchoolHubSupportUI={dashboard,homeQueue,studentPanel,caseFlags,caseFor,modalHTML,
   action,onChange,onSubmit,isOpen:()=>!!state.modal,close:()=>{state.modal=null;state.form=null;}};
})();
