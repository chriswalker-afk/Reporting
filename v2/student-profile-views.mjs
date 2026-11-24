import {expandButton,panelAttributes} from './expandable-details.mjs';
import {houseBadge} from './branding.mjs';
import {compactWave} from './intervention-views.mjs';
import {studyStatusLabel} from './intervention-refinement.mjs';
import {pct,displayDate,gradeGap} from './workspace.mjs';
import {PROFILE_TABS} from './student-profiles.mjs';
import {trendChart} from './analysis-views.mjs';

const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,id='',kind='')=>'<button type="button" class="btn '+kind+'" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const link=(label,action,id)=>'<button type="button" class="inline-link" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const tag=(label,kind='')=>'<span class="tag '+kind+'">'+e(label)+'</span>';
const help=(id,label)=>'<button type="button" class="help" data-help="'+e(id)+'" aria-label="'+e('About '+label)+'" aria-expanded="false">ⓘ</button>';
const empty=(title,detail='')=>'<div class="empty"><strong>'+e(title)+'</strong>'+e(detail)+'</div>';
const section=(title,body,tip='',actions='')=>'<section class="drawer-section profile-section"'+panelAttributes('profile',title)+'><div class="profile-section-head"><h3>'+e(title)+(tip?help(tip,title):'')+'</h3><div class="panel-expand-actions">'+actions+expandButton('profile',title)+'</div></div><div class="content">'+body+'</div></section>';
const table=(head,rows,label)=>rows.length?'<div class="table-scroll profile-table" role="region" tabindex="0" aria-label="'+e(label)+'"><table class="data-table profile-responsive-table" role="table" aria-label="'+e(label)+'"><thead role="rowgroup"><tr role="row">'+head.map((h,i)=>'<th role="columnheader" scope="col" '+(i===0?'class="sticky-first"':'')+'>'+e(h)+'</th>').join('')+'</tr></thead><tbody role="rowgroup">'+rows.map(row=>'<tr role="row">'+row.map((v,i)=>'<td role="cell" '+(i===0?'class="sticky-first"':'')+'><span class="profile-mobile-label" aria-hidden="true">'+e(head[i])+'</span><div class="profile-cell-content">'+v+'</div></td>').join('')+'</tr>').join('')+'</tbody></table></div>':empty('No records');
const select=(id,options,value,label)=>'<label class="analysis-field">'+e(label)+'<select class="select" id="'+e(id)+'" aria-label="'+e(label)+'">'+options.map(([k,l])=>'<option value="'+e(k)+'" '+(k===value?'selected':'')+'>'+e(l)+'</option>').join('')+'</select></label>';
const gap=v=>'<span class="'+(v==null?'muted':v<0?'negative':'positive')+'">'+e(gradeGap(v))+'</span>';
const coverage=s=>s.coverage.scored+'/'+s.coverage.eligible;
const status=s=>tag(s.onTrack===null?'Unknown':s.onTrack?'On / above MTG':'Below MTG',s.onTrack===null?'':s.onTrack?'tag-success':'tag-warning');
const subjectName=s=>s.classInfo.subject.name;
const resultLabel=r=>r.status==='scored'?'Scored':r.status[0].toUpperCase()+r.status.slice(1);
const resultKey=(p,s,a)=>JSON.stringify([p,s,a]);
const facts=items=>'<dl class="drawer-summary">'+items.map(([k,v])=>'<div class="fact"><dt>'+e(k)+'</dt><dd>'+v+'</dd></div>').join('')+'</dl>';
const staffList=ps=>ps.length?ps.map(p=>link(p.name,'open-profile-staff',p.id)).join(', '):'—';
const metric=(label,value,foot='',action='',id='')=>'<div class="metric"><div class="metric-head">'+e(label)+'</div><div class="metric-value">'+e(value)+'</div><div class="metric-foot">'+(action?link(foot,action,id):e(foot))+'</div></div>';
const scoreEvidence=r=>r.status==='excluded'&&r.recordedPercent!==null?e(pct(r.recordedPercent))+'<span class="cell-sub">Retained, excluded</span>':e(pct(r.percent));
const markEvidence=r=>r.rawMark===null?'—':e(r.rawMark+'/'+r.maxMarks);
export function visibleProfileSubjects(p,filter='all'){
 const ordered=[...p.subjects].sort((a,b)=>Number(b.onTrack===false)-Number(a.onTrack===false)||
  (a.gapToTarget??Infinity)-(b.gapToTarget??Infinity)||subjectName(a).localeCompare(subjectName(b)));
 return ordered.filter(s=>filter==='all'||filter==='below'&&s.onTrack===false||filter==='unknown'&&s.onTrack===null||filter==='support'&&s.activeCases.length>0);
}
function overview(p,detail){
 const c=p.counts,filter=['all','below','unknown','support'].includes(detail.subjectFilter)?detail.subjectFilter:'all';
 const subjects=visibleProfileSubjects(p,filter),supportCount=p.subjects.filter(s=>s.activeCases.length>0).length;
 const chip=(id,label,n)=>'<button type="button" class="register-chip" id="profile-filter-'+id+'" data-action="profile-focus" data-id="'+id+'" aria-pressed="'+(filter===id)+'">'+e(label)+' <strong>'+n+'</strong></button>';
 const due=p.activeCases.filter(c=>c.due).length,overdue=p.activeCases.filter(c=>c.overdue).length;
 const rows=subjects.map(s=>[
  '<div class="profile-subject-name">'+link(subjectName(s),'profile-select-subject',s.enrolmentId)+'<span class="cell-sub">'+link(s.classInfo.code,'profile-open-class',s.classId)+' · '+e(s.classInfo.teachers)+'</span><span class="cell-sub">'+e(s.classInfo.course.name)+'</span></div>',
  '<strong class="profile-current-grade">'+e(s.grade??'—')+'</strong> <span class="profile-current-percent">'+link(pct(s.average),'profile-select-subject',s.enrolmentId)+'</span><span class="cell-sub">'+link(coverage(s)+' scored','profile-select-subject',s.enrolmentId)+'</span>',
  s.targetEditable?link(s.minimumGrade??'Set','edit-target',s.enrolmentId):e(s.minimumGrade??'—'),
  s.editable?link(s.predictedGrade??'Set','edit-prediction',s.enrolmentId):e(s.predictedGrade??'—'),
  '<div class="profile-target-gap">'+gap(s.gapToTarget)+' '+status(s)+'</div>',
  s.latest?link(pct(s.latest.percent)+' · '+(s.latest.grade??'—'),'profile-select-subject',s.enrolmentId)+'<span class="cell-sub">'+e(s.latest.title)+' · '+e(displayDate(s.latest.date))+'</span>':'—',
  '<div class="profile-row-actions">'+(s.activeCases.length?s.activeCases.map(c=>link('W'+c.wave+(c.overdue?' · overdue':c.due?' · due':''),'open-case',c.id)).join(' '):s.canStart?link('Start W1','new-case',s.enrolmentId):'<span class="muted">No active case</span>')+
   '<span class="cell-sub">'+link(s.noteCount?s.noteCount+(s.noteCount===1?' comment':' comments'):s.canComment?'Add comment':'View comments','subject-comments',s.enrolmentId)+'</span></div>'
 ]);
 const distribution=c.subjects?'<div class="profile-target-strip" aria-label="'+e(c.onTrack+' subjects on or above target, '+c.below+' below, '+c.unknown+' unknown')+'">'+
 [['on',c.onTrack],['below',c.below],['unknown',c.unknown]].filter(([,n])=>n>0).map(([kind,n])=>'<span class="target-segment '+kind+'" style="flex:'+n+'" aria-hidden="true"></span>').join('')+'</div><div class="profile-target-legend"><span><i class="target-dot on"></i>'+c.onTrack+' on / above MTG</span><span><i class="target-dot below"></i>'+c.below+' below MTG</span><span><i class="target-dot unknown"></i>'+c.unknown+' unknown</span></div>':'<p class="small muted">No accessible subjects.</p>';
 return '<div class="metrics profile-metrics compact-profile-metrics">'+metric('Visible subjects',c.subjects,c.scored+' with scored results')+metric('Below MTG',c.below,c.severe+' at least two grades below · Filter','profile-focus','below')+metric('Unknown status',c.unknown,'Review evidence gaps','profile-focus','unknown')+metric('Active interventions',p.activeCases.length,(due?due+' due · '+overdue+' overdue':'View shared support'),'profile-tab','support')+'</div>'+
 section('Subjects requiring attention',distribution+'<div class="profile-focus-bar" role="group" aria-label="Filter subjects">'+chip('all','All subjects',c.subjects)+chip('below','Below MTG',c.below)+chip('unknown','Unknown',c.unknown)+chip('support','Active support',supportCount)+'</div>','profileFocus')+
 section('Cross-subject attainment','<p class="small muted profile-table-caption">'+subjects.length+' of '+c.subjects+' visible subjects · below target first</p>'+table(['Subject / class','Attainment','MTG','Pred.','Target status','Latest result','Support / comments'],rows,'Cross-subject attainment')+
 '<p class="small muted">Each subject uses its own grading scale. Select a subject for its assessment history, or an editable target, prediction or comment to update its shared record.</p>','profileTargets');
}
function assessments(w,p,detail){
 const selected=p.subjects.some(s=>s.enrolmentId===detail.subjectId)?detail.subjectId:p.subjects[0]?.enrolmentId;
 if(!selected)return empty('No accessible subject records');
 const d=w.profileSubject(p.student.id,selected),s=d.subject,r=d.summary;
 const sequence=new Map(d.cumulative.map((r,i)=>[r.assessmentId,{index:i+1,percent:r.percent}]));
 const history=d.history.map(x=>[
  link(x.title,'profile-result',resultKey(p.student.id,selected,x.assessmentId))+'<span class="cell-sub">'+e(x.unitTitle)+'</span>',
  e(displayDate(x.date)),markEvidence(x),scoreEvidence(x)+'<span class="cell-sub">Grade '+e(x.status==='excluded'?x.recordedGrade??'—':x.grade??'—')+'</span>',
  tag(resultLabel(x),x.status==='excluded'?'tag-warning':'')+'<span class="cell-sub">'+tag(x.summaryIncluded?'Included':'Diagnostic / excluded',x.summaryIncluded?'':'tag-warning')+'</span>',e(x.weight),e(pct(sequence.get(x.assessmentId)?.percent))+'<span class="cell-sub">Trend #'+e(sequence.get(x.assessmentId)?.index??'—')+'</span>'
 ]);
 const topicRows=[...d.topics].sort((a,b)=>a.percent-b.percent||a.topic.localeCompare(b.topic));
 const topicBody=topicRows.length?'<div class="profile-topic-list">'+topicRows.map(t=>'<div class="profile-topic"><span>'+e(t.topic)+'</span><span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:'+Math.max(0,Math.min(100,t.percent))+'%"></span></span><strong>'+e(pct(t.percent))+'</strong><span class="muted small">'+e(t.earned+'/'+t.available)+'</span></div>').join('')+'</div><p class="small muted">Evidence from complete, included assessments only; low marks may indicate a topic to revisit.</p>':empty('No eligible topic-tagged evidence');
 return '<div class="profile-controls">'+select('profile-subject',p.subjects.map(x=>[x.enrolmentId,subjectName(x)+' · '+x.classInfo.code]),selected,'Subject')+
 btn('Open student analysis','profile-open-analysis',selected)+btn('Subject comments','subject-comments',selected)+(s.canStart?btn('Start Wave 1','new-case',selected,'btn-quiet'):'')+'</div>'+
 '<div class="metrics profile-metrics">'+metric('Overall attainment',pct(r.average),'Grade '+(r.grade??'—'))+metric('Minimum target',r.minimumGrade??'—',s.targetEditable?'Edit MTG · '+gradeGap(r.gapToTarget):'Grade gap '+gradeGap(r.gapToTarget),s.targetEditable?'edit-target':'',selected)+metric('Prediction',r.predictedGrade??'—',s.editable?'Edit prediction · '+gradeGap(r.gapToPrediction):'Grade gap '+gradeGap(r.gapToPrediction),s.editable?'edit-prediction':'',selected)+metric('Next grade',r.nextGrade?r.nextGrade.percentagePoints.toFixed(1)+' pp':'—',r.nextGrade?'To grade '+r.nextGrade.grade:'No next grade / no scored evidence')+'</div>'+
 '<div class="profile-analysis-grid">'+section('Attainment over time',trendChart(d),'analysisTrend')+section('Topic strengths and weaknesses',topicBody,'analysisTopics')+'</div>'+
 section('Published assessment history',table(['Assessment / unit','Date','Mark','% / grade','Result / inclusion','Weight','Cumulative %'],history,'Individual assessment history')+
 '<p class="small muted">Included records: '+e(coverage(r))+' scored. Trend # identifies the matching point in the graph. Click any assessment for the individual marks, including retained excluded marks. Drafts and future assessments are not shown.</p>','profileHistory');
}
function comments(p,detail){
 const selected=p.subjects.some(s=>s.enrolmentId===detail.commentSubject)?detail.commentSubject:'';
 const options=[['','All subjects'],...p.subjects.map(s=>[s.enrolmentId,subjectName(s)+' · '+s.classInfo.code])];
 const notes=p.notes.filter(n=>n.visibility==='subject'&&(!selected||n.enrolmentId===selected));
 const add=p.subjects.filter(s=>s.canComment&&(!selected||s.enrolmentId===selected));
 const item=n=>'<article class="comment-record"><div class="comment-meta"><strong>'+e(n.classInfo.subject.name)+' · '+e(n.classInfo.code)+'</strong><span class="small muted">'+e(displayDate(n.date))+(n.updatedDate?' · edited '+e(displayDate(n.updatedDate)):'')+'</span></div><p>'+e(n.text)+'</p><div class="comment-meta"><span class="small muted">'+e(n.author)+'</span>'+(n.editable?btn('Edit my comment','edit-comment',n.id,'btn-quiet'):'')+'</div></article>';
 const pastoral=p.notes.filter(n=>n.visibility==='pastoral');
 return '<div class="profile-controls">'+select('profile-comment-subject',options,selected,'Subject filter')+
 add.map(s=>btn('Add '+subjectName(s)+' comment','subject-comments',s.enrolmentId,'btn-primary')).join('')+'</div>'+
 section('Subject comments',notes.length?notes.map(item).join(''):empty('No subject comments in this selection',add.length?'Use Add comment to record a fictional academic observation.':'No editable subject comments for this staff member.'),'profileComments')+
 section('Pastoral academic notes',pastoral.length?pastoral.map(n=>'<article class="comment-record"><div class="comment-meta"><strong>'+e(n.author)+'</strong><span class="small muted">'+e(displayDate(n.date))+'</span></div><p>'+e(n.text)+'</p></article>').join(''):empty('No accessible pastoral academic notes'),'profileComments')+
 '<p class="stage-note">This is an academic record. Safeguarding, confidential clinical information and other sensitive details must remain in the approved school systems. Fictional data only.</p>';
}
function support(p){
 const rows=cases=>cases.map(c=>[
  link(c.classInfo.subject.name,'open-case',c.id)+'<span class="cell-sub">'+e(c.classInfo.code+' · '+c.id)+'</span>',
  compactWave(c),e(c.owner),
  e(displayDate(c.reviewDate))+(c.overdue?' '+tag('Overdue','tag-danger'):c.due?' '+tag('Due','tag-warning'):''),
  c.tasks[0]?e(c.tasks[0].label)+'<span class="cell-sub">'+e(c.tasks[0].responsible)+'</span>':e(displayDate(c.updatedDate)),
  c.studyStatus==='none'?'—':link(studyStatusLabel(c.studyStatus),'open-case-plan',c.id),btn('View record','open-case',c.id)
 ]);
 return '<div class="metrics profile-metrics">'+metric('Active cases',p.activeCases.length,'Visible subject interventions')+
 metric('Reviews due',p.activeCases.filter(c=>c.due).length,p.activeCases.filter(c=>c.overdue).length+' overdue')+
 metric('Closed cases',p.closedCases.length,'Retained in history')+'</div>'+
 '<div class="profile-controls">'+p.subjects.filter(s=>s.canStart).map(s=>btn('Start Wave 1 · '+subjectName(s),'new-case',s.enrolmentId,'btn-primary')).join('')+'</div>'+
 section('Active interventions',table(['Subject / case','Stage','Case owner','Case review','Next responsibility / update','Study plan','Action'],rows(p.activeCases),'Active interventions'),'intervention')+
 section('Historic interventions',table(['Subject / case','Stage','Case owner','Case review','Next responsibility / update','Study plan','Action'],rows(p.closedCases),'Closed interventions'),'intervention')+
 '<p class="stage-note">Open a case to view or complete authorised actions, including plans, reviews and referrals. A low grade does not automatically create an intervention.</p>';
}
export function profilePeers(w,detail){
 const all=w.profilePeers(detail.id);
 if(!Array.isArray(detail.peerIds)||!detail.peerIds.includes(detail.id))return all;
 const map=new Map(all.map(p=>[p.id,p]));
 return [...new Set(detail.peerIds)].filter(id=>map.has(id)).map(id=>map.get(id));
}
export function renderStudentProfile(w,detail){
 const p=w.studentProfile(detail.id),student=p.student,peers=profilePeers(w,detail),i=peers.findIndex(r=>r.id===student.id);
 const tab=PROFILE_TABS.some(([id])=>id===detail.tab)?detail.tab:'overview';
 const identity='<div class="profile-identity"><div class="profile-identity-main">'+houseBadge(student,{large:true})+'<div><strong>'+e('Year '+student.year+' · '+student.tutorGroupName+' · '+student.house+' House')+'</strong><p class="small muted">Demo pupil ID: '+e(student.id)+'</p><div class="tags">'+student.tags.map(t=>tag(t)).join('')+(p.activeCases.length?tag('SOC','tag-warning'):'')+'</div></div></div><details class="profile-identity-staff"><summary>Tutor &amp; House contacts</summary>'+facts([['Tutor',staffList(student.tutors)],['Head of House',staffList(student.houseHeads)]])+'</details></div>';
 const nav='<div class="profile-controls profile-navigation">'+(i>0?btn('‹ Previous','profile-switch',peers[i-1].id):'<button type="button" class="btn" disabled>‹ Previous</button>')+
 select('profile-pupil',peers.map(r=>[r.id,r.name]),student.id,'Pupil')+(i>=0&&i<peers.length-1?btn('Next ›','profile-switch',peers[i+1].id):'<button type="button" class="btn" disabled>Next ›</button>')+
 '<span class="small muted">'+e((detail.peerLabel?detail.peerLabel+' · ':'')+(i>=0?(i+1)+' of '+peers.length:''))+'</span></div>';
 const tabs='<div class="tabs profile-tabs" aria-label="Student profile views">'+PROFILE_TABS.map(([id,label])=>'<button type="button" class="tab" data-action="profile-tab" data-id="'+id+'" aria-pressed="'+(tab===id)+'">'+e(label)+(id==='comments'?' <span class="profile-tab-count">'+p.notes.filter(n=>n.visibility==='subject').length+'</span>':id==='support'?' <span class="profile-tab-count">'+p.activeCases.length+'</span>':'')+'</button>').join('')+'</div>';
 const body=tab==='assessments'?assessments(w,p,detail):tab==='comments'?comments(p,detail):tab==='support'?support(p):overview(p,detail);
 return {title:student.name,sub:'Student profile · All your authorised subject records',body:'<div class="profile-top">'+identity+nav+'<p class="small muted profile-scope-note">All authorised records across assigned responsibilities. '+help('profileScope','profile scope')+'</p></div>'+tabs+'<div class="profile-tab-body">'+body+'</div>'};
}
export function renderProfileResult(w,id){
 const parts=JSON.parse(id);
 if(!Array.isArray(parts)||parts.length!==3||parts.some(v=>typeof v!=='string'))throw Error('Invalid individual assessment selection');
 const d=w.profileResult(...parts),r=d.record;
 const itemRows=d.items.map(i=>[e(i.label),e(i.topic??'—'),e(i.ao??'—'),e(i.mark??'—'),e(i.maxMarks)]);
 return {title:r.title,sub:d.student+' · '+d.subject+' · '+d.classCode,body:
  facts([['Date',e(displayDate(r.date))],['Curriculum unit',e(r.unitTitle)],['Recorded mark',markEvidence(r)],['Recorded percentage',e(pct(r.recordedPercent))],['Recorded grade',e(r.recordedGrade??'—')],['Result status',tag(resultLabel(r),r.status==='excluded'?'tag-warning':'')],['Summary inclusion',tag(r.summaryIncluded?'Assessment included':'Assessment excluded / diagnostic',r.summaryIncluded?'':'tag-warning')],['Weight',e(r.weight)]])+
  (r.exclusionReason?'<div class="alert">Individual exclusion: '+e(r.exclusionReason)+'</div>':'')+
  (r.assessmentExclusionReason?'<div class="alert">Assessment exclusion: '+e(r.assessmentExclusionReason)+'</div>':'')+
  section('Recorded item marks',table(['Item','Topic','AO','Mark','Maximum'],itemRows,'Individual recorded marks'),'profileHistory')+
  section('Assessment grade boundaries',table(['Grade','Minimum %'],d.bands.map(b=>[e(b.grade),e(pct(b.min))]),'Assessment grade boundaries'),'overallGrade')+
  '<p class="stage-note">This is the individual pupil’s recorded result. Missing item marks are blank, not zero. Edits belong in the authorised class markbook.</p>'};
}
