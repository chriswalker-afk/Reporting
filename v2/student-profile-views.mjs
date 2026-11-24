import {pct,displayDate,gradeGap} from './workspace.mjs';
import {PROFILE_TABS} from './student-profiles.mjs';
import {trendChart} from './analysis-views.mjs';

const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,id='',kind='')=>'<button type="button" class="btn '+kind+'" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const link=(label,action,id)=>'<button type="button" class="inline-link" data-action="'+e(action)+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const tag=(label,kind='')=>'<span class="tag '+kind+'">'+e(label)+'</span>';
const help=(id,label)=>'<button type="button" class="help" data-help="'+e(id)+'" aria-label="'+e('About '+label)+'" aria-expanded="false">ⓘ</button>';
const empty=(title,detail='')=>'<div class="empty"><strong>'+e(title)+'</strong>'+e(detail)+'</div>';
const section=(title,body,tip='',actions='')=>'<section class="drawer-section profile-section"><div class="profile-section-head"><h3>'+e(title)+(tip?help(tip,title):'')+'</h3>'+actions+'</div><div class="content">'+body+'</div></section>';
const table=(head,rows,label)=>rows.length?'<div class="table-scroll profile-table" role="region" tabindex="0" aria-label="'+e(label)+'"><table class="data-table"><thead><tr>'+head.map((h,i)=>'<th scope="col" '+(i===0?'class="sticky-first"':'')+'>'+e(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((v,i)=>'<td '+(i===0?'class="sticky-first"':'')+'>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':empty('No records');
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
function overview(p){
 const c=p.counts,subjects=[...p.subjects].sort((a,b)=>Number(b.onTrack===false)-Number(a.onTrack===false)||(a.gapToTarget??Infinity)-(b.gapToTarget??Infinity)||subjectName(a).localeCompare(subjectName(b)));
 const rows=subjects.map(s=>[
  link(subjectName(s),'profile-select-subject',s.enrolmentId)+'<span class="cell-sub">'+link(s.classInfo.code,'profile-open-class',s.classId)+'</span>',
  e(s.classInfo.course.name)+'<span class="cell-sub">'+e(s.classInfo.teachers)+'</span>',e(pct(s.average)),e(s.grade??'—'),
  s.targetEditable?link(s.minimumGrade??'Set','edit-target',s.enrolmentId):e(s.minimumGrade??'—'),
  s.editable?link(s.predictedGrade??'Set','edit-prediction',s.enrolmentId):e(s.predictedGrade??'—'),
  gap(s.gapToTarget),status(s),link(coverage(s),'profile-select-subject',s.enrolmentId),
  s.activeCases.length?s.activeCases.map(c=>link('W'+c.wave,'open-case',c.id)).join(' '):s.canStart?link('+ W1','new-case',s.enrolmentId):'—',
  link(s.noteCount?String(s.noteCount):s.canComment?'+ Add':'View','subject-comments',s.enrolmentId)
 ]);
 const needs=subjects.filter(s=>s.onTrack===false||s.onTrack===null);
 const attention=needs.length?'<div class="profile-attention">'+needs.map(s=>'<div class="profile-attention-row">'+
 link(subjectName(s),'profile-select-subject',s.enrolmentId)+status(s)+'<span>'+e(s.onTrack===false?Math.abs(s.gapToTarget)+' grade'+(Math.abs(s.gapToTarget)===1?'':'s')+' below target':'Insufficient attainment / target evidence')+'</span><span class="muted">'+e(coverage(s)+' results scored')+'</span></div>').join('')+'</div>':empty('No visible subjects below target or unknown','This is a summary of available academic evidence, not an automatic intervention decision.');
 return '<div class="metrics profile-metrics">'+metric('Visible subjects',c.subjects,c.scored+' with scored results')+metric('Below MTG',c.below,c.severe+' at least two grades below')+metric('Unknown status',c.unknown,'Missing attainment or target')+metric('Active interventions',p.activeCases.length,'View shared support','profile-tab','support')+'</div>'+
 section('Cross-subject attainment',table(['Subject / class','Course / teacher','Avg %','Grade','MTG','Pred.','Δ MTG','Status','Scored','Wave','Comments'],rows,'Cross-subject attainment')+
 '<p class="small muted">Subjects have different grading scales. No combined percentage or grade is calculated. Click a subject for its individual assessment history. Editable grades and comments use the existing shared records.</p>','profileTargets')+
 section('Subjects requiring attention',attention,'profileTargets');
}
function assessments(w,p,detail){
 const selected=p.subjects.some(s=>s.enrolmentId===detail.subjectId)?detail.subjectId:p.subjects[0]?.enrolmentId;
 if(!selected)return empty('No accessible subject records');
 const d=w.profileSubject(p.student.id,selected),s=d.subject,r=d.summary;
 const sequence=new Map(d.cumulative.map((r,i)=>[r.assessmentId,{index:i+1,percent:r.percent}]));
 const history=d.history.map(x=>[
  link(x.title,'profile-result',resultKey(p.student.id,selected,x.assessmentId))+'<span class="cell-sub">'+e(x.unitTitle)+'</span>',
  e(displayDate(x.date)),markEvidence(x),scoreEvidence(x),e(x.status==='excluded'?x.recordedGrade??'—':x.grade??'—'),
  tag(resultLabel(x),x.status==='excluded'?'tag-warning':''),tag(x.summaryIncluded?'Included':'Diagnostic / excluded',x.summaryIncluded?'':'tag-warning'),e(x.weight),e(sequence.get(x.assessmentId)?.index??'—'),e(pct(sequence.get(x.assessmentId)?.percent))
 ]);
 const topicRows=[...d.topics].sort((a,b)=>a.percent-b.percent||a.topic.localeCompare(b.topic));
 const topicBody=topicRows.length?'<div class="profile-topic-list">'+topicRows.map(t=>'<div class="profile-topic"><span>'+e(t.topic)+'</span><span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:'+Math.max(0,Math.min(100,t.percent))+'%"></span></span><strong>'+e(pct(t.percent))+'</strong><span class="muted small">'+e(t.earned+'/'+t.available)+'</span></div>').join('')+'</div><p class="small muted">Evidence from complete, included assessments only; low marks may indicate a topic to revisit.</p>':empty('No eligible topic-tagged evidence');
 return '<div class="profile-controls">'+select('profile-subject',p.subjects.map(x=>[x.enrolmentId,subjectName(x)+' · '+x.classInfo.code]),selected,'Subject')+
 btn('Open student analysis','profile-open-analysis',selected)+btn('Subject comments','subject-comments',selected)+'</div>'+
 '<div class="metrics profile-metrics">'+metric('Overall attainment',pct(r.average),'Grade '+(r.grade??'—'))+metric('Minimum target',r.minimumGrade??'—','Grade gap '+gradeGap(r.gapToTarget))+metric('Prediction',r.predictedGrade??'—','Grade gap '+gradeGap(r.gapToPrediction))+metric('Next grade',r.nextGrade?r.nextGrade.percentagePoints.toFixed(1)+' pp':'—',r.nextGrade?'To grade '+r.nextGrade.grade:'No next grade / no scored evidence')+'</div>'+
 '<div class="profile-analysis-grid">'+section('Attainment over time',trendChart(d),'analysisTrend')+section('Topic strengths and weaknesses',topicBody,'analysisTopics')+'</div>'+
 section('Published assessment history',table(['Assessment / unit','Date','Mark','%','Grade','Result','Summary status','Weight','Trend #','Cumulative %'],history,'Individual assessment history')+
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
  tag(c.status,c.state==='closed'?'':'tag-warning'),e(c.owner),
  e(displayDate(c.reviewDate))+(c.overdue?' '+tag('Overdue','tag-danger'):c.due?' '+tag('Due','tag-warning'):''),
  e(displayDate(c.updatedDate)),btn('View record','open-case',c.id)
 ]);
 return '<div class="metrics profile-metrics">'+metric('Active cases',p.activeCases.length,'Visible subject interventions')+
 metric('Reviews due',p.activeCases.filter(c=>c.due).length,p.activeCases.filter(c=>c.overdue).length+' overdue')+
 metric('Closed cases',p.closedCases.length,'Retained in history')+'</div>'+
 '<div class="profile-controls">'+p.subjects.filter(s=>s.canStart).map(s=>btn('Start Wave 1 · '+subjectName(s),'new-case',s.enrolmentId,'btn-primary')).join('')+'</div>'+
 section('Active interventions',table(['Subject / case','Stage','Owner','Review','Updated','Action'],rows(p.activeCases),'Active interventions'),'intervention')+
 section('Historic interventions',table(['Subject / case','Stage','Owner','Review','Updated','Action'],rows(p.closedCases),'Closed interventions'),'intervention')+
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
 const identity='<div class="profile-identity"><div class="profile-identity-main"><span class="profile-avatar" aria-hidden="true">'+e(student.name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join(''))+'</span><div><strong>'+e('Year '+student.year+' · '+student.tutorGroupName+' · '+student.house)+'</strong><p class="small muted">Demo pupil ID: '+e(student.id)+'</p><div class="tags">'+student.tags.map(t=>tag(t)).join('')+(p.activeCases.length?tag('SOC','tag-warning'):'')+'</div></div></div><div class="profile-identity-staff">'+facts([['Tutor group',e(student.tutorGroupName)],['Tutor',staffList(student.tutors)],['Head of House',staffList(student.houseHeads)]])+'</div></div>';
 const nav='<div class="profile-controls profile-navigation">'+(i>0?btn('‹ Previous','profile-switch',peers[i-1].id):'<button type="button" class="btn" disabled>‹ Previous</button>')+
 select('profile-pupil',peers.map(r=>[r.id,r.name]),student.id,'Pupil')+(i>=0&&i<peers.length-1?btn('Next ›','profile-switch',peers[i+1].id):'<button type="button" class="btn" disabled>Next ›</button>')+
 '<span class="small muted">'+e(i>=0?(i+1)+' of '+peers.length:'')+'</span></div>';
 const tabs='<div class="tabs profile-tabs" aria-label="Student profile views">'+PROFILE_TABS.map(([id,label])=>'<button type="button" class="tab" data-action="profile-tab" data-id="'+id+'" aria-pressed="'+(tab===id)+'">'+e(label)+'</button>').join('')+'</div>';
 const body=tab==='assessments'?assessments(w,p,detail):tab==='comments'?comments(p,detail):tab==='support'?support(p):overview(p);
 return {title:student.name,sub:'Student profile · All your authorised subject records',body:nav+identity+'<p class="small muted profile-scope-note">Profile shows all records permitted by your combined responsibilities. '+help('profileScope','profile scope')+'</p>'+tabs+'<div class="profile-tab-body">'+body+'</div>'};
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
