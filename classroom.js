/* Classroom assessment prototype — synthetic data only, all changes reset on refresh.
   Production roles, flags and exclusions MUST be enforced server-side. */
(function () {
  'use strict';
  const fixture=window.SchoolHubData, core=window.SchoolHubAssessmentCore;
  if (!fixture||!core) return;
  const roleName='Sam Taylor';
  const flagMap={
    S001:['EAL'],S002:['SOC'],S003:['SEN'],S004:['SEN','SOC'],
    S005:['EAL'],S007:['EAL'],S008:['SOC'],S011:['SEN'],
    S012:['EAL'],S014:['EAL','SOC']
  };
  const all=[];
  let newIdSequence=0;
  const state={filter:'All',assessmentId:null,wizard:null,removeIndex:null,markFocus:null};
  const flags=s=>flagMap[s.id]||[];
  const pupilsFor=id=>fixture.students.filter(s=>s.classId===id);
  const assessmentsFor=id=>all.filter(a=>a.classId===id).sort((a,b)=>b.date.localeCompare(a.date));
  const displayMark=value=>value===null?'—':String(value);
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labelFor=mode=>mode==='questions'?'Question':'Topic';
  const percent=p=>p===null?'—':p+'%';
  const flagHTML=(p)=>flags(p).map(f=>'<span class="class-flag flag-'+f.toLowerCase()+'" title="'+
    (f==='EAL'?'English as an Additional Language':f==='SEN'?'Special Educational Needs':'Student of Concern (restricted details)')+
    '" aria-label="'+(f==='SOC'?'Student of Concern':f)+'">'+f+'</span>').join('');
  const dateHuman=date=>{if(!date)return '';const d=new Date(date+'T12:00:00');return Number.isNaN(d.getTime())?date:
    d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});};
  const item=(id,label,max,topic,ao)=>({id,label,maxMarks:max,topic:topic||label,ao:ao||'AO1'});
  const initialItems=mode=>mode==='questions'?[item('I1','Q1',4,'Number','AO1'),item('I2','Q2',6,'Algebra','AO2')]:
    [item('I1','Algebra',10,'Algebra','AO1'),item('I2','Geometry',10,'Geometry','AO1')];
  function distribute(total,items,seed) {
    const max=core.maxTotal({items});let remain=Math.max(0,Math.min(max,Math.round(total)));
    const marks=items.map((it,i)=>{
      const bias=((seed+i*3)%5-2)*0.08;
      return Math.min(Number(it.maxMarks),Math.max(0,Math.floor(remain * (Number(it.maxMarks)/max)*(1+bias))));
    });
    let assigned=marks.reduce((x,y)=>x+y,0);
    // Deterministically distribute remaining marks without exceeding any maximum.
    let cursor=seed%items.length;
    while(assigned<remain){
      if(marks[cursor]<Number(items[cursor].maxMarks)){marks[cursor]++;assigned++;}
      cursor=(cursor+1)%items.length;
    }
    return Object.fromEntries(items.map((it,i)=>[it.id,marks[i]]));
  }
  function seedAssessment(classId,index) {
    const definitions=[
      {title:'November checkpoint',date:'2026-11-18',type:'Topic test',mode:'topics',
        items:[item('I1','Algebra',12),item('I2','Graphs',8),item('I3','Geometry',10)]},
      {title:'October problem-solving paper',date:'2026-10-21',type:'End-of-unit',mode:'questions',
        items:[item('I1','Q1',3,'Number','AO1'),item('I2','Q2',4,'Algebra','AO1'),
          item('I3','Q3',5,'Algebra','AO2'),item('I4','Q4',6,'Graphs','AO2'),item('I5','Q5',7,'Geometry','AO3')]},
      {title:'September diagnostic',date:'2026-09-16',type:'Quiz',mode:'topics',
        items:[item('I1','Number',10),item('I2','Algebra',10)]}
    ];
    const d=definitions[index],a={
      id:'DEMO-'+classId+'-'+index,classId,title:d.title,date:d.date,type:d.type,
      mode:d.mode,items:core.clone(d.items),scores:{},excludedStudents:{},
      includeInSummary:index!==2,exclusionReason:index===2?'Diagnostic only; kept visible for comparison, excluded from aggregate.':'',
      status:'Published',version:1,
      history:[{when:'Demo seed',who:'Prototype',change:'Created synthetic example'}]
    };
    pupilsFor(classId).forEach((p,i)=>{
      const measure=index===0?p.score:index===1?p.previous:Math.max(35,p.previous-4);
      a.scores[p.id]=distribute(measure/100*core.maxTotal(a),a.items,i+index*2);
    });
    if(classId==='11MA1'&&index===1)a.excludedStudents.S004='Absent for this assessment';
    return a;
  }
  fixture.classes.forEach(c=>{for(let i=0;i<3;i++)all.push(seedAssessment(c.id,i));});
  state.assessmentId=all[0]?.id||null;

  function metricsRow(classId) {
    const pupils=pupilsFor(classId),a=assessmentsFor(classId),summary=core.summaryStats(a,pupils);
    return '<div class="class-summary-bar"><div><strong>'+pupils.length+'</strong><span>Students</span></div>'+
      '<div><strong>'+pupils.filter(p=>flags(p).includes('EAL')).length+'</strong><span>EAL</span></div>'+
      '<div><strong>'+pupils.filter(p=>flags(p).includes('SEN')).length+'</strong><span>SEN</span></div>'+
      '<div><strong>'+pupils.filter(p=>flags(p).includes('SOC')).length+'</strong><span>SOC</span></div>'+
      '<div class="summary-highlight"><strong>'+percent(summary.mean)+'</strong><span>Summary mean · '+summary.usedAssessments+' included</span></div></div>';
  }

  function renderRegister(ctx) {
    const {classId,icon,avatar}=ctx, allPupils=pupilsFor(classId), a=assessmentsFor(classId).slice(0,3);
    const shown=allPupils.filter(p=>state.filter==='All'||flags(p).includes(state.filter));
    const controls=['All','EAL','SEN','SOC'].map(f=>'<button class="class-filter '+(state.filter===f?'active':'')+
      '" data-action="class-filter" data-id="'+f+'" aria-pressed="'+(state.filter===f)+'">'+f+'</button>').join('');
    let h=metricsRow(classId)+'<div class="class-subtoolbar"><div class="class-filters" role="group" aria-label="Filter pupils by flag">'+controls+'</div>'+
      '<div class="class-legend"><span class="class-flag flag-eal">EAL</span> English additional language <span class="class-flag flag-sen">SEN</span> Additional needs <span class="class-flag flag-soc">SOC</span> Student of concern</div></div>';
    h+='<section class="surface register-surface"><div class="register-scroll"><table class="data-table class-register">'+
      '<thead><tr><th class="sticky-name">Student <span class="small-muted">('+shown.length+')</span></th><th>Flags</th>'+
      a.map(x=>'<th><button class="assess-column-head" data-action="assess-open-analysis" data-id="'+safe(x.id)+'">'+safe(x.title)+
        (x.includeInSummary===false?' <span class="mini-excluded">Not in summary</span>':'')+'</button></th>').join('')+
      '<th>Next step</th></tr></thead><tbody>'+
      shown.map(p=>'<tr><td class="sticky-name"><button class="register-student" data-action="open-student" data-id="'+p.id+'">'+
        avatar(p.name,'sm',p.year===10?'lavender':p.year===12?'green':'')+'<span><strong>'+safe(p.name)+'</strong><small>'+safe(p.form)+'</small></span></button></td>'+
      '<td><div class="flag-group">'+flagHTML(p)+'</div></td>'+
      a.map(x=>{const r=core.resultFor(x,p.id);return '<td><span class="mark-cell '+r.status+'" title="'+(r.status==='excluded'?'Explicitly excluded':r.status)+'">'+
        (r.status==='scored'?percent(r.percent):r.status==='excluded'?'Excluded':r.status==='unmarked'?'—':'Partial')+'</span></td>';}).join('')+
      '<td><button class="table-action" data-action="open-student" data-id="'+p.id+'">Profile '+icon('chevron',13)+'</button></td></tr>').join('')+
      '</tbody></table></div></section>';
    h+='<div class="class-footer-note">'+icon('info',14)+' <span>Flags are read-only in this demonstration. Assessment data can be edited; a live version must enforce permissions and restrict SOC details.</span>'+
      '<button class="btn-link" data-action="class-new-assessment">New assessment '+icon('plus',13)+'</button></div>';
    return h;
  }

  function renderAssessmentList(ctx) {
    const {classId,icon}=ctx,pupils=pupilsFor(classId),a=assessmentsFor(classId);
    let h=metricsRow(classId)+'<section class="surface assessment-list"><div class="list-row assessment-list-head">'+
      '<div><div class="row-title">Assessments for '+safe(classId)+'</div><div class="row-sub">Create by topic or question · reopen to edit marks and settings</div></div>'+
      '<button class="btn btn-primary" data-action="class-new-assessment">'+icon('plus',14)+' New assessment</button></div>';
    for(const x of a) {
      const stats=core.assessmentStats(x,pupils);
      h+='<div class="assessment-row"><div class="assessment-row-main"><div class="assessment-row-title">'+safe(x.title)+'</div>'+
        '<div class="assessment-row-sub">'+dateHuman(x.date)+' · '+safe(x.type)+' · '+(x.mode==='questions'?'Question-level':'Topic-level')+
        ' · '+x.items.length+' '+(x.mode==='questions'?'questions':'topics')+'</div>'+
        '<div class="assessment-row-tags"><span class="tag '+(x.status==='Published'?'teal':'blue')+'">'+safe(x.status)+'</span>'+
        (x.includeInSummary===false?'<span class="tag amber">Excluded from summaries</span>':'<span class="tag slate">Included in summaries</span>')+
        (stats.excluded?'<span class="tag amber">'+stats.excluded+' student'+(stats.excluded===1?'':'s')+' excluded</span>':'')+
        (stats.incomplete?'<span class="tag amber">'+stats.incomplete+' incomplete</span>':'')+'</div></div>'+
        '<div class="assessment-row-stat"><strong>'+percent(stats.mean)+'</strong><small>'+stats.scored+'/'+pupils.length+' marked</small></div>'+
        '<div class="assessment-row-actions"><button class="btn btn-light btn-sm" data-action="assess-open-analysis" data-id="'+safe(x.id)+'">Analyse</button>'+
        '<button class="btn btn-soft btn-sm" data-action="assess-edit" data-id="'+safe(x.id)+'">Edit</button>'+
        '<button class="btn btn-light btn-sm" data-action="assess-reuse" data-id="'+safe(x.id)+'" title="Reuse structure only; no marks are copied">Reuse</button></div></div>';
    }
    h+='</section><div class="class-footer-note">'+icon('info',14)+' <span>Exclusions never delete a record. Blank marks are not zero and incomplete markbooks do not contribute to the mean.</span></div>';
    return h;
  }

  function renderAnalysis(ctx) {
    const {classId,icon}=ctx, a=assessmentsFor(classId),selected=a.find(x=>x.id===state.assessmentId)||a[0];
    if(!selected)return '<div class="empty-help">No assessments yet. Create one to begin.</div>';
    const pupils=pupilsFor(classId),stats=core.assessmentStats(selected,pupils),
      byTopic=core.topicStats(selected,pupils),byItem=core.itemStats(selected,pupils);
    let h='<div class="class-analysis-select"><label for="analysis-assessment">Assessment</label>'+
      '<select id="analysis-assessment">'+a.map(x=>'<option value="'+safe(x.id)+'" '+(x.id===selected.id?'selected':'')+'>'+safe(x.title)+'</option>').join('')+'</select>'+
      '<button class="btn btn-soft" data-action="assess-edit" data-id="'+safe(selected.id)+'">'+icon('file',14)+' Edit marks & settings</button></div>';
    h+='<div class="class-analysis-stats"><div class="metric"><div class="number">'+percent(stats.mean)+'</div><div class="caption">Mean among marked students</div></div>'+
      '<div class="metric"><div class="number">'+stats.scored+'</div><div class="caption">Complete markbooks</div></div>'+
      '<div class="metric"><div class="number">'+stats.excluded+'</div><div class="caption">Excluded students</div></div>'+
      '<div class="metric"><div class="number">'+core.maxTotal(selected)+'</div><div class="caption">Maximum marks</div></div></div>';
    h+=(selected.includeInSummary===false?'<div class="assessment-warning">'+icon('info',16)+
      ' This assessment remains available for analysis but is <strong>excluded from summary statistics.</strong> Reason: '+safe(selected.exclusionReason)+'</div>':'');
    h+='<div class="split-grid"><section class="surface panel-pad"><div class="surface-top"><h2 class="section-title">Topic performance</h2><span class="small-muted">'+byTopic.length+' topics</span></div>'+
      '<div class="class-breakdown">'+byTopic.map(t=>'<div class="breakdown-row"><div class="breakdown-title"><strong>'+safe(t.topic)+
      '</strong><span>'+percent(t.percent)+'</span></div><div class="track"><span style="width:'+(t.percent??0)+'%"></span></div></div>').join('')+
      '</div></section><section class="surface panel-pad"><div class="surface-top"><h2 class="section-title">Assessment scope</h2><span class="tag '+(selected.status==='Published'?'teal':'blue')+'">'+safe(selected.status)+'</span></div>'+
      '<div class="detail-list"><div class="detail-row"><span class="label">Analysis</span><span class="value">'+(selected.mode==='questions'?'Individual questions':'By topic')+'</span></div>'+
      '<div class="detail-row"><span class="label">Assessment date</span><span class="value">'+dateHuman(selected.date)+'</span></div>'+
      '<div class="detail-row"><span class="label">Unmarked / incomplete</span><span class="value">'+(stats.unmarked+stats.incomplete)+'</span></div>'+
      '<div class="detail-row"><span class="label">Summary inclusion</span><span class="value">'+(selected.includeInSummary?'Yes':'No')+'</span></div></div></section></div>';
    h+='<section class="surface class-question-report"><div class="surface-top"><h2 class="section-title">'+(selected.mode==='questions'?'Question-level analysis':'Topic-level analysis')+'</h2>'+
      '<button class="btn btn-light btn-sm" data-action="assess-edit" data-id="'+safe(selected.id)+'">Edit assessment '+icon('arrow',13)+'</button></div>'+
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>'+labelFor(selected.mode)+'</th>'+(selected.mode==='questions'?'<th>Topic</th><th>Objective</th>':'')+
      '<th>Maximum</th><th>Mean mark</th><th>Mean %</th><th>Below half marks</th></tr></thead><tbody>'+
      byItem.map(x=>'<tr><td><strong>'+safe(x.label)+'</strong></td>'+(selected.mode==='questions'?'<td>'+safe(x.topic)+'</td><td>'+safe(x.ao)+'</td>':'')+
      '<td>'+x.maxMarks+'</td><td>'+(x.meanMarks===null?'—':x.meanMarks)+'</td><td><span class="tag '+(x.percent!==null&&x.percent<50?'amber':'teal')+'">'+percent(x.percent)+'</span></td>'+
      '<td>'+x.belowHalf+' of '+x.included+'</td></tr>').join('')+'</tbody></table></div></section>'+
      '<div class="class-footer-note">'+icon('info',14)+' <span>Analysis uses complete, non-excluded student markbooks only. Item and topic averages are weighted by available marks.</span></div>';
    return h;
  }
  function render(ctx) {
    if(ctx.tab==='register'||ctx.tab==='students')return renderRegister(ctx);
    if(ctx.tab==='assessments')return renderAssessmentList(ctx);
    if(ctx.tab==='analysis')return renderAnalysis(ctx);
    if(ctx.tab==='actions') {
      const pupils=pupilsFor(ctx.classId);
      const tasks=ctx.assignedTasks().filter(t=>t.classId===ctx.classId||pupils.some(s=>s.id===t.studentId));
      return ctx.panel('Class follow-ups',tasks.map(ctx.taskRow).join('')||'<div class="empty-help">No actions for this class.</div>',
        ctx.button(ctx.icon('plus',14)+' Add task','new-task','soft'));
    }
    return '';
  }

  function newDraft(classId) {
    return {id:'A'+(++newIdSequence)+'-'+Date.now().toString(36),classId,title:'',date:'2026-11-22',type:'Topic test',mode:'topics',
      items:initialItems('topics'),scores:{},excludedStudents:{},includeInSummary:true,exclusionReason:'',
      status:'Draft',version:0,history:[]};
  }
  function hasMarks(draft) {
    return Object.values(draft.scores||{}).some(row=>Object.values(row).some(v=>v!==null&&v!==''&&v!==undefined));
  }
  function openWizard(classId,id=null,reuse=false) {
    const existing=all.find(x=>x.id===id);
    let draft=existing?(reuse?core.cloneStructure(existing,classId,newDraft(classId).id):core.clone(existing)):newDraft(classId);
    if(reuse) draft.title=existing.title+' (new)';
    const original=existing&&!reuse?core.clone(existing):null;
    state.wizard={draft,original,step:1,ack:false,typed:'',error:'',
      templateId:reuse?existing.id:'',discard:false,removeIndex:null,changed:false,reusedFrom:reuse?existing.id:null};
  }
  const wizardOpen=()=>!!state.wizard;
  function closeWizard() {state.wizard=null;state.removeIndex=null;}
  function requestClose() {if(!state.wizard)return;if(state.wizard.changed)state.wizard.discard=true;else closeWizard();}
  function wizardSteps() {
    const w=state.wizard;
    return '<div class="assessment-steps" aria-label="Assessment creation steps">'+
      [['1','Set up'],['2','Structure'],['3','Marks'],['4','Review']].map(([n,l])=>
        '<div class="assessment-step '+(w.step===Number(n)?'current':w.step>Number(n)?'complete':'')+'"><span>'+n+'</span>'+l+'</div>').join('')+'</div>';
  }
  const field=(name,label,value,type='text',attrs='')=>
    '<label class="assess-field"><span>'+label+'</span><input data-assess-field="'+name+'" type="'+type+'" value="'+safe(value)+'" '+attrs+'></label>';
  function setUpPage() {
    const w=state.wizard,d=w.draft,existing=w.original;
    const templates=all.filter(a=>a.classId===d.classId && a.id!==d.id);
    const hasExistingMarks=!!existing&&hasMarks(d);
    let h='<div class="wizard-section-heading"><h3>Assessment details</h3><p>Set the structure once. Reuse it later without copying student marks.</p></div>'+
      '<div class="assessment-field-grid">'+field('title','Assessment name',d.title,'text','maxlength="100" placeholder="e.g. Algebra end-of-unit test"')+
      field('date','Assessment date',d.date,'date')+
      '<label class="assess-field"><span>Assessment type</span><select data-assess-field="type">'+
      ['Quiz','Topic test','End-of-unit','Mock examination','Other'].map(v=>'<option '+(d.type===v?'selected':'')+'>'+v+'</option>').join('')+
      '</select></label>'+
      '<label class="assess-field"><span>Analyse marks by</span><select data-assess-field="mode" '+(hasExistingMarks?'disabled title="Mode cannot change after marks exist. Reuse the structure to start a new assessment."':'')+'>'+
      '<option value="topics" '+(d.mode==='topics'?'selected':'')+'>Topic</option><option value="questions" '+(d.mode==='questions'?'selected':'')+'>Individual question</option></select></label></div>'+
      (hasExistingMarks?'<div class="assessment-info">Analysis mode is locked after marks are entered. Reuse the assessment to start a new one with a different structure.</div>':'')+
      (existing?'<div class="assessment-info">Editing an existing assessment. Changes are staged until you review and save them.</div>':
      '<div class="template-box"><div><h4>Reuse a previous assessment</h4><p>Copies topic/question layout and maximum marks. Never copies pupil scores or exclusion decisions.</p></div>'+
      '<div class="template-controls"><select id="assessment-template" aria-label="Assessment template">'+
        '<option value="">Choose an existing assessment...</option>'+
        templates.map(t=>'<option value="'+safe(t.id)+'" '+(w.templateId===t.id?'selected':'')+'>'+safe(t.title)+' · '+safe(t.classId)+'</option>').join('')+
      '</select><button class="btn btn-light" data-action="assess-apply-template" '+(!w.templateId?'disabled':'')+'>Use structure</button></div></div>');
    return h;
  }
  function structurePage() {
    const w=state.wizard,d=w.draft,q=d.mode==='questions';
    return '<div class="wizard-section-heading"><h3>Define '+(q?'questions':'topics')+'</h3><p>Customise names, maximum marks'+(q?', topics and assessment objectives':'')+'. Every row is editable.</p></div>'+
      '<div class="assessment-build-table"><table class="data-table"><thead><tr><th>'+labelFor(d.mode)+'</th>'+
      (q?'<th>Topic</th><th>AO</th>':'')+'<th>Max. marks</th><th></th></tr></thead><tbody>'+
      d.items.map((x,i)=>{
        const isPending=w.removeIndex===i, filled=Object.values(d.scores).some(s=>s[x.id]!==undefined&&s[x.id]!==null&&s[x.id]!=='');
        return '<tr><td><input aria-label="'+labelFor(d.mode)+' '+(i+1)+' name" data-assess-field="item-label" data-index="'+i+'" value="'+safe(x.label)+'" placeholder="'+(q?'Q'+(i+1):'Topic name')+'" maxlength="60"></td>'+
        (q?'<td><input aria-label="Topic for question '+(i+1)+'" data-assess-field="item-topic" data-index="'+i+'" value="'+safe(x.topic)+'" placeholder="e.g. Algebra" maxlength="60"></td>'+
        '<td><select data-assess-field="item-ao" data-index="'+i+'" aria-label="Assessment objective">'+['AO1','AO2','AO3','Other'].map(v=>
        '<option '+(x.ao===v?'selected':'')+'>'+v+'</option>').join('')+'</select></td>':'')+
        '<td><input aria-label="Maximum marks" data-assess-field="item-max" data-index="'+i+'" type="number" step="0.5" min="0.5" max="1000" value="'+safe(x.maxMarks)+'"></td>'+
        '<td><button class="btn '+(isPending?'btn-danger':'btn-light')+' btn-sm" data-action="'+(isPending?'assess-confirm-remove':'assess-remove-item')+'" data-index="'+i+'" '+
        (d.items.length===1?'disabled':'')+'>'+ (isPending?'Confirm removal':filled?'Remove…':'Remove')+'</button></td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<button class="btn btn-soft" data-action="assess-add-item" style="margin-top:13px">'+
      '<span style="font-size:17px;line-height:0">+</span> Add '+(q?'question':'topic')+'</button>'+
      (w.removeIndex!==null?'<div class="assessment-warning">Removing a row with marks will permanently remove those marks from this pending revision. Press “Confirm removal” to proceed, or choose another action to cancel.</div>':'')+
      '<div class="assessment-info">The total available marks will be <strong>'+core.maxTotal(d)+'</strong>. Any edited maximum is checked against existing scores before saving.</div>';
  }
  function marksPage() {
    const w=state.wizard,d=w.draft,pupils=pupilsFor(d.classId),q=d.mode==='questions';
    let h='<div class="wizard-section-heading"><h3>Enter marks</h3><p>Enter 0 for zero marks. Leave blank if not yet assessed. Partial rows are never counted as complete.</p></div>'+
      '<div class="assessment-markbook-scroll"><table class="data-table assessment-markbook"><thead><tr><th class="markbook-name">Student / flags</th>'+
      d.items.map(x=>'<th><span>'+safe(x.label)+'</span><small>/ '+x.maxMarks+'</small></th>').join('')+
      '<th>Total</th><th>Include student?</th></tr></thead><tbody>';
    for(const p of pupils) {
      const omitted=Object.prototype.hasOwnProperty.call(d.excludedStudents,p.id),r=core.resultFor(d,p.id),score=d.scores[p.id]||{};
      h+='<tr class="'+(omitted?'assessment-omitted':'')+'"><td class="markbook-name"><strong>'+safe(p.name)+'</strong><span class="markbook-flags">'+flagHTML(p)+'</span></td>'+
        d.items.map(x=>'<td><input class="mark-input" aria-label="'+safe(p.name)+' '+safe(x.label)+' marks out of '+x.maxMarks+'" '+
          'data-assess-mark="'+safe(p.id)+'" data-item-id="'+safe(x.id)+'" type="number" inputmode="decimal" step="0.5" min="0" max="'+x.maxMarks+'" '+
          (score[x.id]===undefined||score[x.id]===null?'':'value="'+safe(score[x.id])+'"')+' '+(omitted?'disabled':'')+' placeholder="—"></td>').join('')+
        '<td class="markbook-total" data-total-for="'+p.id+'">'+(r.status==='scored'?r.total+' / '+r.max:r.status==='excluded'?'Excluded':r.status==='unmarked'?'—':'Partial')+'</td>'+
        '<td><button class="btn btn-sm '+(omitted?'btn-danger':'btn-light')+'" data-action="assess-toggle-student" data-id="'+p.id+'">'+
          (omitted?'Re-include':'Exclude…')+'</button></td></tr>';
      if(omitted)h+='<tr class="exclusion-reason-row"><td colspan="'+(d.items.length+3)+'"><label>Reason for excluding '+safe(p.name)+
        '<input data-assess-reason="'+p.id+'" placeholder="Required: e.g. absent on assessment date" maxlength="160" value="'+safe(d.excludedStudents[p.id])+'"></label>'+
        '<span>Scores are retained but not counted until the student is re-included. You must confirm this at review.</span></td></tr>';
    }
    h+='</tbody></table></div><div class="assessment-info">Student exclusions require a reason and an additional confirmation before saving. No student record is deleted.</div>';
    return h;
  }
  function reviewPage() {
    const w=state.wizard,d=w.draft,pupils=pupilsFor(d.classId),current=assessmentsFor(d.classId);
    const errors=core.validate(d,pupils);
    const stats=core.assessmentStats(d,pupils);
    const hasExclusions=Object.keys(d.excludedStudents).length>0;
    const changed=core.exclusionChanged(w.original,d);
    const before=core.summaryStats(current,pupils);
    const after=core.summaryStats([...current.filter(a=>a.id!==d.id),{...d,status:core.publishState(d,pupils)}],pupils);
    let h='<div class="wizard-section-heading"><h3>Review before saving</h3><p>Nothing is committed until you choose “Save assessment”.</p></div>'+
      '<div class="assessment-review-grid"><div><strong>'+safe(d.title||'Untitled')+'</strong><span>'+safe(d.type)+' · '+labelFor(d.mode)+' analysis · '+d.items.length+' rows</span></div>'+
      '<div><strong>'+core.maxTotal(d)+'</strong><span>Maximum marks</span></div>'+
      '<div><strong>'+stats.scored+' / '+pupils.length+'</strong><span>Fully marked students</span></div>'+
      '<div><strong>'+percent(stats.mean)+'</strong><span>Assessment mean</span></div></div>'+
      '<div class="review-section"><div class="review-heading"><strong>Students excluded from this assessment</strong><span class="tag '+(hasExclusions?'amber':'teal')+'">'+Object.keys(d.excludedStudents).length+' excluded</span></div>'+
      (hasExclusions?Object.entries(d.excludedStudents).map(([id,reason])=>'<div class="review-excluded">'+
      '<strong>'+safe(fixture.students.find(p=>p.id===id)?.name||id)+'</strong><span>'+safe(reason||'Reason required')+'</span></div>').join(''):
      '<p class="tiny-copy">Everyone remains eligible unless their markbook is blank or incomplete.</p>')+
      '<div class="review-heading review-toggle"><label><input id="assessment-summary-include" type="checkbox" '+(d.includeInSummary?'checked':'')+
      '> Include this assessment in class summary statistics</label></div>'+
      (d.includeInSummary?'':'<label class="assess-field"><span>Why exclude this entire assessment? (required)</span>'+
      '<textarea id="assessment-summary-reason" maxlength="240" placeholder="Explain why this assessment should not affect summary statistics">'+safe(d.exclusionReason)+'</textarea></label>')+
      '</div>'+
      '<div class="review-impact"><strong>Impact on class summary</strong><div><span>Before: '+percent(before.mean)+
      ' from '+before.usedAssessments+' included assessment(s)</span><span>'+String.fromCharCode(8594)+'</span>'+
      '<span>After: '+percent(after.mean)+' from '+after.usedAssessments+' included assessment(s)</span></div>'+
      '<p>Mean of eligible assessment means; incomplete or excluded pupil marks do not enter averages. Excluded assessments remain available for analysis.</p></div>';
    if(changed) h+='<div class="review-safety"><strong>Confirm exclusion changes</strong><p>Excluding a pupil or an assessment changes which marks contribute to analyses and summaries. Review the list above and the impact preview.</p>'+
      '<label class="review-check"><input id="assessment-exclusion-ack" type="checkbox" '+(w.ack?'checked':'')+'> I have checked the exclusions and their effect on summary statistics.</label>'+
      (!d.includeInSummary && (w.original?.includeInSummary!==false)?'<label class="assess-field"><span>To exclude this whole assessment, type EXCLUDE</span>'+
      '<input id="assessment-exclusion-phrase" autocomplete="off" placeholder="EXCLUDE" value="'+safe(w.typed)+'"></label>':'')+'</div>';
    if(errors.length)h+='<div class="assessment-error-list" role="alert"><strong>Check before saving:</strong><ul>'+
      errors.map(e=>'<li>'+safe(e)+'</li>').join('')+'</ul></div>';
    return h;
  }
  function wizardHTML() {
    const w=state.wizard;
    if(!w)return '';
    const d=w.draft,editing=!!w.original,steps=['Set up','Structure','Marks','Review'];
    let content=w.step===1?setUpPage():w.step===2?structurePage():w.step===3?marksPage():reviewPage();
    return '<div class="assessment-scrim"></div><section class="assess-wizard" role="dialog" aria-modal="true" aria-labelledby="assess-wizard-title">'+
      '<header class="assessment-wizard-head"><div><p class="eyebrow">'+(editing?'Edit assessment':'Create assessment')+' · '+safe(d.classId)+'</p>'+
      '<h2 id="assess-wizard-title">'+(editing?'Edit':'New')+' assessment</h2></div>'+
      '<button class="icon-button" data-action="assess-request-close" aria-label="Close assessment editor">'+
      '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></header>'+
      wizardSteps()+'<div class="assessment-wizard-scroll">'+
      (w.error?'<div class="assessment-inline-error" role="alert">'+safe(w.error)+'</div>':'')+
      content+'</div><footer class="assessment-wizard-foot"><span class="wizard-foot-caption">'+
      (editing?'Revision '+(d.version+1)+' · staged changes':'Not saved · local fictional prototype')+'</span><div>'+
      '<button class="btn btn-light" data-action="assess-request-close">Cancel</button>'+
      (w.step>1?'<button class="btn btn-light" data-action="assess-back">Back</button>':'')+
      '<button class="btn btn-primary" data-action="'+(w.step===4?'assess-save':'assess-next')+'">'+
      (w.step===4?'Save assessment':'Continue: '+steps[w.step])+'</button></div></footer>'+
      (w.discard?'<div class="assessment-confirm-mask"><div class="assessment-confirm-card" role="alertdialog" aria-modal="true" aria-label="Discard pending changes">'+
      '<h3>Discard your changes?</h3><p>The editor contains unsaved changes. The published assessment will remain unchanged.</p>'+
      '<div><button class="btn btn-light" data-action="assess-keep">Keep editing</button>'+
      '<button class="btn btn-danger" data-action="assess-discard">Discard changes</button></div></div></div>':'')+
      '</section>';
  }

  function validateStep(step,d) {
    const pupils=pupilsFor(d.classId);
    if(step===1) {
      if(!d.title.trim())return 'Give this assessment a title.';
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date))return 'Choose an assessment date.';
      return '';
    }
    if(step===2) {
      const errors=core.validate({...d,title:d.title||'Untitled',
        scores:{},excludedStudents:{},includeInSummary:true},pupils);
      return errors.find(x=>/row|question|topic|maximum|IDs/.test(x))||'';
    }
    if(step===3) {
      const errors=core.validate(d,pupils);
      return errors.find(x=>/marks|excluded student|reason for every/i.test(x))||'';
    }
    return '';
  }
  function save(onSuccess) {
    const w=state.wizard;if(!w)return;
    const d=w.draft,pupils=pupilsFor(d.classId),errors=core.validate(d,pupils);
    if(errors.length){w.error=errors[0];return false;}
    const exclusionChange=core.exclusionChanged(w.original,d);
    if(exclusionChange&&!w.ack){w.error='Confirm that you have reviewed the exclusion changes.';return false;}
    if(exclusionChange&&!d.includeInSummary&&(w.original?.includeInSummary!==false)&&w.typed.trim().toUpperCase()!=='EXCLUDE'){
      w.error='Type EXCLUDE to confirm removing this assessment from class summaries.';return false;
    }
    const output=core.clone(d);
    output.status=core.publishState(output,pupils);
    output.version=(w.original?.version||0)+1;
    const exclusionNote=exclusionChange?' Exclusion settings reviewed and acknowledged.':'';
    output.history=[...(w.original?.history||[]),{when:'22 Nov 2026',who:roleName,
      change:(w.original?'Revised assessment':'Created assessment')+'.'+exclusionNote}];
    const index=all.findIndex(x=>x.id===output.id);
    if(index>=0)all.splice(index,1,output);else all.push(output);
    state.assessmentId=output.id;closeWizard();if(onSuccess)onSuccess(output);
    return true;
  }

  function onAction(action,el,ctx) {
    if(!action?.startsWith('assess-')&&action!=='class-filter'&&action!=='class-new-assessment')return false;
    const id=el?.dataset?.id||'',w=state.wizard;
    if(action==='class-filter'){state.filter=id;ctx.render();return true;}
    if(action==='class-new-assessment'){
      openWizard(ctx.store.selectedClass);ctx.render();return true;
    }
    if(action==='assess-open-analysis'){state.assessmentId=id;ctx.store.classTab='analysis';ctx.render({scrollTop:true});return true;}
    if(action==='assess-edit'||action==='assess-reuse'){
      const orig=all.find(a=>a.id===id);if(orig){state.assessmentId=orig.id;openWizard(orig.classId,orig.id,action==='assess-reuse');ctx.render();}
      return true;
    }
    if(!w)return true;
    w.error='';
    if(action==='assess-request-close'){requestClose();ctx.render();return true;}
    if(action==='assess-keep'){w.discard=false;ctx.render();return true;}
    if(action==='assess-discard'){closeWizard();ctx.render();return true;}
    if(action==='assess-back'){w.step=Math.max(1,w.step-1);w.removeIndex=null;ctx.render({wizardTop:true});return true;}
    if(action==='assess-next'){
      const error=validateStep(w.step,w.draft);
      if(error)w.error=error;else{w.step=Math.min(4,w.step+1);w.removeIndex=null;}
      ctx.render({wizardTop:true});return true;
    }
    if(action==='assess-save'){
      const ok=save(()=>{ctx.store.classTab='assessments';});
      ctx.render();if(ok)ctx.notify('Assessment saved in this demo session');
      return true;
    }
    if(action==='assess-add-item'){
      const n=w.draft.items.length+1;
      w.draft.items.push(item('I'+Date.now().toString(36)+n,w.draft.mode==='questions'?'Q'+n:'New topic',
        w.draft.mode==='questions'?4:10,w.draft.mode==='questions'?'Algebra':'New topic','AO1'));
      w.removeIndex=null;w.changed=true;ctx.render();return true;
    }
    if(action==='assess-remove-item'||action==='assess-confirm-remove'){
      const i=Number(el.dataset.index),d=w.draft,entry=d.items[i];
      if(!entry||d.items.length<2)return true;
      const containsMarks=Object.values(d.scores).some(row=>row[entry.id]!==undefined&&row[entry.id]!==null&&row[entry.id]!=='');
      if(containsMarks&&action==='assess-remove-item'){w.removeIndex=i;ctx.render();return true;}
      if(containsMarks&&w.removeIndex!==i)return true;
      d.items.splice(i,1);for(const row of Object.values(d.scores))delete row[entry.id];
      w.removeIndex=null;w.changed=true;ctx.render();return true;
    }
    if(action==='assess-toggle-student'){
      const d=w.draft;
      if(Object.prototype.hasOwnProperty.call(d.excludedStudents,id))delete d.excludedStudents[id];
      else d.excludedStudents[id]='';
      w.ack=false;w.typed='';w.changed=true;ctx.render();return true;
    }
    if(action==='assess-apply-template'){
      if(w.original)return true;
      const selected=all.find(a=>a.id===w.templateId);
      if(!selected){w.error='Select an assessment to reuse.';ctx.render();return true;}
      if(hasMarks(w.draft)){w.error='This draft already contains marks. Clear or save it before replacing its structure.';ctx.render();return true;}
      const copy=core.cloneStructure(selected,w.draft.classId,w.draft.id);
      w.draft.items=copy.items;w.draft.mode=copy.mode;w.draft.type=copy.type;
      w.reusedFrom=selected.id;w.draft.scores={};w.draft.excludedStudents={};
      w.draft.includeInSummary=true;w.draft.exclusionReason='';
      w.changed=true;ctx.render();ctx.notify('Structure reused; no scores or exclusions copied');return true;
    }
    return true;
  }

  function onInput(event) {
    const el=event.target,w=state.wizard;
    if(!w)return false;
    const field=el.dataset.assessField;
    if(field) {
      if(field==='mode'||field==='type')return false;
      const i=Number(el.dataset.index);
      if(field==='item-label'||field==='item-topic'||field==='item-ao'||field==='item-max'){
        const entry=w.draft.items[i];if(!entry)return true;
        const key=field==='item-label'?'label':field==='item-topic'?'topic':field==='item-ao'?'ao':'maxMarks';
        entry[key]=key==='maxMarks'?(el.value===''?'':Number(el.value)):el.value;
        if(key==='label'&&w.draft.mode==='topics')entry.topic=el.value;
      }else w.draft[field]=el.value;
      w.changed=true;return true;
    }
    if(el.dataset.assessMark) {
      const pupilId=el.dataset.assessMark,itemId=el.dataset.itemId;
      const row=(w.draft.scores[pupilId]||={});
      row[itemId]=el.value===''?null:Number(el.value);
      w.changed=true;
      const result=core.resultFor(w.draft,pupilId);
      const cell=document.querySelector('[data-total-for="'+pupilId+'"]');
      if(cell)cell.textContent=result.status==='scored'?result.total+' / '+result.max:result.status==='invalid'?'Check mark':result.status==='incomplete'?'Partial':'—';
      return true;
    }
    if(el.dataset.assessReason){
      w.draft.excludedStudents[el.dataset.assessReason]=el.value;
      w.ack=false;w.changed=true;return true;
    }
    if(el.id==='assessment-summary-reason'){
      w.draft.exclusionReason=el.value;w.changed=true;return true;
    }
    if(el.id==='assessment-exclusion-phrase'){w.typed=el.value;return true;}
    return false;
  }

  function onChange(event,ctx){
    const el=event.target,w=state.wizard;
    if(el.id==='analysis-assessment'){state.assessmentId=el.value;ctx.render();return true;}
    if(!w)return false;
    if(el.id==='assessment-template'){w.templateId=el.value;ctx.render();return true;}
    if(el.id==='assessment-summary-include'){
      w.draft.includeInSummary=el.checked;
      if(el.checked)w.draft.exclusionReason='';
      w.ack=false;w.typed='';w.changed=true;ctx.render();return true;
    }
    if(el.id==='assessment-exclusion-ack'){w.ack=el.checked;return true;}
    if(el.dataset.assessField==='mode'){
      if(w.original&&hasMarks(w.draft))return true;
      if(w.draft.mode!==el.value){
        w.draft.mode=el.value;w.draft.items=initialItems(el.value);w.draft.scores={};
        w.draft.excludedStudents={};w.ack=false;w.changed=true;
      }
      ctx.render();return true;
    }
    if(el.dataset.assessField==='type'){w.draft.type=el.value;w.changed=true;return true;}
    if(el.dataset.assessField==='item-ao'){
      w.draft.items[Number(el.dataset.index)].ao=el.value;w.changed=true;return true;
    }
    return false;
  }
  function askClose(){if(state.wizard)requestClose();}
  window.SchoolHubClassroom={
    render,wizardHTML,wizardOpen,askClose,onAction,onInput,onChange,
    metrics:classId=>core.summaryStats(assessmentsFor(classId),pupilsFor(classId)),
    studentAssessments:studentId=>{
      const pupil=fixture.students.find(p=>p.id===studentId);
      if(!pupil)return [];
      return assessmentsFor(pupil.classId).map(a=>({...a,result:core.resultFor(a,studentId)}));
    },
    flags,assessmentsFor
  };
})();