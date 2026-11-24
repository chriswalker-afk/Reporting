import {assetUrl,houseBadge,pupilIdentity,HOUSES} from './branding.mjs';
import {homeDashboard,HOME_PREVIEW} from './home-dashboard.mjs';
import {NAV,FUTURE,SCOPE_LABELS,ROLE_LABELS,WAVE_LABELS,ACTION_LABELS,HELP,pct,displayDate,gradeGap,matchText,sortRows,routeHash} from './workspace.mjs';
import {EVENTS,safeLink} from './communications.mjs';
import {GROUPS,DEFAULT_GROUPS,displayedRegisterColumns,registerLayout,registerFocusCounts,registerFocus,visibleRegisterRows} from './class-overview.mjs';
import {classTabs,renderMarkbook,renderBookDetail,bookId} from './markbook-views.mjs';
import {renderAcademicAnalysis,renderAnalysisEvidence} from './analysis-views.mjs';
import {ANALYSIS_TABS} from './academic-analysis.mjs';
import {filterStudents,profileCounts} from './student-profiles.mjs';
import {renderStudentProfile,renderProfileResult} from './student-profile-views.mjs';
import {renderCase,renderCaseStart,renderCaseAction,caseActionId} from './intervention-views.mjs';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 home:'M3 10 12 3l9 7v10h-6v-7H9v7H3z',notice:'M4 11V8l15-5v14L4 13z M7 14l2 6h4l-2-5 M19 8h2',
 class:'M3 4h18v13H3z M8 21h8 M12 17v4 M7 8h10 M7 12h7',
 students:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-4-4',
 support:'M8 3h8l1 3h4v15H3V6h4z M8 9h8 M8 13h8 M8 17h5',book:'M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3z M12 6v15',
 chart:'M3 3v18h18 M7 16v-5 M12 16V7 M17 16V4',shield:'M12 2 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6z',
 activity:'M3 12h4l3-7 4 14 3-7h4',calendar:'M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16',
 tool:'M14 6a5 5 0 0 0-6 6l-5 5 4 4 5-5a5 5 0 0 0 6-6l-4 3-3-3z',check:'M4 12l5 5L20 6',
 search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',info:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 11v6 M12 7h.01',
 close:'M6 6l12 12 M18 6 6 18',menu:'M3 6h18 M3 12h18 M3 18h18',arrow:'M5 12h14 M14 7l5 5-5 5',
 back:'M19 12H5 M10 7l-5 5 5 5',clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 6v6l4 2',
 edit:'M4 20l4-1 12-12-4-4L4 15z M13 6l4 4',lock:'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3',
 person:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2'
};
export const icon=name=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(icons[name]||icons.info)+'"/></svg>';
const help=(id,label)=>'<button type="button" class="help" data-help="'+esc(id)+'" aria-label="'+esc('About '+(label||id))+'" aria-expanded="false">'+icon('info')+'</button>';
const btn=(text,action,id='',kind='',ic='')=>'<button type="button" class="btn '+esc(kind)+'" data-action="'+esc(action)+'" data-id="'+esc(id)+'">'+(ic?icon(ic):'')+esc(text)+'</button>';
const link=(text,action,id)=>'<button type="button" class="inline-link" data-action="'+esc(action)+'" data-id="'+esc(id)+'">'+esc(text)+'</button>';
const tag=(text,kind='')=>'<span class="tag '+esc(kind)+'">'+esc(text)+'</span>';
const waveTag=c=>tag(c.status,c.state==='closed'?'':c.wave>=3?'tag-danger':c.wave===2?'tag-warning':'tag-teal');
const tags=p=>'<div class="tags">'+(p.tags.length?p.tags.map(t=>tag(t)).join(''):'<span class="muted">—</span>')+'</div>';
const empty=(title,detail='')=>'<div class="empty"><strong>'+esc(title)+'</strong>'+esc(detail)+'</div>';
const option=(id,label,selected)=>'<option value="'+esc(id)+'" '+(id===selected?'selected':'')+'>'+esc(label)+'</option>';
const select=(name,value,options,label)=>'<select class="select" id="'+esc(name)+'" aria-label="'+esc(label)+'">'+options.map(([id,title])=>option(id,title,value)).join('')+'</select>';
const field=(id,value,placeholder)=>'<input class="input" id="'+esc(id)+'" type="search" value="'+esc(value||'')+'" placeholder="'+esc(placeholder)+'" aria-label="'+esc(placeholder)+'">';
const panel=(title,content,actions='',info='')=>'<section class="surface"><div class="panel-head"><h2>'+esc(title)+(info?help(info,title):'')+'</h2>'+actions+'</div>'+content+'</section>';
const heading=(title,subtitle,actions='',over='Workspace')=>'<div class="page-heading"><div><p class="eyebrow">'+esc(over)+'</p><h1>'+esc(title)+'</h1><p class="subtitle">'+esc(subtitle)+'</p></div><div class="page-actions">'+actions+'</div></div>';
const note=text=>'<p class="stage-note">'+icon('info')+esc(text)+'</p>';
const metric=(label,value,foot='',hint='',action='')=>'<div class="metric"><div class="metric-head">'+esc(label)+(hint?help(hint,label):'')+'</div><div class="metric-value">'+esc(value)+'</div>'+(action?'<button class="metric-action" data-action="'+esc(action)+'">'+esc(foot)+' '+icon('arrow')+'</button>':'<div class="metric-foot">'+esc(foot)+'</div>')+'</div>';
const listRow=(title,subtitle,action,id,ic='arrow',right='')=>'<button type="button" class="list-row" data-action="'+esc(action)+'" data-id="'+esc(id)+'"><span class="list-icon">'+icon(ic)+'</span><span class="row-text"><strong>'+esc(title)+'</strong><small>'+esc(subtitle)+'</small></span>'+right+icon('arrow')+'</button>';
const sortHeader=(column,table,state)=>{
 const [key,label,info,sortable=true]=column,sort=state.sorts[table],active=sortable&&sort?.key===key;
 if(!sortable)return '<th scope="col">'+esc(label)+(info?help(info,label):'')+'</th>';
 const sticky=key===tableFirst[table]?' sticky-first':'';
 return '<th scope="col" class="'+sticky.trim()+'" '+(active?'aria-sort="'+(sort.direction==='desc'?'descending':'ascending')+'"':'')+'><button class="sort" data-action="sort" data-id="'+esc(table+':'+key)+'">'+esc(label)+'<span class="sort-glyph">'+(active?(sort.direction==='asc'?'↑':'↓'):'↕')+'</span></button>'+(info?help(info,label):'')+'</th>';
};
const tableFirst={classes:'code',homeClasses:'code',roster:'name',students:'name',cases:'studentName'};
function table(name,columns,rows,cell,state,{compact=false}={}){
 const sort=state.sorts[name],ordered=sort&&columns.some(c=>c[0]===sort.key)?sortRows(rows,sort.key,sort.direction):rows;
 if(!rows.length)return empty('No matching records','Try clearing a filter or choosing a different scope.');
 return '<div class="table-scroll '+(compact?'home-table':name==='roster'?'roster-table':'')+'" role="region" tabindex="0" aria-label="'+esc(name==='roster'?'Class register':name+' table')+'"><table class="data-table"><thead><tr>'+columns.map(c=>sortHeader(c,name,state)).join('')+'</tr></thead><tbody>'+
 ordered.map(row=>'<tr>'+columns.map(([key])=>'<td class="'+(key===tableFirst[name]?'sticky-first ':'')+(['mean','average','below','scored','students','cases','gapToTarget','subjects','latestPercent','nextGradePoints','coverageCount','gapToPrediction','noteCount'].includes(key)?'num':'')+'">'+cell(row,key)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
const classColumns=[['code','Class'],['students','Pupils'],['mean','Mean','average'],['scored','Coverage','coverage'],['below','Below MTG','target'],['cases','Cases','intervention'],['tracker','Assessments',null,false]];
function classCell(r,key){
 if(key==='code')return link(r.code,'open-class',r.id)+'<span class="cell-sub">'+esc(r.subject.name+' · '+r.teacher.replace(/ \(demo\)/g,''))+(r.partial?' · Scoped':'')+'</span>';
 if(key==='mean')return pct(r.mean);
 if(key==='scored')return esc(r.scored+'/'+r.students);
 if(key==='below')return r.below?link(r.below,'open-below',r.id):'0';
 if(key==='cases')return r.cases?link(r.cases,'class-cases',r.id):'0';
 if(key==='tracker')return btn('Tracker','home-markbook',r.id,'btn-quiet class-index-tracker','arrow');
 return esc(r[key]);
}
export function sidebar(page,w){
 return '<div class="brand"><button class="mobile-toggle btn btn-icon" data-action="close-menu" aria-label="Close navigation">'+icon('close')+'</button><img class="jis-crest" src="'+esc(assetUrl('jis-crest.webp'))+'" alt="Jerudong International School crest" width="44" height="44"><div><strong>JIS Hub</strong><small>STAFF WORKSPACE</small></div></div><div class="nav-heading">Staff workspace</div><nav class="nav-group" aria-label="Main navigation">'+NAV.map(([id,label,ic])=>'<a class="nav-link" href="'+routeHash(id)+'" data-action="navigate" data-id="'+id+'" '+(page===id?'aria-current="page"':'')+'>'+icon(ic)+esc(label)+'</a>').join('')+'</nav><hr class="sidebar-line"><div class="nav-heading">Future modules <span class="nav-coming-soon">Planned</span></div><div class="nav-group">'+FUTURE.map(([label,ic])=>'<span class="future-link" aria-disabled="true" title="Not available in this development pass">'+icon(ic)+esc(label)+'</span>').join('')+'</div><div class="sidebar-bottom"><strong>Version 2 · Complete demo</strong>Academic year '+esc(w.academicYear)+'<br>Fictional preview</div>';
}
export function topbar(w){
 return '<button type="button" class="btn btn-icon mobile-toggle" data-action="mobile-menu" aria-label="Open navigation" aria-expanded="false">'+icon('menu')+'</button><button type="button" class="search-launch" data-action="search">'+icon('search')+'<span>Search students, classes, staff…</span><kbd>/</kbd></button><div class="topbar-spacer"></div><div class="topbar-field"><label for="scope">Viewing</label>'+select('scope',w.scope,w.scopeOptions.map(s=>[s.id,s.label]),'Workspace scope')+help('scope','workspace scope')+'</div><div class="staff-field"><span class="avatar" aria-hidden="true">'+esc(w.staff.name.split(' ').slice(0,2).map(s=>s[0]).join(''))+'</span><div><label class="field-label" for="staff">Preview staff</label>'+select('staff',w.staff.id,w.staffOptions.map(s=>[s.id,s.name.replace(/ \(demo\)/g,'')]),'Preview fictional staff member')+'<span class="roles">'+esc(w.staff.roles.map(r=>ROLE_LABELS[r]).join(' · '))+'</span></div></div>';
}
const noticeBadge=n=>n.canAcknowledge?tag('Acknowledge','tag-warning'):n.acknowledged?tag('Acknowledged','tag-success'):n.priority==='urgent'?tag('Urgent','tag-danger'):n.priority==='important'?tag('Important','tag-warning'):n.status!=='active'?tag(n.status):'';
const deadlineBadge=d=>tag(({archived:'Archived',completed:'Done',overdue:'Overdue',today:'Due today',upcoming:'Upcoming'})[d.status]||d.status,d.status==='overdue'?'tag-danger':d.status==='today'?'tag-warning':d.status==='completed'?'tag-success':'');
const noticeRow=(w,n)=>listRow((n.pinned?'Pinned · ':'')+n.title,w.audienceLabel(n.audience)+' · '+displayDate(n.publishedDate),'open-notice',n.id,'notice',noticeBadge(n));
const deadlineRow=(w,d)=>listRow(d.title,w.audienceLabel(d.audience)+' · '+displayDate(d.dueDate),'open-deadline',d.id,'calendar',(d.recipient?'':tag('Oversight'))+deadlineBadge(d));
// Fixed-length previews keep Home an overview; the existing destinations hold the full data.
const homeTable=(columns,rows,label)=>rows.length?'<div class="table-scroll home-preview-table" role="region" tabindex="0" aria-label="'+esc(label)+'"><table class="data-table"><thead><tr>'+columns.map((c,i)=>'<th scope="col"'+(i===0?' class="sticky-first"':'')+'>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i===0?' class="sticky-first"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':empty('No records in this scope');
const homeCount=(n,kind='')=>'<span class="home-count '+kind+'">'+esc(n)+'</span>';
const homeGroupId=(g,below=false)=>JSON.stringify([g.key,g.value,below]);
function homeCohort(w,d){
 if(d.kind==='classes'){
  const rows=d.classes.slice(0,HOME_PREVIEW);
  return panel(d.context.panel,
   '<div class="home-panel-meta">Priority classes · highest number below MTG first</div>'+
   homeTable(['Class','Scored / pupils','Below MTG','Tracker'],rows.map(c=>[
    link(c.code,'open-class',c.id)+'<span class="cell-sub">'+esc(c.subject.name+' · '+c.teacher.replace(/ \(demo\)/g,''))+'</span>',
    esc(c.scored+'/'+c.students),c.below?link(String(c.below),'open-below',c.id):homeCount(0),
    btn('Tracker','home-markbook',c.id,'btn-quiet home-tracker')
   ]),'Priority classes')+
   '<div class="home-panel-footer"><span>Showing '+rows.length+' of '+d.classes.length+' classes</span>'+btn('All classes','go-classes','','btn-quiet','arrow')+'</div>','', 'belowSubjects');
 }
 if(d.kind==='pupils'){
  const rows=d.priorityPupils.slice(0,HOME_PREVIEW);
  return panel(d.context.panel,
   '<div class="home-panel-meta">Overdue reviews, attainment and evidence gaps first · '+d.counts.unknown+' pupils with unknown status</div>'+
   homeTable(['Student','Below MTG','Unknown','Cases'],rows.map(p=>[
    pupilIdentity(link(p.name,'open-student',p.id)+'<span class="cell-sub">TG '+esc(p.tutorGroupId)+'</span>',p),
    homeCount(p.below,p.below?'home-count-warning':''),homeCount(p.unknown),p.cases?link(String(p.cases),'open-student-support',p.id)+(p.due?' '+tag('Due','tag-warning'):''):homeCount(0)
   ]),'Tutees to review')+
   '<div class="home-panel-footer"><span>Showing '+rows.length+' of '+d.counts.pupils+' pupils</span>'+btn('All tutees','go-students','','btn-quiet','arrow')+'</div>','', 'profileTargets');
 }
 const groups=d.groups.slice(0,7);
 return panel(d.context.panel,
  '<div class="home-panel-meta">Unique pupils by '+(d.groupKey==='house'?'House':'year group')+' · '+d.counts.unknown+' pupils with unknown status</div>'+
  homeTable([d.groupKey==='house'?'House':'Year','Pupils','Below MTG','Unknown','SOC'],groups.map(g=>[
   g.houseId?pupilIdentity(link(g.label,'home-group',homeGroupId(g)),g.houseId):link(g.label,'home-group',homeGroupId(g)),
   esc(g.pupils),g.below?'<button type="button" class="home-group-progress" data-action="home-group" data-id="'+esc(homeGroupId(g,true))+'" aria-label="'+esc(g.label+': '+g.below+' pupils below minimum target')+'"><span class="home-mini-track" aria-hidden="true"><span style="width:'+100*g.below/g.pupils+'%"></span></span><strong>'+g.below+'</strong></button>':homeCount(0),
   homeCount(g.unknown),homeCount(g.cases)
  ]),'Scoped pupil groups')+
  '<div class="home-panel-footer"><span>Select a group or its below-MTG count</span>'+btn('All students','go-students','','btn-quiet','arrow')+'</div>','', 'homeGroupCounts');
}
function homeMetric(label,value,foot,hint,action,ic,tone=''){
 return '<div class="metric home-metric '+esc(tone)+'"><div class="home-metric-top"><span class="home-metric-icon">'+icon(ic)+'</span><div class="metric-head">'+esc(label)+help(hint,label)+'</div></div><div class="metric-value">'+esc(value)+'</div><button type="button" class="metric-action" data-action="'+esc(action)+'">'+esc(foot)+' '+icon('arrow')+'</button></div>';
}
export function renderHome(w,s){
 const d=homeDashboard(w),c=d.counts;
 const isClass=d.kind==='classes';
 const attention=d.shown.length?d.shown.map(q=>{
  if(q.kind==='notice')return listRow('Acknowledge: '+q.notice.title,w.audienceLabel(q.notice.audience),'open-notice',q.notice.id,'notice',tag(q.notice.priority==='urgent'?'Urgent':'Pending',q.notice.priority==='urgent'?'tag-danger':'tag-warning'));
  const a=q.action,r=w.caseDetail(a.caseId);
  return listRow(ACTION_LABELS[a.type],r.student.name+' · '+r.classInfo.code+' · '+displayDate(a.reviewDate),'case-action',caseActionId(r.id,a.type),'support',(a.reviewDate<w.asOf?tag('Overdue','tag-danger'):a.reviewDate===w.asOf?tag('Due today','tag-warning'):'')+houseBadge(r.student));
 }).join(''):empty('You are up to date','No outstanding notice acknowledgements or intervention actions.');
 const notices=d.notices.slice(0,3),deadlines=d.reportingRows.slice(0,3);
 const attentionPanel='<section id="attention-panel" class="surface home-attention" tabindex="-1" aria-labelledby="attention-title"><div class="panel-head"><h2 id="attention-title">Requires your attention '+help('personalActions','personal action queue')+'</h2><span class="home-total">'+d.queue.length+'</span></div><div class="home-panel-meta">'+(d.overdue?d.overdue+' overdue · ':'')+'All assigned responsibilities</div><div class="list">'+attention+'</div><div class="home-panel-footer"><span>'+ (d.queue.length?'Showing '+d.shown.length+' of '+d.queue.length:'No outstanding actions')+'</span></div><div class="attention-footer">'+btn('Interventions ('+d.actionCount+')','go-personal-actions','','btn-quiet')+btn('Notices ('+d.ackCount+')','go-acknowledgements','','btn-quiet')+'</div></section>';
 return '<div class="home-dashboard" data-home-scope="'+esc(w.scope)+'"><section class="jis-welcome home-welcome"><div class="jis-welcome-copy"><p class="eyebrow">Jerudong International School</p><h1>Welcome, '+esc(w.staff.name.split(' ')[0])+'</h1><div class="home-role-context"><span class="home-role-label">'+esc(d.context.label)+'</span><span class="home-context-name">'+esc(d.context.context)+'</span></div><div class="home-date">'+icon('calendar')+esc(displayDate(w.asOf))+' · Demo reference date '+help('date','reference date')+'</div></div><div class="jis-welcome-photo"><img src="'+esc(assetUrl('jis-campus.webp'))+'" alt="Aerial view of the JIS campus and coastline" width="240" height="120"><span class="home-values">Respect · Inspire · Challenge</span></div></section>'+
 '<div class="home-section-heading"><h2>At a glance</h2><span>'+esc(SCOPE_LABELS[w.scope])+' '+help('scope','workspace scope')+'</span></div>'+
 '<div class="metrics home-metrics">'+homeMetric('Pupils in scope',c.pupils,c.enrolments+' subject enrolments','scope','go-students','students')+
 homeMetric(isClass?'Subjects below MTG':'Pupils below MTG',isClass?c.belowSubjects:c.below,isClass?'View affected classes':'View affected pupils',isClass?'belowSubjects':'homeGroupCounts',isClass?'go-below':'go-students-below','chart', (isClass?c.belowSubjects:c.below)>0?'home-metric-caution':'')+
 homeMetric('Active interventions',c.activeCases,c.casePupils+' individual pupils','intervention','go-cases','support')+
 homeMetric('My outstanding actions',d.queue.length,d.overdue?d.overdue+' overdue · Review queue':'Review personal queue','personalActions','focus-attention','clock',d.overdue?'home-metric-alert':'')+'</div>'+
 '<div class="home-grid home-primary-grid">'+attentionPanel+'<div class="home-cohort">'+homeCohort(w,d)+'</div></div>'+
 '<div class="home-lower">'+panel('Latest notices','<div class="list">'+(notices.length?notices.map(n=>noticeRow(w,n)).join(''):empty('No additional active notices',d.ackCount?'Required acknowledgements are in your action queue.':''))+'</div>',btn('All notices','go-notices','','btn-quiet'),'notices')+
 panel(w.scope==='school'?'School reporting schedule':'Reporting reminders','<div class="list">'+(deadlines.length?deadlines.map(d=>deadlineRow(w,d)).join(''):empty('No open reporting reminders'))+'</div>',btn('Schedule ('+d.reportingRows.length+')','go-schedule','','btn-quiet'),'reporting')+'</div>'+
 note('Academic figures follow your selected scope. Personal actions and notice acknowledgements include all your assigned responsibilities. Select a row to open the relevant record.')+'</div>';
}
export function renderNotices(w,s){
 const comm=w.communications(),filter=s.noticeFilter||'active',deadlineFilter=s.deadlineFilter||'open';
 const notices=comm.notices.filter(n=>matchText(s.query,n.title,n.body,w.audienceLabel(n.audience),n.author)&&(
  filter==='all'||filter==='active'&&n.status==='active'||filter==='pending'&&n.canAcknowledge||
  filter==='archive'&&['archived','expired'].includes(n.status)||filter==='scheduled'&&n.status==='scheduled'));
 const board=notices.filter(n=>n.kind==='notice'),briefings=notices.filter(n=>n.kind==='briefing');
 const weeks=[...new Set(briefings.map(n=>n.week))].sort().reverse();
 const brief=weeks.map(week=>'<div class="week-label">Week commencing '+esc(displayDate(week))+'</div>'+briefings.filter(n=>n.week===week).map(n=>noticeRow(w,n)).join('')).join('');
 const deadlineRows=comm.deadlines.filter(d=>matchText(s.query,d.title,d.event,d.details,w.audienceLabel(d.audience))&&(
  deadlineFilter==='all'||deadlineFilter==='open'&&!d.archived&&!d.completed||deadlineFilter==='overdue'&&d.status==='overdue'||
  deadlineFilter==='completed'&&d.completed&&!d.archived||deadlineFilter==='archived'&&d.archived));
 const schedule=deadlineRows.length?'<div class="table-scroll reporting-table"><table class="data-table"><thead><tr><th>Deadline</th><th>Event</th><th>Audience</th><th>Date</th><th>My status</th></tr></thead><tbody>'+deadlineRows.map(d=>'<tr><td>'+link(d.title,'open-deadline',d.id)+'</td><td>'+esc(d.event)+'</td><td>'+esc(w.audienceLabel(d.audience))+'</td><td>'+esc(displayDate(d.dueDate))+'</td><td>'+(d.recipient||d.archived?deadlineBadge(d):tag('Oversight'))+'</td></tr>').join('')+'</tbody></table></div>':empty('No matching deadlines');
 return heading('Notices','Staff communications, briefings and reporting dates',
 (comm.publishAudiences.length?btn('Add notice','new-notice','','btn-primary','notice'):'')+help('notices','notice audience'),'Communication')+
 '<div class="metrics communication-metrics">'+metric('Active notices',comm.activeNotices.length,'Staff notices and briefings','notices','show-active-notices')+metric('Awaiting acknowledgement',comm.pendingAcknowledgements.length,'Your pending notices','acknowledgement','show-pending-notices')+metric('Open reporting reminders',comm.openDeadlines.length,comm.openDeadlines.filter(d=>d.status==='overdue').length+' overdue','reporting','focus-schedule')+'</div>'+
 '<div class="surface toolbar" style="margin-bottom:12px">'+field('page-query',s.query,'Search notices and deadlines')+select('notice-filter',filter,[['active','Active notices'],['pending','Awaiting acknowledgement'],['archive','Archive'],['scheduled','Scheduled'],['all','All accessible notices']],'Notice status')+'<span class="count">'+notices.length+' matching notices</span></div>'+
 '<div class="home-grid">'+panel('Staff noticeboard','<div class="list communication-list">'+(board.length?board.map(n=>noticeRow(w,n)).join(''):empty('No matching notices'))+'</div>')+
 panel('Briefing notices','<div class="list communication-list">'+(brief||empty('No matching briefings','Select Archive to see previous briefings.'))+'</div>',btn('Previous briefings','show-archive','','btn-quiet'))+'</div>'+
 '<div id="schedule-panel" tabindex="-1" style="margin-top:12px">'+panel('Reporting schedule',
 '<div class="toolbar">'+select('deadline-filter',deadlineFilter,[['open','Open / upcoming'],['overdue','Overdue'],['completed','My completed'],['archived','Archived'],['all','All accessible deadlines']],'Reporting schedule filter')+'<span class="count">'+deadlineRows.length+' deadlines</span></div>'+schedule,
 (comm.canManageDeadline?btn('Add deadline','new-deadline','','btn-primary','calendar'):'')+help('reporting','reporting schedule'))+'</div>'+
 note('Personal completion markers do not submit reports to external systems. Notice and deadline edits are saved in the fictional demo audit history.');
}
export function renderClasses(w,s){
 const all=sortRows(w.classRows(),'code'),current=all.findIndex(c=>c.id===s.classId);
 const quick=select('quick-class',s.classId||'', [['','All classes'],...all.map(c=>[c.id,c.code+' · '+c.subject.name])],'Quick class selector');
 const previous=current>0?btn('‹ Previous','open-class',all[current-1].id):'<button class="btn" disabled>‹ Previous</button>';
 const next=current>=0&&current<all.length-1?btn('Next ›','open-class',all[current+1].id):'<button class="btn" disabled>Next ›</button>';
 const unique=(rows,key)=>[...new Set(rows.map(r=>r[key]))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true}));
 const filter=(id,val,label,values)=>select(id,val??'all',[['all',label],...values.map(v=>[String(v),String(v)])],label);
 const rows=all.filter(r=>matchText(s.query,r.code,r.name,r.teacher,r.faculty.name,r.course.name)&&(!s.below||r.below>0)&&
  (!s.classYear||s.classYear==='all'||String(r.year)===s.classYear)&&(!s.classFaculty||s.classFaculty==='all'||r.faculty.name===s.classFaculty));
 if(!s.classId||!w.scopedClassIds.has(s.classId)){
  return heading('Classes',SCOPE_LABELS[w.scope]+' · '+all.length+' teaching groups',quick,'Academic workspace')+
  '<section class="surface"><div class="toolbar">'+field('page-query',s.query,'Filter class, subject or teacher')+
  filter('class-year',s.classYear,'All years',unique(all,'year'))+filter('class-faculty',s.classFaculty,'All faculties',[...new Set(all.map(c=>c.faculty.name))].sort())+
  '<label><input id="below-filter" type="checkbox" '+(s.below?'checked':'')+'> Classes with pupils below target</label>'+btn('Clear filters','clear-register-filters','','btn-quiet')+'<span class="count">'+rows.length+' classes</span></div>'+table('classes',classColumns,rows,classCell,s)+'</section>'+note('Means and coverage use the selected pupil scope. Select a class to open its Student Information tracker.');
 }
 const r=w.classRecord(s.classId),groups=s.columnGroups??DEFAULT_GROUPS,layout=registerLayout(groups),daily=layout==='daily',selected=visibleRegisterRows(r.roster,s,matchText,sortRows);
 const headingMarkup='<div class="class-heading">'+heading(r.code+' · '+r.subject.name,r.course.name+' · '+r.teacher,'<div class="class-switcher">'+btn('All classes','go-classes','','btn-quiet','back')+previous+quick+next+'</div>','Classes')+'</div>';
 if(s.classTab==='markbook')return headingMarkup+classTabs('markbook')+renderMarkbook(w,s,r);
 if(ANALYSIS_TABS.includes(s.classTab))return headingMarkup+classTabs(s.classTab)+renderAcademicAnalysis(w,s,r);
 const cols=displayedRegisterColumns(groups),gap=v=>'<span class="'+(v!==null&&v<0?'negative':v!==null&&v>=0?'positive':'')+'">'+esc(gradeGap(v))+'</span>';
 const cell=(p,k)=>{
  if(k==='name')return pupilIdentity(link(p.name,'open-student',p.studentId)+(daily?'<span class="register-pupil-meta"><span class="cell-sub">TG '+esc(p.tutorGroupId)+'</span>'+p.tags.map(t=>tag(t==='Access arrangements'?'AA':t)).join('')+'</span>':''),p);
  if(k==='tutorGroupId')return tag(p.tutorGroupId);
  if(k==='flags')return '<div class="tags">'+(p.tags.length?p.tags.map(t=>tag(t==='Access arrangements'?'AA':t)).join(''):'<span class="muted">—</span>')+'</div>';
  if(k==='wave'){
   const subject=p.active.map(c=>link('W'+c.wave,'open-case',c.id)).join(' ');
   const start=w.access.canStartWave1(p.enrolmentId)?link('+ W1','new-case',p.enrolmentId):'';
   return p.soc||start?'<div class="tags">'+(p.soc?tag('SOC','tag-warning')+(subject||link('Other','open-student-support',p.studentId)):'')+start+'</div>':'—';
  }
  if(k==='average')return '<span class="register-score">'+link(pct(p.average),'subject-summary',p.enrolmentId)+'</span>'+(daily?'<span class="cell-sub">Grade '+esc(p.grade??'—')+' · '+esc(p.coverage.scored+'/'+p.coverage.eligible)+' scored</span>':'');
  if(k==='latestPercent')return p.latestPercent===null?'—':link(pct(p.latestPercent)+' · '+p.latestGrade,'open-pupil-history',p.enrolmentId)+(daily?'<span class="cell-sub register-latest-date">'+esc(displayDate(p.latestDate))+'</span>':'');
  if(k==='latestTitle')return p.latestTitle?'<span class="cell-title">'+esc(p.latestTitle)+'</span><span class="cell-sub">'+esc(displayDate(p.latestDate))+'</span>':'—';
  if(k==='coverageCount')return link(p.coverage.scored+'/'+p.coverage.eligible,'subject-summary',p.enrolmentId);
  if(k==='gapToTarget'||k==='gapToPrediction')return gap(p[k])+(daily&&k==='gapToTarget'?'<span class="cell-sub">'+esc(p.track)+'</span>':'');
  if(k==='nextGradePoints')return p.nextGradePoints===null?'—':esc(p.nextGradePoints.toFixed(1)+' pp → '+p.nextGradeLabel);
  if(k==='minimumGrade')return p.targetEditable?link(p.minimumGrade??'Set','edit-target',p.enrolmentId):esc(p.minimumGrade??'—');
  if(k==='predictedGrade')return p.editable?link(p.predictedGrade??'Set grade','edit-prediction',p.enrolmentId):esc(p.predictedGrade??'—');
  if(k==='noteCount')return link(p.noteCount?String(p.noteCount)+(p.noteCount===1?' note':' notes'):p.canComment?'+ Add':'View','subject-comments',p.enrolmentId);
  if(k==='track')return tag(p.track,p.onTrack===null?'':p.onTrack?'tag-success':'tag-warning');
  return esc(p[k]??'—');
 };
 const counts=registerFocusCounts(r.roster),focus=registerFocus(s),advancedCount=[s.tutorFilter,s.houseFilter,s.flag].filter(v=>v&&v!=='all').length+(focus===null?1:0);
 const latest=w.markbook(r.id).assessments.filter(a=>a.status==='published'&&a.date<=w.asOf).at(-1);
 const focusButton=(id,label)=>'<button type="button" class="register-chip" data-action="register-focus" data-id="'+id+'" aria-pressed="'+(focus===id)+'">'+esc(label)+' <strong>'+counts[id]+'</strong></button>';
 const filtersOpen=Boolean(s.registerFiltersOpen),columnsOpen=Boolean(s.registerColumnsOpen);
 const toggle=(label,action,expanded,controls)=>'<button type="button" class="btn btn-quiet register-options-button" data-action="'+action+'" aria-expanded="'+expanded+'" aria-controls="'+controls+'">'+esc(label)+' <span aria-hidden="true">'+(expanded?'▴':'▾')+'</span></button>';
 const preset=(id,label)=>'<button type="button" class="column-toggle register-preset" data-action="register-preset" data-id="'+id+'" aria-pressed="'+(layout===id)+'">'+esc(label)+'</button>';
 return headingMarkup+classTabs('information')+
 '<div class="metrics class-metrics">'+metric('Pupils in scope',r.students,r.partial?'of '+r.total+' in class':'Full class','partial')+metric('Class mean',pct(r.mean),r.scored+'/'+r.students+' pupils scored','average')+metric('Below target',r.below,'Filter register','target','toggle-below')+metric('Active cases',r.cases,'Subject interventions','intervention','class-cases-current')+'</div>'+
 (r.partial?'<div class="info-box">This register is restricted to pupils in your selected scope. '+help('partial','partial class')+'</div>':'')+
 '<section class="surface class-register" data-register-layout="'+layout+'"><div class="panel-head register-heading"><div><h2>Class register '+help('registerViews','register views')+'</h2><p class="small muted">'+selected.length+' of '+r.students+' pupils · '+(daily?'Daily view':layout==='full'?'Full detail':'Custom columns')+'</p></div>'+
 (latest?'<div class="register-mark-shortcut">'+btn('Latest published assessment','open-markbook',bookId(r.id,latest.id),'btn-primary','book')+'<span class="small muted">'+esc(latest.title+' · '+displayDate(latest.date))+'</span></div>':'')+'</div>'+
 '<div class="register-toolbar"><div class="register-search">'+field('page-query',s.query,'Filter pupil or tutor group')+'</div><div class="register-focus" role="group" aria-label="Register focus">'+focusButton('all','All')+focusButton('below','Below MTG')+focusButton('unknown','Unknown')+focusButton('soc','SOC')+'</div><div class="register-filter-actions">'+toggle('Filters'+(advancedCount?' ('+advancedCount+')':''),'toggle-register-filters',filtersOpen,'register-extra-filters')+btn('Clear','clear-register-filters','','btn-quiet')+'</div></div>'+
 '<div id="register-extra-filters" class="toolbar register-filters register-extra-filters" '+(filtersOpen?'':'hidden')+'>'+
 filter('tutor-filter',s.tutorFilter,'All tutor groups',unique(r.roster,'tutorGroupId'))+filter('house-filter',s.houseFilter,'All Houses',unique(r.roster,'house'))+
 select('flag-filter',s.flag??'all',[['all','All flags'],...['EAL','SEN','HLP','Access arrangements','SOC'].map(t=>[t,t])],'Filter student tags')+
 select('track-filter',s.below?'below':s.trackFilter??'all',[['all','Any attainment'],['on','On track'],['below','Below target'],['unknown','Unknown']],'Target status')+
 select('support-filter',s.supportFilter??'all',[['all','Any support'],['soc','SOC'],['w1','Subject Wave 1'],['w2','Subject Wave 2'],['w3','Subject Wave 3'],['none','No visible active case']],'Intervention filter')+'</div>'+
 '<div class="register-layout-bar"><span class="field-label">View</span><div role="group" aria-label="Register layout">'+preset('daily','Daily')+preset('full','Full detail')+(layout==='custom'?'<span class="tag">Custom</span>':'')+'</div>'+toggle('Columns','toggle-register-columns',columnsOpen,'register-column-options')+
 '<span class="register-layout-note">'+(daily?'Grade and coverage grouped · click a result for evidence':'Individual sortable fields')+'</span></div>'+
 '<div id="register-column-options" class="column-toolbar" role="group" aria-label="Visible register column groups" '+(columnsOpen?'':'hidden')+'><span class="field-label">Columns</span>'+GROUPS.map(g=>'<button class="column-toggle" type="button" data-action="toggle-columns" data-id="'+esc(g.id)+'" aria-pressed="'+groups.includes(g.id)+'">'+esc(g.label)+'</button>').join('')+btn('Reset columns','reset-columns','','btn-quiet')+'</div>'+
 table('roster',cols,selected,cell,s)+'</section>'+note('Click attainment for contributing marks, latest result for the pupil’s subject history, or MTG, prediction and comments to edit where authorised. SOC reflects visible active cases; AA denotes access arrangements.');
}
export function renderStudents(w,s){
 const all=w.studentRows(),rows=filterStudents(all,s,matchText),c=profileCounts(all);
 const options=(values,label)=>[['all',label],...values.map(v=>[String(v),String(v)])];
 const unique=key=>[...new Set(all.map(p=>p[key]))].sort((a,b)=>String(a).localeCompare(String(b),'en',{numeric:true}));
 return heading('Students',SCOPE_LABELS[w.scope]+' · '+all.length+' unique pupils',help('profileScope','student directory scope'),'Student directory')+
 '<div class="metrics">'+metric('Pupils in scope',c.pupils,'Clear directory filters','profileScope','students-reset')+
 metric('Below target',c.below,c.severe+' with a subject at least two grades below','profileTargets','students-below')+
 metric('Active SOC',c.soc,'Pupils with visible active cases','soc','students-soc')+
 metric('Reviews due',c.due,'Pupils with due or overdue cases','due','students-due')+'</div>'+
 '<section class="surface"><div class="toolbar register-filters">'+field('page-query',s.query,'Filter name, ID, year or tutor group')+
 select('student-year',s.studentYear??'all',options(unique('year'),'All years'),'Year group')+
 select('tutor-filter',s.tutorFilter??'all',options(unique('tutorGroupId'),'All tutor groups'),'Tutor group')+
 select('house-filter',s.houseFilter??'all',options(unique('house'),'All Houses'),'House')+
 select('flag-filter',s.flag??'all',[['all','All flags'],...['EAL','SEN','HLP','Access arrangements','SOC'].map(t=>[t,t])],'Student flags')+
 select('student-attainment',s.studentAttainment??'all',[['all','Any attainment'],['below','At least one subject below MTG'],['severe','At least two grades below MTG'],['on','All subjects on / above MTG'],['unknown','Unknown subject status']],'Attainment status')+
 select('student-support',s.studentSupport??'all',[['all','Any support'],['active','Active SOC'],['due','Reviews due'],['none','No active case']],'Support status')+
 btn('Clear','students-reset','','btn-quiet')+'<span class="count">'+rows.length+' of '+all.length+' pupils</span></div>'+
 table('students',[['name','Student'],['year','Year'],['tutorGroupId','Tutor group','tutor'],['house','House'],['directoryFlags','Flags','flags'],['subjects','Subjects','profileScope'],['below','Below MTG','profileTargets'],['unknown','Unknown','profileTargets'],['cases','Active cases','intervention'],['due','Reviews due','due']],rows,(p,k)=>{
  if(k==='name')return pupilIdentity(link(p.name,'open-student',p.id)+'<span class="cell-sub">'+esc(p.id)+'</span>',p);
  if(k==='tutorGroupId')return tag(p.tutorGroupId);
  if(k==='directoryFlags')return tags({...p,tags:p.flags});
  if(k==='subjects')return esc(p.scored+'/'+p.subjects)+'<span class="cell-sub">Scored / visible</span>';
  if(k==='below')return p.below?link(String(p.below),'open-student',p.id)+(p.severe?' '+tag(p.severe+' ≥2 below','tag-warning'):''):'0';
  if(k==='unknown')return esc(p.unknown);
  if(k==='cases')return p.cases?link(p.cases+' · W'+p.wave,'open-student-support',p.id):'—';
  if(k==='due')return p.due?link(String(p.due),'open-student-support',p.id)+(p.overdue?' '+tag(p.overdue+' overdue','tag-danger'):''):'—';
  return esc(p[k]);
 },s)+'</section>'+note('Directory counts use the selected cohort and subject scope. Open a profile to see all records permitted by your combined responsibilities. No cross-subject average or automatic SOC classification is calculated.');
}
export function renderIntervention(w,s){
 const all=w.caseRows(),active=all.filter(c=>c.state!=='closed'),personal=w.allHome().actions;
 const filter=s.caseFilter??'active',actionMode=filter==='actions';
 const actionRows=personal.map(a=>({...w.caseDetail(a.caseId),actionType:a.type,actionDate:a.reviewDate}));
 const match=c=>matchText(s.query,c.studentName,c.classCode,c.house,c.student.tutorGroupId,c.reason,c.owner)&&
  (!s.caseClass||c.classInfo.id===s.caseClass)&&(!s.tutorFilter||s.tutorFilter==='all'||c.student.tutorGroupId===s.tutorFilter)&&
  (!s.houseFilter||s.houseFilter==='all'||c.house===s.houseFilter);
 const rows=actionMode?actionRows.filter(match):all.filter(c=>match(c)&&
  (filter==='all'||filter==='active'&&c.state!=='closed'||filter==='due'&&c.due||filter==='closed'&&c.state==='closed'||filter==='referrals'&&c.state.endsWith('_requested')||filter==='w'+c.wave&&c.state!=='closed'));
 const filterBase=actionMode?actionRows:all;
 const unique=fn=>[...new Set(filterBase.map(fn))].sort((a,b)=>String(a).localeCompare(String(b),'en',{numeric:true}));
 const opts=(values,label)=>[['all',label],...values.map(v=>[v,v])];
 const canStart=w.caseStartOptions().some(o=>o.scoped);
 const columns=[['studentName','Student'],['classCode','Class'],['house','House'],['status','Stage'],[actionMode?'actionDate':'reviewDate','Review / action date'],['owner','Case owner'],[actionMode?'actionType':'nextActions','Action','caseQueue']];
 return heading('Intervention',(actionMode?'All my responsibilities':SCOPE_LABELS[w.scope])+' · Shared academic support records',(canStart?btn('Start Wave 1','new-case','','btn-primary'):'')+help('caseWorkflow','Wave 1–3 workflow'),'Student support')+
 '<div class="metrics">'+metric('Active cases',active.length,new Set(active.map(c=>c.student.id)).size+' individual pupils','intervention','filter-active')+
 metric('Reviews due',active.filter(c=>c.due).length,active.filter(c=>c.overdue).length+' overdue','due','filter-due')+
 metric('My actions',personal.length,'Across all assigned responsibilities','caseQueue','go-personal-actions')+
 metric('Closed cases',all.length-active.length,'Retained in history','','filter-closed')+'</div>'+
 '<section class="surface"><div class="toolbar register-filters">'+field('page-query',s.query,'Filter pupil, class, owner or House')+
 select('case-filter',filter,[['active','Active'],['actions','My actions (all responsibilities)'],['due','Reviews due'],['referrals','Pending referrals'],['w1','Wave 1'],['w2','Wave 2'],['w3','Wave 3'],['closed','Closed'],['all','All cases']],'Intervention status')+
 select('tutor-filter',s.tutorFilter??'all',opts(unique(c=>c.student.tutorGroupId),'All tutor groups'),'Tutor group')+
 select('house-filter',s.houseFilter??'all',opts(unique(c=>c.house),'All Houses'),'House')+
 (s.caseClass?btn('Clear class filter','clear-case-class'):'')+btn('Clear filters','cases-reset','','btn-quiet')+
 '<span class="count">'+rows.length+(actionMode?' actions':' records')+'</span></div>'+
 table('cases',columns,rows,(c,k)=>{
  if(k==='studentName')return pupilIdentity(link(c.studentName,'open-case',c.id)+'<span class="cell-sub">TG '+esc(c.student.tutorGroupId)+'</span>',c.student);
  if(k==='status')return waveTag(c);
  if(k==='reviewDate'||k==='actionDate')return esc(displayDate(c[k]))+(c.state!=='closed'&&c[k]<w.asOf?' '+tag('Overdue','tag-danger'):c.state!=='closed'&&c[k]===w.asOf?' '+tag('Due today','tag-warning'):'');
  if(k==='actionType')return btn(ACTION_LABELS[c.actionType],'case-action',caseActionId(c.id,c.actionType),'btn-primary');
  if(k==='nextActions')return c.pending.length?'<div class="case-list-actions">'+c.pending.map(a=>btn(ACTION_LABELS[a.type],'case-action',caseActionId(c.id,a.type),'btn-quiet')).join('')+'</div>':link('View case','open-case',c.id);
  return esc(c[k]);
 },s)+'</section>'+note('One shared case per pupil and subject. My actions are personal handovers and due reviews, independent of the academic scope. Safeguarding remains separate; no external submission or email is performed.');
}

export function renderPage(w,s){return '<div class="workspace-inner">'+({home:renderHome,notices:renderNotices,classes:renderClasses,students:renderStudents,intervention:renderIntervention}[s.page]||renderHome)(w,s)+'</div>';}
const facts=entries=>'<dl class="drawer-summary">'+entries.map(([key,value])=>'<div class="fact"><dt>'+esc(key)+'</dt><dd>'+esc(value??'—')+'</dd></div>').join('')+'</dl>';
const section=(name,body)=>'<section class="drawer-section"><h3>'+esc(name)+'</h3><div class="content">'+body+'</div></section>';
const close=()=>'<button type="button" class="btn btn-icon" data-action="close-detail" aria-label="Close detail">'+icon('close')+'</button>';
const drawer=(title,sub,body,footer='')=>'<div class="dialog-head"><div><h2 id="detail-title">'+esc(title)+'</h2><p class="subtitle">'+esc(sub)+'</p></div>'+close()+'</div><div class="drawer-body">'+body+'</div><div class="drawer-footer">'+footer+btn('Close','close-detail')+'</div>';
export function renderDetail(w,detail){
 const {kind,id}=detail;
 if(kind==='demo-guide')return drawer('Demonstration guide','Version 2 · Fictional school records',
  '<p class="info-box">Switch fictional staff roles to see how the same records connect across the school. These shortcuts do not reset or change the records.</p>'+
  section('Faculty lead',listRow('Explore the Year 11 Mathematics tracker','Sam Taylor · enter a mark, open class analysis, inspect evidence','demo-scenario','faculty','class'))+
  section('Tutor',listRow('Explore the tutor-group student directory','Jordan Evans · compare subjects and open a pupil profile','demo-scenario','tutor','students'))+
  section('Head of House',listRow('Explore House interventions','Morgan Lee · review House cases and personal actions','demo-scenario','house','support'))+
  section('School leadership',listRow('Explore the school-wide workspace','Avery Reed · check reporting, referral actions and school scope','demo-scenario','leadership','person'))+
  section('House identities','<div class="house-directory">'+HOUSES.map(h=>houseBadge(h,{large:true,label:true})).join('')+'</div>')+
  note('Use Reset demo data in the footer to restore the original fictional examples. No live integration, real account or real pupil data is involved.'));
 if(kind==='analysis-evidence'){const d=renderAnalysisEvidence(w,id);return drawer(d.title,d.sub,d.body);}
 if(['unit-form','assessment-new','assessment-copy','assessment-edit','mark-grid','student-exclusion','assessment-exclusion','publish-assessment'].includes(kind)){
  const d=renderBookDetail(w,detail);return drawer(d.title,d.sub,d.body,d.footer??'');
 }
 if(kind==='student'){const d=renderStudentProfile(w,detail);return drawer(d.title,d.sub,d.body);}
 if(kind==='profile-result'){const d=renderProfileResult(w,id);return drawer(d.title,d.sub,d.body);}

 if(kind==='case'||kind==='case-new'||kind==='case-action'){
  const d=kind==='case'?renderCase(w,id):kind==='case-new'?renderCaseStart(w,id):renderCaseAction(w,id);
  return drawer(d.title,d.sub,d.body,d.footer??'');
 }

 if(kind==='notice'){
  const n=w.noticeDetail(id),editable=n.editable&&n.status!=='archived';
  const status=n.canAcknowledge?'Acknowledgement required':n.acknowledged?'Acknowledged by you':n.requiresAcknowledgement&&!n.recipient?'Oversight only':n.requiresAcknowledgement?'Not currently actionable':'No acknowledgement required';
  const resources=(n.links??[]).filter(safeLink);
  return drawer(n.title,n.kind==='briefing'?'Briefing notice':'Staff notice',
   facts([['Audience',w.audienceLabel(n.audience)],['Author',n.author],['Published',displayDate(n.publishedDate)],['Expires',displayDate(n.expiryDate)],['Status',n.status],['Priority',n.priority??'normal']])+
   section('Notice','<p>'+esc(n.body)+'</p>')+(resources.length?section('Resources',resources.map(url=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(url)+'</a>').join('')):'')+
   section('Acknowledgement','<p>'+esc(status)+' '+help('acknowledgement','notice acknowledgement')+'</p>'+(n.acknowledgementCount?'<p><strong>'+n.acknowledgementCount.done+' / '+n.acknowledgementCount.total+'</strong> current recipients acknowledged.</p>':'')+(n.canAcknowledge?btn('Acknowledge notice','ack-notice',id,'btn-primary','check'):'')+(n.acknowledged?tag('Acknowledged','tag-success'):'')),
   editable?btn('Archive','archive-notice',id,'btn-danger')+btn('Edit notice','edit-notice',id,'btn-primary','edit'):'');
 }
 if(kind==='deadline'){
  const d=w.deadlineDetail(id);
  return drawer(d.title,'Reporting schedule',facts([['Event',d.event],['Audience',w.audienceLabel(d.audience)],['Due date',displayDate(d.dueDate)],['My status',d.recipient?d.status:'Oversight only']])+
   section('Instructions','<p>'+esc(d.details||'No additional instructions.')+'</p>')+
   section('Personal reminder','<p>'+esc(HELP.reporting)+'</p>'+(d.recipient&&!d.archived?btn(d.completed?'Reopen my reminder':'Mark my reminder complete','toggle-deadline',id,d.completed?'':'btn-primary','check'):'')),
   d.editable&&!d.archived?btn('Archive','archive-deadline',id,'btn-danger')+btn('Edit deadline','edit-deadline',id,'btn-primary','edit'):'');
 }
 if(kind==='notice-form'||kind==='deadline-form'){
  const isNotice=kind==='notice-form',comm=w.communications(),existing=id?(isNotice?w.noticeDetail(id):w.deadlineDetail(id)):null;
  const audiences=isNotice?comm.publishAudiences:comm.deadlineAudiences;
  if(!audiences.length||existing&&(!existing.editable||existing.archived||existing.status==='archived'))throw Error('You cannot edit this record.');
  const key=a=>JSON.stringify({type:a.type,id:a.id}),selected=existing?key(existing.audience):key(audiences[0]);
  const check=(name,label,value)=>'<label class="check-field"><input type="checkbox" name="'+name+'" '+(value?'checked':'')+'> '+esc(label)+'</label>';
  const input=(name,label,value,type='text',required=true,max=160)=>'<label for="comm-'+name+'">'+esc(label)+'<input id="comm-'+name+'" class="input" name="'+name+'" type="'+type+'" value="'+esc(value??'')+'" '+(required?'required ':'')+(type==='text'?'maxlength="'+max+'"':'')+'></label>';
  const area=(name,label,value,max,required=false)=>'<label for="comm-'+name+'">'+esc(label)+'<textarea id="comm-'+name+'" name="'+name+'" class="input text-area" maxlength="'+max+'" rows="4" '+(required?'required':'')+'>'+esc(value??'')+'</textarea></label>';
  const choose=(name,label,value,options)=>'<label for="comm-'+name+'">'+esc(label)+'<select name="'+name+'" class="select" id="comm-'+name+'" required>'+options.map(([k,l])=>option(k,l,value)).join('')+'</select></label>';
  const common=input('title','Title',existing?.title)+choose('audience','Audience',selected,audiences.map(a=>[key(a),a.label]));
  const fields=isNotice?
    choose('kind','Type',existing?.kind??'notice',[['notice','Staff notice'],['briefing','Weekly briefing']])+common+
    area('body','Notice text',existing?.body,8000,true)+choose('priority','Priority',existing?.priority??'normal',[['normal','Normal'],['important','Important'],['urgent','Urgent']])+
    '<div class="form-columns">'+input('publishedDate','Publication date',existing?.publishedDate??w.asOf,'date')+input('expiryDate','Expiry date (optional)',existing?.expiryDate,'date',false)+'</div>'+
    area('links','HTTPS resource links (optional, one per line)',(existing?.links??[]).join('\n'),2500)+check('pinned','Pin this notice',existing?.pinned)+check('requiresAcknowledgement','Require staff acknowledgement',existing?.requiresAcknowledgement):
    common+choose('event','Reporting event',existing?.event??'Reports',EVENTS.map(x=>[x,x]))+input('dueDate','Due date',existing?.dueDate??w.asOf,'date')+area('details','Instructions (optional)',existing?.details,4000);
  return drawer((existing?'Edit ':'Add ')+(isNotice?'notice':'deadline'),isNotice?'Publish to an authorised staff audience':'Maintain the shared reporting schedule',
   '<form id="communication-form" class="form-stack">'+fields+(existing?'<div class="alert">'+check('confirmed',isNotice?'Confirm changes will reset current acknowledgements.':'Confirm changes will reset personal completion markers.',false)+'</div>':'')+
   '<div id="form-error" class="error" role="alert" hidden></div><button class="btn btn-primary" type="submit">'+icon('check')+esc(existing?'Save changes':isNotice?'Publish notice':'Save deadline')+'</button></form>');
 }
 if(kind==='archive-notice'||kind==='archive-deadline'){
  const isNotice=kind==='archive-notice',record=isNotice?w.noticeDetail(id):w.deadlineDetail(id);
  if(!record.editable||record.archived||record.status==='archived')throw Error('You cannot archive this record.');
  return drawer('Archive '+(isNotice?'notice':'deadline'),record.title,
    '<div class="alert">This removes the record from active views and reminders. Its history is retained.</div><form id="archive-form" class="form-stack"><label class="check-field"><input type="checkbox" name="confirmed" required> Confirm archive</label><div id="form-error" class="error" role="alert" hidden></div><button class="btn btn-danger" type="submit">Archive record</button></form>');
 }
 if(kind==='staff'){
  const d=w.staffDetail(id);
  return drawer(d.staff.name,'Fictional staff directory',facts([['Roles',d.staff.roles.map(r=>ROLE_LABELS[r]).join(', ')]])+section('Accessible teaching groups',d.classes.length?d.classes.map(c=>listRow(c.code,c.name,'open-class',c.id,'class')).join(''):empty('No teaching groups in your access scope')));
 }
 if(kind==='subject-summary'){
  const d=w.subjectDetail(id),r=d.summary,c=r.coverage;
  const resultRows=r.results.length?'<div class="table-scroll"><table class="data-table"><thead><tr><th>Assessment</th><th>Date</th><th>Mark</th><th>%</th><th>Grade</th><th>Status</th></tr></thead><tbody>'+r.results.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(displayDate(x.date))+'</td><td>'+esc(x.rawMark===null?'—':x.rawMark+'/'+x.maxMarks)+'</td><td>'+esc(pct(x.percent))+'</td><td>'+esc(x.grade??'—')+'</td><td>'+esc(x.status)+'</td></tr>').join('')+'</tbody></table></div>':empty('No eligible assessment records');
  return drawer(d.student.name,r.classInfo.code+' · Assessment summary',
   facts([['Overall percentage',pct(r.average)],['Current grade',r.grade],['Most recent',r.latest?pct(r.latest.percent)+' · '+r.latest.grade:'—'],['Minimum target',r.minimumGrade],['Prediction',r.predictedGrade],['Next grade',r.nextGrade?r.nextGrade.percentagePoints.toFixed(1)+' pp → '+r.nextGrade.grade:'—']])+
   section('Calculation coverage','<p>'+esc(c.scored+' of '+c.eligible+' eligible results scored · '+c.absent+' absent · '+c.missing+' missing · '+c.incomplete+' incomplete · '+c.excluded+' excluded')+'</p><p class="muted">'+esc(HELP.studentAverage)+'</p>')+
   section('Contributing assessment records',resultRows+'<p class="small muted">Drafts and whole-assessment exclusions are not included in this summary.</p>'),btn('Full assessment history','open-pupil-history',id,'btn-primary')+btn('Subject comments','subject-comments',id,'btn-quiet'));
 }
 if(kind==='subject-comments'){
  const d=w.subjectDetail(id);
  const history=d.notes.length?d.notes.map(n=>'<article class="comment-record"><div class="comment-meta"><strong>'+esc(n.author)+'</strong><span class="small muted">'+esc(displayDate(n.date))+(n.updatedDate?' · edited '+esc(displayDate(n.updatedDate)):'')+'</span></div><p>'+esc(n.text)+'</p>'+(n.editable?btn('Edit my comment','edit-comment',n.id,'btn-quiet','edit'):'')+'</article>').join(''):empty('No subject comments');
  const form=d.canComment?'<form id="comment-form" class="form-stack"><label for="comment-text">Add academic comment<textarea id="comment-text" class="input text-area" name="text" maxlength="2000" rows="3" required placeholder="Record a fictional academic observation or next step"></textarea></label><div id="form-error" class="error" role="alert" hidden></div><button class="btn btn-primary" type="submit">'+icon('check')+'Save comment</button></form>':'<p class="muted small">Read only. Only the assigned class teacher can add a comment.</p>';
  return drawer(d.student.name,d.summary.classInfo.code+' · Subject comments',section('New comment',form)+section('Comment history',history)+note(HELP.comments));
 }
 if(kind==='comment-edit'){
  const n=w.noteDetail(id);if(!n.editable)throw Error('Only the assigned author can edit this subject comment');
  return drawer('Edit subject comment',n.subject.student.name+' · '+n.subject.summary.classInfo.code,
   '<form id="comment-form" class="form-stack"><label for="comment-text">Academic comment<textarea id="comment-text" class="input text-area" name="text" maxlength="2000" rows="4" required>'+esc(n.text)+'</textarea></label><div id="form-error" class="error" role="alert" hidden></div><button class="btn btn-primary" type="submit">'+icon('check')+'Save changes</button></form>');
 }
 if(kind==='target'){
  const d=w.subjectDetail(id),r=d.summary;
  if(!d.targetEditable)throw Error('Only relevant faculty leadership can edit the minimum target');
  return drawer('Edit minimum target',d.student.name+' · '+r.classInfo.code,facts([['Current grade',r.grade],['Existing target',r.minimumGrade],['Prediction',r.predictedGrade]])+
   '<form id="target-form" class="form-stack"><label for="minimum-target">Minimum target grade'+select('minimum-target',r.minimumGrade??'',r.grades.map(g=>[g,g]),'Minimum target grade')+'</label><div class="alert">'+esc(HELP.minimumTarget)+'<label class="check-field"><input type="checkbox" name="confirmed" required> Confirm the revised target</label></div><div id="form-error" class="error" role="alert" hidden></div><button class="btn btn-primary" type="submit">'+icon('check')+'Save target</button></form>');
 }
 if(kind==='prediction'){
  const subject=w.subjectDetail(id),d={student:subject.student},r=subject.summary;
  if(!r||!r.editable)throw Error('Only the assigned teacher can edit this prediction');
  return drawer('Edit predicted grade',d.student.name+' · '+r.classInfo.code,facts([['Current grade',r.grade],['Minimum target',r.minimumGrade],['Existing prediction',r.predictedGrade]])+'<form id="prediction-form" class="form-stack"><label for="prediction">Teacher prediction'+select('prediction',r.predictedGrade??'',[['','Not entered'],...r.grades.map(g=>[g,g])],'Predicted grade')+'</label><div class="info-box">'+esc(HELP.edit)+'</div><div id="form-error" class="error" role="alert" hidden></div><button class="btn btn-primary" type="submit">'+icon('check')+'Save prediction</button></form>');
 }
 throw Error('Unknown detail');
}
export function renderSearchResults(w,q){
 const rows=w.search(q);
 if(!q.trim())return empty('Search your accessible workspace','Try a student name, class code, tutor group or staff member.');
 if(!rows.length)return empty('No results in your access scope');
 return rows.map(r=>'<button type="button" class="search-result" data-action="search-result" data-id="'+esc(r.kind+':'+r.id)+'">'+(r.houseId?houseBadge(r.houseId):'<span class="list-icon">'+icon({student:'students',class:'class',case:'support',notice:'notice',deadline:'calendar',staff:'person'}[r.kind])+'</span>')+'<span class="row-text"><strong>'+esc(r.title)+'</strong><small>'+esc(r.sub)+'</small></span>'+tag(r.kind==='case'?'Intervention':r.kind[0].toUpperCase()+r.kind.slice(1))+icon('arrow')+'</button>').join('');
}
