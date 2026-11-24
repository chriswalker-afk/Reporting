import {NAV,FUTURE,SCOPE_LABELS,ROLE_LABELS,WAVE_LABELS,ACTION_LABELS,HELP,pct,displayDate,gradeGap,matchText,sortRows,routeHash} from './workspace.mjs';
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
 const [key,label,info]=column,sort=state.sorts[table],active=sort?.key===key;
 const sticky=key===tableFirst[table]?' sticky-first':'';
 return '<th scope="col" class="'+sticky.trim()+'" '+(active?'aria-sort="'+(sort.direction==='desc'?'descending':'ascending')+'"':'')+'><button class="sort" data-action="sort" data-id="'+esc(table+':'+key)+'">'+esc(label)+'<span class="sort-glyph">'+(active?(sort.direction==='asc'?'↑':'↓'):'↕')+'</span></button>'+(info?help(info,label):'')+'</th>';
};
const tableFirst={classes:'code',homeClasses:'code',roster:'name',students:'name',cases:'studentName'};
function table(name,columns,rows,cell,state,{compact=false}={}){
 const sort=state.sorts[name],ordered=sort?sortRows(rows,sort.key,sort.direction):rows;
 if(!rows.length)return empty('No matching records','Try clearing a filter or choosing a different scope.');
 return '<div class="table-scroll '+(compact?'home-table':'')+'" role="region" tabindex="0" aria-label="'+esc(name==='roster'?'Class register':name+' table')+'"><table class="data-table"><thead><tr>'+columns.map(c=>sortHeader(c,name,state)).join('')+'</tr></thead><tbody>'+
 ordered.map(row=>'<tr>'+columns.map(([key])=>'<td class="'+(key===tableFirst[name]?'sticky-first ':'')+(['mean','average','below','scored','students','cases','gapToTarget','subjects'].includes(key)?'num':'')+'">'+cell(row,key)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
const classColumns=[['code','Class'],['students','Pupils'],['mean','Mean','average'],['scored','Coverage','coverage'],['below','Below MTG','target'],['cases','Cases','intervention']];
function classCell(r,key){
 if(key==='code')return link(r.code,'open-class',r.id)+'<span class="cell-sub">'+esc(r.subject.name+' · '+r.teacher.replace(/ \(demo\)/g,''))+(r.partial?' · Scoped':'')+'</span>';
 if(key==='mean')return pct(r.mean);
 if(key==='scored')return esc(r.scored+'/'+r.students);
 if(key==='below')return r.below?link(r.below,'open-below',r.id):'0';
 if(key==='cases')return r.cases?link(r.cases,'class-cases',r.id):'0';
 return esc(r[key]);
}
export function sidebar(page,w){
 return '<div class="brand"><span class="brand-symbol" aria-hidden="true">J</span><div><strong>JIS Hub</strong><small>STAFF WORKSPACE</small></div></div><div class="nav-heading">Workspace</div><nav class="nav-group" aria-label="Main navigation">'+NAV.map(([id,label,ic])=>'<a class="nav-link" href="'+routeHash(id)+'" data-action="navigate" data-id="'+id+'" '+(page===id?'aria-current="page"':'')+'>'+icon(ic)+esc(label)+'</a>').join('')+'</nav><hr class="sidebar-line"><div class="nav-heading">Future modules</div><div class="nav-group">'+FUTURE.map(([label,ic])=>'<span class="future-link" aria-disabled="true" title="Not available in this development pass">'+icon(ic)+esc(label)+'</span>').join('')+'</div><div class="sidebar-bottom"><strong>Version 2 · Design system</strong>Academic year '+esc(w.academicYear)+'<br>Fictional preview</div>';
}
export function topbar(w){
 return '<button type="button" class="btn btn-icon mobile-toggle" data-action="mobile-menu" aria-label="Open navigation" aria-expanded="false">'+icon('menu')+'</button><button type="button" class="search-launch" data-action="search">'+icon('search')+'<span>Search students, classes, staff…</span><kbd>/</kbd></button><div class="topbar-spacer"></div><div class="topbar-field"><label for="scope">Scope</label>'+select('scope',w.scope,w.scopeOptions.map(s=>[s.id,s.label]),'Workspace scope')+help('scope','workspace scope')+'</div><div class="staff-field"><span class="avatar" aria-hidden="true">'+esc(w.staff.name.split(' ').slice(0,2).map(s=>s[0]).join(''))+'</span><div><label class="field-label" for="staff">Preview staff</label>'+select('staff',w.staff.id,w.staffOptions.map(s=>[s.id,s.name.replace(/ \(demo\)/g,'')]),'Preview fictional staff member')+'<span class="roles">'+esc(w.staff.roles.map(r=>ROLE_LABELS[r]).join(' · '))+'</span></div></div>';
}
export function renderHome(w,s){
 const h=w.home(),c=h.cohort,classes=sortRows(w.classRows(),'code'),actions=h.actions;
 const classTable=table('homeClasses',classColumns,classes,classCell,s,{compact:true});
 const actionList=actions.length?actions.slice(0,4).map(a=>{const r=w.caseDetail(a.caseId);return listRow(ACTION_LABELS[a.type],r.student.name+' · '+r.classInfo.code+' · '+displayDate(a.reviewDate),'open-case',r.id,'support',r.overdue?tag('Overdue','tag-danger'):'');}).join(''):empty('No outstanding intervention actions','Actions in your selected scope appear here.');
 const notices=h.notices.slice().sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)).slice(0,3);
 return heading('Welcome, '+w.staff.name.split(' ')[0],displayDate(w.asOf)+' · '+SCOPE_LABELS[w.scope],tag('Demo reference date')+help('date','reference date'),'Your workspace')+
 '<div class="metrics">'+metric('Pupils',c.students,c.enrolments+' subject enrolments','scope','go-students')+metric('Below minimum target',c.belowTarget.length,'Subject enrolments','target','go-below')+metric('Active interventions',c.interventions.active,c.interventions.students+' individual pupils','intervention','go-cases')+metric('Actions requiring attention',actions.length,'Open your action queue','due','go-actions')+'</div>'+
 '<div class="home-grid">'+panel('Class overview',classTable,btn('View classes','go-classes','','btn-quiet','arrow'),'average')+panel('Requires your attention','<div class="list">'+actionList+'</div>',btn('All actions','go-actions','','btn-quiet'))+'</div>'+
 '<div class="home-lower">'+panel('Latest notices','<div class="list">'+(notices.length?notices.map(n=>listRow(n.title,w.audienceLabel(n.audience)+' · '+displayDate(n.publishedDate),'open-notice',n.id,'notice')).join(''):empty('No active notices'))+'</div>',btn('All notices','go-notices','','btn-quiet'),'notices')+panel('Upcoming deadlines','<div class="list">'+(h.deadlines.length?h.deadlines.slice(0,3).map(d=>'<div class="list-row"><span class="list-icon">'+icon('calendar')+'</span><span class="row-text"><strong>'+esc(d.title)+'</strong><small>'+esc(w.audienceLabel(d.audience))+'</small></span><span class="nowrap small">'+esc(displayDate(d.dueDate))+'</span></div>').join(''):empty('No upcoming deadlines'))+'</div>',btn('Schedule','go-notices','','btn-quiet'))+'</div>'+
 note('Live calculations from V2 fictional records. Home and Notices workflows are expanded in V2-03.');
}
export function renderNotices(w,s){
 const h=w.allHome(),notices=h.notices.filter(n=>matchText(s.query,n.title,n.body,w.audienceLabel(n.audience)));
 const list=kind=>notices.filter(n=>n.kind===kind).sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)).map(n=>listRow(n.title,w.audienceLabel(n.audience)+' · '+displayDate(n.publishedDate),'open-notice',n.id,'notice')).join('')||empty('No matching notices');
 return heading('Notices','Staff communications, briefings and reporting dates',help('notices','notice audience'),'Communication')+
 '<div class="surface toolbar" style="margin-bottom:12px">'+field('page-query',s.query,'Search notices')+'<span class="count">'+notices.length+' active notices</span></div>'+
 '<div class="home-grid">'+panel('Staff noticeboard','<div class="list">'+list('notice')+'</div>')+panel('Briefing notices','<div class="list">'+list('briefing')+'</div>')+'</div><div style="margin-top:12px">'+panel('Reporting schedule',h.deadlines.length?'<div class="table-scroll"><table class="data-table"><thead><tr><th>Deadline</th><th>Audience</th><th>Date</th></tr></thead><tbody>'+h.deadlines.map(d=>'<tr><td>'+esc(d.title)+'</td><td>'+esc(w.audienceLabel(d.audience))+'</td><td>'+esc(displayDate(d.dueDate))+'</td></tr>').join('')+'</tbody></table></div>':empty('No upcoming deadlines'))+'</div>'+note('Read-only preview. Notice creation, acknowledgement and deadline management are planned for V2-03.');
}
export function renderClasses(w,s){
 const all=sortRows(w.classRows(),'code');
 const quick=select('quick-class',s.classId||'', [['','All classes'],...all.map(c=>[c.id,c.code+' · '+c.subject.name])],'Quick class selector');
 const rows=all.filter(r=>matchText(s.query,r.code,r.name,r.teacher,r.faculty.name,r.course.name));
 if(!s.classId||!w.scopedClassIds.has(s.classId)){
  return heading('Classes',SCOPE_LABELS[w.scope]+' · '+all.length+' teaching groups',quick,'Academic workspace')+
  '<section class="surface"><div class="toolbar">'+field('page-query',s.query,'Filter class, subject or teacher')+'<span class="count">'+rows.length+' classes</span></div>'+table('classes',classColumns,rows,classCell,s)+'</section>'+note('Means and coverage use the selected pupil scope. The full tracker and assessment editor are developed in V2-04 and V2-05.');
 }
 const r=w.classRecord(s.classId);
 const selected=r.roster.filter(p=>matchText(s.query,p.name,p.tutorGroupId,p.house,p.tags)&&
  (s.flag==='all'||p.tags.includes(s.flag))&&(!s.below||p.gapToTarget!==null&&p.gapToTarget<0));
 const cols=[['name','Student'],['tutorGroupId','Tutor group','tutor'],['house','House'],['tags','Flags','flags'],['active','Intervention','intervention'],
  ['average','Average','average'],['grade','Grade'],['minimumGrade','MTG','target'],['predictedGrade','Prediction','predicted'],['gapToTarget','Δ target','target']];
 const cell=(p,k)=>{
  if(k==='name')return link(p.name,'open-student',p.studentId);
  if(k==='tutorGroupId')return tag('TG '+p.tutorGroupId);
  if(k==='tags')return tags(p);
  if(k==='active')return p.active.length?p.active.map(c=>link('W'+c.wave,'open-case',c.id)).join(' '):'—';
  if(k==='average')return pct(p.average);
  if(k==='gapToTarget')return '<span class="'+(p.gapToTarget<0?'negative':p.gapToTarget>=0&&p.gapToTarget!==null?'positive':'')+'">'+esc(gradeGap(p.gapToTarget))+'</span>';
  if(k==='predictedGrade')return p.editable?link(p.predictedGrade??'Set grade','edit-prediction',p.enrolmentId):esc(p.predictedGrade??'—');
  return esc(p[k]??'—');
 };
 return heading(r.code+' · '+r.subject.name,r.course.name+' · '+r.teacher,quick+btn('All classes','go-classes','','','back'),'Classes')+
 '<div class="metrics">'+metric('Pupils in scope',r.students,r.partial?'of '+r.total+' in class':'Full class','partial')+metric('Class mean',pct(r.mean),r.scored+'/'+r.students+' pupils scored','average')+metric('Below target',r.below,'Filter register','target','toggle-below')+metric('Active cases',r.cases,'Subject interventions','intervention','class-cases-current')+'</div>'+
 '<div class="tabs" aria-label="Class views"><button class="tab" aria-pressed="true">Student information</button>'+['Assessment tracker','Student analysis','Class analysis','Faculty analysis'].map(t=>'<button class="tab" disabled title="Available in a later development pass">'+esc(t)+'</button>').join('')+'</div>'+
 (r.partial?'<div class="info-box">This register is restricted to pupils in your selected scope. '+help('partial','partial class')+'</div>':'')+
 '<section class="surface"><div class="toolbar">'+field('page-query',s.query,'Filter pupil or tutor group')+select('flag-filter',s.flag,[['all','All flags'],...['EAL','SEN','HLP','Access arrangements'].map(t=>[t,t])],'Filter student tags')+'<label><input id="below-filter" type="checkbox" '+(s.below?'checked':'')+'> Below target</label><span class="count">'+selected.length+' of '+r.students+' pupils</span></div>'+table('roster',cols,selected,cell,s)+'</section>'+note('The visible register is connected to V2 results. Predicted grades may be edited by assigned teachers; the full assessment tracker follows in V2-05.');
}
export function renderStudents(w,s){
 const all=w.studentRows(),rows=all.filter(p=>matchText(s.query,p.name,p.id,p.year,p.tutorGroupId,p.house,p.tags)&&(s.flag==='all'||p.tags.includes(s.flag)));
 return heading('Students',SCOPE_LABELS[w.scope]+' · '+all.length+' unique pupils','','Student directory')+
 '<section class="surface"><div class="toolbar">'+field('page-query',s.query,'Filter name, year, House or tutor group')+select('flag-filter',s.flag,[['all','All flags'],...['EAL','SEN','HLP','Access arrangements'].map(t=>[t,t])],'Filter student tags')+'<span class="count">'+rows.length+' of '+all.length+' pupils</span></div>'+
 table('students',[['name','Student'],['year','Year'],['tutorGroupId','Tutor group','tutor'],['house','House'],['tags','Flags','flags'],['subjects','Subjects in scope'],['cases','Active cases','intervention']],rows,(p,k)=>{
  if(k==='name')return link(p.name,'open-student',p.id)+'<span class="cell-sub">'+esc(p.id)+'</span>';
  if(k==='tutorGroupId')return tag('TG '+p.tutorGroupId);
  if(k==='tags')return tags(p);
  if(k==='cases')return p.cases?link(p.cases+' · W'+p.wave,'open-student',p.id):'—';
  return esc(p[k]);
 },s)+'</section>'+note('Open a pupil for a cross-subject preview. Full four-tab student profiles follow in V2-07.');
}
export function renderIntervention(w,s){
 const all=w.caseRows(),active=all.filter(c=>c.state!=='closed'),h=w.home();
 const actionIds=new Set(h.actions.map(a=>a.caseId));
 const rows=all.filter(c=>matchText(s.query,c.studentName,c.classCode,c.house,c.student.tutorGroupId,c.reason)&&
  (!s.caseClass||c.classInfo.id===s.caseClass)&&
  (s.caseFilter==='all'||s.caseFilter==='active'&&c.state!=='closed'||s.caseFilter==='due'&&c.due||s.caseFilter==='actions'&&actionIds.has(c.id)||s.caseFilter==='closed'&&c.state==='closed'||s.caseFilter==='w'+c.wave&&c.state!=='closed'));
 return heading('Intervention',SCOPE_LABELS[w.scope]+' · Shared student support records',help('intervention','intervention counts'),'Student support')+
 '<div class="metrics">'+metric('Active cases',active.length,new Set(active.map(c=>c.student.id)).size+' individual pupils','intervention','filter-active')+metric('Reviews due',active.filter(c=>c.due).length,active.filter(c=>c.overdue).length+' overdue','due','filter-due')+metric('Your actions',h.actions.length,'Relevant hand-offs and reviews','','go-actions')+metric('Closed cases',all.length-active.length,'Retained in history','','filter-closed')+'</div>'+
 '<section class="surface"><div class="toolbar">'+field('page-query',s.query,'Filter pupil, class or House')+select('case-filter',s.caseFilter,[['active','Active'],['actions','My actions'],['due','Reviews due'],['w1','Wave 1'],['w2','Wave 2'],['w3','Wave 3'],['closed','Closed'],['all','All cases']],'Intervention status')+(s.caseClass?btn('Clear class filter','clear-case-class'):'')+'<span class="count">'+rows.length+' records</span></div>'+
 table('cases',[['studentName','Student'],['classCode','Class'],['house','House'],['status','Stage'],['reviewDate','Review date'],['owner','Case owner']],rows,(c,k)=>{
  if(k==='studentName')return link(c.studentName,'open-case',c.id)+'<span class="cell-sub">TG '+esc(c.student.tutorGroupId)+'</span>';
  if(k==='status')return waveTag(c);
  if(k==='reviewDate')return esc(displayDate(c.reviewDate))+(c.overdue?' '+tag('Overdue','tag-danger'):'');
  return esc(c[k]);
 },s)+'</section>'+note('This is the connected read-only intervention preview. Wave transitions, reviews and study-plan editing follow in V2-08; safeguarding remains separate.');
}
export function renderPage(w,s){return '<div class="workspace-inner">'+({home:renderHome,notices:renderNotices,classes:renderClasses,students:renderStudents,intervention:renderIntervention}[s.page]||renderHome)(w,s)+'</div>';}
const facts=entries=>'<dl class="drawer-summary">'+entries.map(([key,value])=>'<div class="fact"><dt>'+esc(key)+'</dt><dd>'+esc(value??'—')+'</dd></div>').join('')+'</dl>';
const section=(name,body)=>'<section class="drawer-section"><h3>'+esc(name)+'</h3><div class="content">'+body+'</div></section>';
const close=()=>'<button type="button" class="btn btn-icon" data-action="close-detail" aria-label="Close detail">'+icon('close')+'</button>';
const drawer=(title,sub,body,footer='')=>'<div class="dialog-head"><div><h2 id="detail-title">'+esc(title)+'</h2><p class="subtitle">'+esc(sub)+'</p></div>'+close()+'</div><div class="drawer-body">'+body+'</div><div class="drawer-footer">'+footer+btn('Close','close-detail')+'</div>';
export function renderDetail(w,detail){
 const {kind,id}=detail;
 if(kind==='student'){
  const d=w.studentDetail(id),p=d.student;
  const academics=d.subjects.length?'<div class="table-scroll"><table class="data-table"><thead><tr><th>Subject / class</th><th>Average</th><th>Grade</th><th>MTG</th><th>Pred.</th></tr></thead><tbody>'+d.subjects.map(r=>'<tr><td>'+link(r.classInfo.subject.name,'open-class',r.classId)+'<span class="cell-sub">'+esc(r.classInfo.code)+'</span></td><td>'+pct(r.average)+'</td><td>'+esc(r.grade??'—')+'</td><td>'+esc(r.minimumGrade??'—')+'</td><td>'+(r.editable?link(r.predictedGrade??'Set','edit-prediction',r.enrolmentId):esc(r.predictedGrade??'—'))+'</td></tr>').join('')+'</tbody></table></div>':empty('No academic results in your scope');
  return drawer(p.name,'Student profile preview',facts([['Year',p.year],['Tutor group',p.tutorGroupId],['House',p.house]])+tags(p)+'<div style="height:12px"></div>'+section('Academic overview',academics+ '<p class="small muted">Only subjects permitted by your assigned responsibilities are shown.</p>')+section('Interventions',d.cases.length?d.cases.map(c=>listRow(c.status,c.classInfo.subject.name+' · '+displayDate(c.reviewDate),'open-case',c.id,'support')).join(''):empty('No accessible interventions'))+section('Recent notes',d.notes.length?d.notes.map(n=>'<div><strong>'+esc(n.classInfo.subject.name)+'</strong><p>'+esc(n.text)+'</p><p class="muted small">'+esc(n.author+' · '+displayDate(n.date))+'</p></div>').join(''):empty('No notes in scope')));
 }
 if(kind==='case'){
  const c=w.caseDetail(id);
  return drawer(c.studentName,c.classInfo.name+' · '+c.id,facts([['Tutor group',c.student.tutorGroupId],['House',c.house],['Review date',displayDate(c.reviewDate)],['Stage',c.status],['Case owner',c.owner],['Updated',displayDate(c.updatedDate)]])+section('Wave 1 · Classroom intervention','<p>'+esc(c.reason)+'</p><div class="tags">'+(c.strategies||[]).map(x=>tag(x)).join('')+'</div>')+(c.wave>=2?section('Wave 2 · Faculty and House','<strong>Faculty plan</strong><p>'+esc(c.facultyPlan||'Awaiting faculty plan')+'</p><strong>House request</strong><p>'+esc(c.houseRequest||'Not yet assigned')+'</p><strong>House response</strong><p>'+esc(c.houseResponse?.response||'No response recorded')+'</p>'):'')+(c.wave>=3?section('Wave 3 · Leadership','<p>'+esc(c.leadershipPlan||'Awaiting leadership plan')+'</p>'):'')+section('History',(c.history||[]).map(h=>'<p><strong>'+esc(displayDate(h.date))+'</strong> · '+esc(h.text)+'</p>').join(''))+(c.evaluation?section('Evaluation','<p>'+esc(c.evaluation)+'</p>'):'')+note('View only in V2-02. Intervention actions are implemented in V2-08.'),btn('Student profile','open-student',c.student.id,'btn-quiet'));
 }
 if(kind==='notice'){
  const n=w.noticeDetail(id);
  return drawer(n.title,n.kind==='briefing'?'Briefing notice':'Staff notice',facts([['Audience',w.audienceLabel(n.audience)],['Author',n.author],['Published',displayDate(n.publishedDate)],['Expires',displayDate(n.expiryDate)]])+section('Notice','<p>'+esc(n.body)+'</p>')+note('Editing and acknowledgement arrive in V2-03.'));
 }
 if(kind==='staff'){
  const d=w.staffDetail(id);
  return drawer(d.staff.name,'Fictional staff directory',facts([['Roles',d.staff.roles.map(r=>ROLE_LABELS[r]).join(', ')]])+section('Accessible teaching groups',d.classes.length?d.classes.map(c=>listRow(c.code,c.name,'open-class',c.id,'class')).join(''):empty('No teaching groups in your access scope')));
 }
 if(kind==='prediction'){
  const studentId=id.split('@')[0],d=w.studentDetail(studentId),r=d.subjects.find(x=>x.enrolmentId===id);
  if(!r||!r.editable)throw Error('Only the assigned teacher can edit this prediction');
  return drawer('Edit predicted grade',d.student.name+' · '+r.classInfo.code,facts([['Current grade',r.grade],['Minimum target',r.minimumGrade],['Existing prediction',r.predictedGrade]])+'<form id="prediction-form" class="form-stack"><label for="prediction">Teacher prediction'+select('prediction',r.predictedGrade??'',[['','Not entered'],...r.grades.map(g=>[g,g])],'Predicted grade')+'</label><div class="info-box">'+esc(HELP.edit)+'</div><div id="form-error" class="error" role="alert" hidden></div><button class="btn btn-primary" type="submit">'+icon('check')+'Save prediction</button></form>');
 }
 throw Error('Unknown detail');
}
export function renderSearchResults(w,q){
 const rows=w.search(q);
 if(!q.trim())return empty('Search your accessible workspace','Try a student name, class code, tutor group or staff member.');
 if(!rows.length)return empty('No results in your access scope');
 return rows.map(r=>'<button type="button" class="search-result" data-action="search-result" data-id="'+esc(r.kind+':'+r.id)+'"><span class="list-icon">'+icon({student:'students',class:'class',case:'support',notice:'notice',staff:'person'}[r.kind])+'</span><span class="row-text"><strong>'+esc(r.title)+'</strong><small>'+esc(r.sub)+'</small></span>'+tag(r.kind==='case'?'Intervention':r.kind[0].toUpperCase()+r.kind.slice(1))+icon('arrow')+'</button>').join('');
}
