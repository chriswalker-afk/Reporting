(() => {
  'use strict';
  const fixture = window.SchoolHubData;
  const Classroom = window.SchoolHubClassroom;
  if (!fixture || !Classroom) { document.getElementById('app').textContent = 'Demo data unavailable.'; return; }
  const { students, classes, tasks, interventions, messages, notes, resources, events } = fixture;
  const store = {
    page: 'home', lastPage:'home', selectedStudent:'S002', selectedClass:'11MA1',
    studentTab:'overview', classTab:'register', role:'faculty', drawer:null, searchOpen:false,
    search:'', searchIndex:0, mobileNav:false, roleMenu:false, taskFilter:'open', personFilter:'',
    flashTimer:0, toast:'', taskContext:null, actionForm:null
  };
  const roleNames = {faculty:'Head of Faculty',teacher:'Class teacher',pastoral:'Head of Year',senior:'Senior leader'};
  const roleNamesShort = {faculty:'Faculty',teacher:'Teacher',pastoral:'Pastoral',senior:'Leadership'};
  const icons = {
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    tasks:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    info:'<path d="M3 5h8a3 3 0 0 1 3 3v13H6a3 3 0 0 0-3 0z"/><path d="M21 5h-7a3 3 0 0 0-3 3v13h7a3 3 0 0 1 3 0z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    back:'<path d="m15 18-6-6 6-6"/>',
    close:'<path d="M18 6 6 18M6 6l12 12"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    book:'<path d="M4 5h16v15H4zM8 2v6M16 2v6M4 10h16"/>',
    chart:'<path d="M4 20V12M10 20V8M16 20V4M22 20V14"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 3"/>',
    file:'<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 13h6M9 17h6"/>',
    message:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"/>',
    arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    building:'<path d="M3 21h18M6 21V4h12v17M9 8h2M14 8h2M9 12h2M14 12h2M10 21v-5h4v5"/>',
    users:'<circle cx="8" cy="8" r="3"/><path d="M2 20v-3a6 6 0 0 1 12 0v3M18 4a4 4 0 0 1 0 8M17 16c3 0 5 2 5 4"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    flag:'<path d="M5 21V4m0 1c5-3 9 3 14 0v11c-5 3-9-3-14 0"/>',
    spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
    shield:'<path d="m12 2 8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/>',
    filter:'<path d="M3 5h18M7 12h10m-7 7h4"/>',
    send:'<path d="m21 3-8 18-3-8-8-3zM10 13 21 3"/>',
    bookOpen:'<path d="M2 5h9a3 3 0 0 1 3 3v13H5a3 3 0 0 0-3 0zM22 5h-8a3 3 0 0 0-3 3v13h8a3 3 0 0 1 3 0z"/>',
    download:'<path d="M12 3v13m-5-5 5 5 5-5M4 21h16"/>',
    report:'<path d="M6 2h9l4 4v16H6zM15 2v5h4M9 12h7M9 16h7"/>',
    lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };
  const icon = (name,size=17) => '<svg aria-hidden="true" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]||icons.file)+'</svg>';
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = name => name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
  const avatar = (name,size='',color='') => '<span class="avatar '+size+' '+color+'" aria-hidden="true">'+escape(initials(name))+'</span>';
  const student = id => students.find(s=>s.id===id);
  const group = id => classes.find(c=>c.id===id);
  const studentName = id => student(id)?.name || 'Unknown student';
  const className = id => group(id)?.name || id;
  const assignedTasks = () => tasks.filter(t=>t.roles.includes(store.role));
  const pending = () => assignedTasks().filter(t=>t.status==='Open');
  const classPupils = id => students.filter(s=>s.classId===id);
  const avg = values => Math.round(values.reduce((a,b)=>a+b,0)/(values.length||1));
  const sorted = items => [...items].sort((a,b)=>a.name.localeCompare(b.name));
  const button = (label,action,kind='light',extra='') => '<button class="btn btn-'+kind+'" data-action="'+escape(action)+'" '+extra+'>'+label+'</button>';
  const navItems = [['home','home','Home'],['people','people','People'],['tasks','tasks','My tasks'],['school','calendar','School'],['resources','info','Information']];
  const takeFocus = ()=>document.getElementById('global-search')?.focus();
  const saveDemo = () => { /* Demo intentionally lives in memory: refresh resets all sample changes. */ };
  function notify(message) {
    store.toast = message; renderToast();
    window.clearTimeout(store.flashTimer);
    store.flashTimer=window.setTimeout(()=>{store.toast='';renderToast();},3200);
  }
  function renderToast() {
    const slot=document.getElementById('toast-slot');
    if(slot) slot.innerHTML=store.toast?'<div class="toast" role="status">'+icon('check')+escape(store.toast)+'</div>':'';
  }
  function header() {
    return '<header class="topbar">'+
      '<button class="mobile-nav-toggle" aria-label="Toggle navigation" data-action="toggle-nav">'+icon('menu',20)+'</button>'+
      '<button class="brand" data-action="home" aria-label="School Hub home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="brand-label"><strong>schoolhub<span style="color:#2d8585">.</span></strong><small>STAFF WORKSPACE</small></span></button>'+
      '<div class="top-search" role="search">'+icon('search',18)+'<input id="global-search" type="search" aria-label="Search students, classes, actions or policies" autocomplete="off" spellcheck="false" placeholder="Find a student, class, task or policy..." value="'+escape(store.search)+'"><span class="shortcut">/</span></div>'+
      '<div class="top-actions"><span class="preview-chip">Fictional data · Preview</span>'+
      '<button class="icon-button" data-action="notifications" aria-label="Show outstanding notifications">'+icon('bell',18)+(pending().length?'<span class="dot"></span>':'')+'</button>'+
      '<button class="role-trigger" data-action="role-menu" aria-label="Change demo staff role" aria-expanded="'+store.roleMenu+'">'+
      '<span class="avatar sm">ST</span><span class="role-name"><strong>Sam Taylor</strong><small>'+escape(roleNames[store.role])+'</small></span>'+icon('down',13)+'</button></div></header>';
  }
  function sidebar() {
    return '<aside class="sidebar '+(store.mobileNav?'is-open':'')+'" aria-label="Primary navigation">'+
      '<div class="nav-label">Workspace</div><nav class="nav-list">'+navItems.map(([id,ic,label])=>
      '<button class="nav-button '+(store.page===id||store.page==='student'&&id==='people'||store.page==='class'&&id==='people'?'active':'')+
      '" data-action="navigate" data-page="'+id+'" '+(store.page===id?'aria-current="page"':'')+'>'+icon(ic,17)+
      '<span>'+label+'</span>'+(id==='tasks'?'<span class="nav-count">'+pending().length+'</span>':'')+'</button>').join('')+'</nav>'+
      '<div class="sidebar-spacer"></div><div class="sidebar-bottom"><div class="sidebar-identity"><span class="avatar sm green">SH</span><span><strong>School Hub V1</strong><small>Exploration prototype</small></span></div>'+
      '<div class="sidebar-note">Sample records only. No SIMS, Google login or school systems connected.</div></div></aside>';
  }
  const roleMenu = () => store.roleMenu ? '<div class="role-menu"><div class="role-menu-title">Explore different staff views</div>'+Object.keys(roleNames).map(k=>
    '<button class="role-option '+(store.role===k?'active':'')+'" data-action="set-role" data-role="'+k+'">'+escape(roleNames[k])+(store.role===k?icon('check',15):'')+'</button>').join('')+'</div>':'';
  function topIntro(label,title,subtitle,actions='') {
    return '<div class="page-intro"><div><p class="eyebrow">'+escape(label)+'</p><h1 class="page-title">'+escape(title)+'</h1><p class="subtitle">'+escape(subtitle)+'</p></div><div class="page-controls">'+actions+'</div></div>';
  }
  const panel = (title,body,action='',extra='')=>'<section class="surface panel-pad '+extra+'"><div class="surface-top"><h2 class="section-title">'+title+'</h2>'+action+'</div>'+body+'</section>';
  function renderHome(){
    const date='Sunday, 22 November 2026';
    const agenda = [
      ['08:00','Year 11 Mathematics','T11','11MA1'],
      ['10:20','Year 12 Mathematics','T12','12MA1'],
      ['13:10','Year 10 Mathematics','T11','10MA2']
    ];
    const topClasses = store.role==='senior' ? classes : classes;
    const lesson = '<div class="highlight-lesson"><span class="lesson-symbol">'+icon('book',20)+'</span><div><div class="lesson-time">NEXT TEACHING DAY · 08:00</div><div class="lesson-title">Year 11 Mathematics</div><div class="lesson-meta">Room T11 · IGCSE Higher · '+classPupils('11MA1').length+' sample students</div></div>'+
      '<button class="icon-button lesson-arrow" data-action="open-class" data-id="11MA1" aria-label="Open Year 11 Mathematics">'+icon('chevron')+'</button></div>';
    const agendaHTML=agenda.map(([time,name,room,id])=>
      '<button class="agenda-item click-row" data-action="open-class" data-id="'+id+'"><span class="agenda-time">'+time+'</span><span class="agenda-name">'+name+'</span><span class="agenda-place">'+room+'</span>'+icon('chevron',13)+'</button>').join('');
    const actionsHTML=pending().slice(0,3).map(t=>'<button class="action-line click-row" data-action="open-task" data-id="'+t.id+'">'+
      '<span class="action-icon '+(t.priority==='high'?'amber':t.studentId?'teal':'')+'">'+icon(t.studentId?'people':t.category==='Parent meetings'?'calendar':'tasks',16)+'</span>'+
      '<span class="action-content"><span class="action-title">'+escape(t.title)+'</span><span class="action-detail">'+escape(t.category)+'<span class="inline-dot"></span>'+escape(t.due)+'</span></span>'+
      (t.priority==='high'?'<span class="tag amber">Priority</span>':'')+icon('chevron',14)+'</button>').join('') || '<div class="empty-help">No outstanding actions in this demo role.</div>';
    const classTiles=topClasses.map(c=>{
      const people=classPupils(c.id),score=Classroom.metrics(c.id).mean;
      return '<button class="class-tile" data-action="open-class" data-id="'+c.id+'"><div class="class-code">'+escape(c.id)+'</div><div class="class-details">'+escape(c.shortName)+' · '+people.length+' students</div><div class="class-bottom">'+
        '<span class="mini-bars" aria-hidden="true"><i style="height:7px"></i><i style="height:12px"></i><i style="height:10px"></i><i style="height:17px"></i><i style="height:20px"></i></span><span class="stat-small">'+(score===null?'—':score+'%')+' summary</span></div></button>';
    }).join('');
    const activities=[
      {icon:'chart',title:'November checkpoints available',detail:'Year 11 analysis is ready to review',time:'18 Nov',action:'open-class',id:'11MA1'},
      {icon:'people',title:'New academic follow-up',detail:'Daniel Tan · Algebra support',time:'18 Nov',action:'open-student',id:'S002'},
      {icon:'calendar',title:'PTM availability reminder',detail:'Booking preparation is approaching',time:'17 Nov',action:'open-task',id:'T003'}
    ];
    return topIntro('Your workspace','Good morning, Sam','A clear view of your priorities · '+date,
      button(icon('plus',15)+' Quick action','quick-action','primary'))+
      '<div class="home-top-grid">'+
      panel('Next teaching day',lesson+agendaHTML,button('View classes '+icon('arrow',13),'go-classes','light','style="border:0"'))+
      panel('Needs your attention',actionsHTML,button('All tasks '+icon('arrow',13),'go-tasks','light','style="border:0"'))+
      '</div><div class="home-bottom-grid">'+
      panel('Your classes','<div class="class-grid">'+classTiles+'</div>',
      button('View all '+icon('arrow',13),'go-classes','light','style="border:0"'))+
      panel('Recent activity',activities.map(a=>'<button class="activity-item click-row" data-action="'+a.action+'" data-id="'+a.id+'">'+
      '<span class="activity-pin">'+icon(a.icon,15)+'</span><span class="activity-copy"><strong>'+escape(a.title)+'</strong><small>'+escape(a.detail)+'</small></span><span class="activity-time">'+a.time+'</span></button>').join(''))+
      '</div>';
  }
  function renderPeople(){
    const q=store.personFilter.trim().toLowerCase();
    const results=sorted(students.filter(s=>!q||[s.name,s.id,s.classId,s.form,String(s.year)].some(v=>v.toLowerCase().includes(q))));
    return topIntro('People & classes','Find people','A single starting point for relevant student information.',
      button(icon('users',15)+' View classes','go-classes','light'))+
      '<div class="page-toolbar"><label class="filter-field">'+icon('search',16)+'<input id="person-filter" placeholder="Filter by name, year or class..." value="'+escape(store.personFilter)+'" aria-label="Filter students"></label><span class="small-muted">'+results.length+' fictional students</span></div>'+
      '<section class="surface table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Year / Form</th><th>Class</th><th>Latest assessment</th><th>Academic follow-up</th><th></th></tr></thead><tbody>'+
      results.map(s=>'<tr><td><span class="person">'+avatar(s.name,'sm',s.year===10?'lavender':s.year===12?'green':'')+'<span><strong>'+escape(s.name)+'</strong><small>'+escape(s.id)+'</small></span></span></td>'+
      '<td>Year '+s.year+' · '+escape(s.form)+'</td><td>'+escape(s.classId)+'</td><td><strong>'+s.score+'%</strong></td><td><span class="tag '+(s.status==='Review'?'amber':'teal')+'">'+escape(s.status)+'</span></td>'+
      '<td><button class="table-action" data-action="open-student" data-id="'+s.id+'">Open profile '+icon('chevron',13)+'</button></td></tr>').join('')+
      '</tbody></table>'+(results.length?'':'<div class="empty-state">No matching students.</div>')+'</section>';
  }
  function renderClasses(){
    return '<div class="inner-intro"><button class="back-btn" data-action="navigate" data-page="people" aria-label="Back to people">'+icon('back')+'</button><div><p class="eyebrow">People / Classes</p><h1 class="page-title">My classes</h1></div></div>'+
    '<div class="class-cards-large">'+classes.map(c=>{
      const pupils=classPupils(c.id),mean=Classroom.metrics(c.id).mean;
      return '<button class="class-big" data-action="open-class" data-id="'+c.id+'"><div class="class-big-name">'+escape(c.id)+'</div><div class="class-big-detail">'+escape(c.name)+'</div><div class="class-big-detail">'+escape(c.course)+' · '+pupils.length+' sample students</div>'+
      '<div class="big-progress"><span style="width:'+(mean===null?0:mean)+'%"></span></div><div class="class-big-foot"><strong>'+(mean===null?'—':mean+'%')+' summary mean</strong><span>Open class '+icon('arrow',14)+'</span></div></button>';
    }).join('')+'</div>';
  }
  function renderClass(){
    const c=group(store.selectedClass)||classes[0],pupils=classPupils(c.id);
    const summary=Classroom.metrics(c.id);
    const tabs=[['register','Class register'],['assessments','Assessments'],['analysis','Analysis'],['actions','Follow-ups']];
    const body=Classroom.render({
      classId:c.id, tab:store.classTab, pupils, icon, avatar, button, escape,
      panel, assignedTasks, taskRow
    });
    return '<div class="inner-intro"><button class="back-btn" data-action="go-classes" aria-label="Back to classes">'+
      icon('back')+'</button><div><p class="eyebrow">Classes / '+escape(c.id)+'</p>'+
      '<h1 class="page-title">'+escape(c.name)+'</h1><p class="subtitle">'+escape(c.course)+
      ' · '+escape(c.room)+' · '+pupils.length+' sample students</p></div></div>'+
      '<div class="surface student-header"><div class="student-intro"><span class="avatar lg green">'+icon('users',25)+
      '</span><div><h2 class="student-title">'+escape(c.id)+'</h2><div class="student-sub"><span>'+
      pupils.length+' students</span><span class="inline-dot"></span><span>'+
      (summary.usedAssessments?summary.mean+'% summary mean':'No included assessments')+
      '</span></div></div></div><div class="student-actions">'+
      button(icon('plus',14)+' New assessment','class-new-assessment','primary')+'</div></div>'+
      '<div class="tab-bar" role="tablist" aria-label="Class sections">'+
      tabs.map(([id,label])=>'<button class="tab-btn '+(store.classTab===id?'active':'')+
      '" role="tab" aria-selected="'+(store.classTab===id)+'" data-action="class-tab" data-id="'+id+'">'+
      label+'</button>').join('')+'</div>'+body;
  }
  function renderStudent(){
    const s=student(store.selectedStudent)||students[0];
    const tabs=[['overview','Overview'],['academic','Academic'],['support','Support & actions'],['activities','Activities & meetings']];
    let body='';
    const academicAssessments=Classroom.studentAssessments(s.id);
    const marked=academicAssessments.filter(a=>a.result.status==='scored');
    const currentScore=marked.length?marked[0].result.percent:s.score;
    const priorScore=marked.length>1?marked[1].result.percent:s.previous;
    const delta=Math.round((currentScore-priorScore)*10)/10;
    const insight=(delta>=0?'+':'')+delta+' percentage points vs previous';
    const perf='<div class="metric-grid"><div class="metric"><div class="number">'+currentScore+'%</div><div class="caption">Latest Maths assessment</div></div><div class="metric"><div class="number">'+s.grade+'</div><div class="caption">Indicative grade</div></div><div class="metric"><div class="number">'+s.attendance+'%</div><div class="caption">Demo attendance</div></div></div>'+
      '<div class="subject-list">'+s.subjects.map(a=>{const value=a.name==='Mathematics'?currentScore:a.latest;return '<div class="subject-row"><strong>'+escape(a.name)+'</strong><div class="track" aria-label="'+escape(a.name)+': '+value+' percent"><span style="width:'+value+'%"></span></div><span class="score">'+value+'%</span></div>';}).join('')+'</div>';
    const supportItems=(interventions[s.id]||[]);
    const supportHTML=supportItems.map(a=>'<div class="intervention"><div class="head"><strong>'+escape(a.title)+'</strong><span class="tag teal">'+escape(a.status)+'</span></div><p>'+escape(a.description)+'</p><small>'+escape(a.owner)+' · '+escape(a.date)+'</small></div>').join('')||'<div class="empty-help">No academic interventions are recorded in this fictional profile.</div>';
    const notesHTML=(notes[s.id]||[]).map(n=>'<div class="note-line"><div class="note-heading"><h4>'+escape(n.title)+'</h4><small>'+escape(n.date)+'</small></div><p>'+escape(n.body)+'</p><small>'+escape(n.author)+' · '+escape(n.audience)+'</small></div>').join('')||'<div class="empty-help">No academic notes in this demo profile.</div>';
    const threads=(messages[s.id]||[]).map(m=>'<div class="message">'+avatar(m.author,'sm')+'<div class="message-bubble"><strong>'+escape(m.author)+'</strong><small>'+escape(m.date)+'</small><p>'+escape(m.text)+'</p></div></div>').join('');
    const threadUI='<div class="thread">'+(threads||'<div class="tiny-copy">Start a contextual academic discussion for staff with appropriate access.</div>')+'</div>'+
      '<form class="message-compose" id="message-form"><input name="message" aria-label="Staff message" autocomplete="off" placeholder="Write an academic update..." maxlength="800" required>'+
      '<button class="btn btn-primary" type="submit" aria-label="Send demo message">'+icon('send',15)+'</button></form>';
    const actions=assignedTasks().filter(t=>t.studentId===s.id&&t.status==='Open');
    if(store.studentTab==='overview'){
      body='<div class="student-grid"><div class="stack">'+panel('Academic snapshot',perf,
        button('View assessments '+icon('arrow',13),'academic-tab','light','style="border:0"'))+
        panel('Academic notes',notesHTML,button(icon('plus',13)+' Add note','new-note','soft'))+'</div>'+
        '<div class="stack">'+panel('Support & follow-up',supportHTML+
        '<div class="subtle-rule"></div><div class="detail-row"><span class="label">Outstanding actions</span><span class="value">'+actions.length+'</span></div>',
        button(icon('plus',13)+' Add','new-intervention','soft'))+
        panel('Staff conversation',threadUI)+'</div></div>';
    }else if(store.studentTab==='academic'){
      body='<div class="student-grid"><div class="stack">'+panel('Academic profile',perf)+
        panel('Assessment history','<div class="table-wrap"><table class="data-table"><thead><tr><th>Assessment</th><th>Topic</th><th>Result</th></tr></thead><tbody>'+academicAssessments.map(a=>'<tr><td><strong>'+escape(a.title)+'</strong><div class="small-muted">'+escape(a.date)+'</div></td><td>'+escape(a.mode==='questions'?'Question analysis':'Topic analysis')+(a.includeInSummary?'':' · Excluded from summaries')+'</td><td><strong>'+(a.result.status==='scored'?a.result.percent+'%':a.result.status==='excluded'?'Excluded':a.result.status==='unmarked'?'—':'Incomplete')+'</strong></td></tr>').join('')+'</tbody></table></div>')+
        '</div><div class="stack">'+panel('Interpretation','<p class="tiny-copy">Latest mathematics result: <strong>'+currentScore+'%</strong>. Change: '+insight+'. Academic patterns should be reviewed by a teacher, not interpreted as automated risk decisions.</p>')+
        panel('Notes',notesHTML,button(icon('plus',13)+' Add note','new-note','soft'))+'</div></div>';
    }else if(store.studentTab==='support'){
      body='<div class="student-grid"><div class="stack">'+panel('Academic interventions',supportHTML,button(icon('plus',13)+' Add intervention','new-intervention','soft'))+
        panel('Assigned follow-ups',actions.length?actions.map(t=>taskRow(t)).join(''):'<div class="empty-help">No outstanding follow-up tasks.</div>',
        button(icon('plus',13)+' Add task','new-task','soft'))+'</div><div class="stack">'+panel('Staff discussion',threadUI)+
        panel('Academic notes',notesHTML,button(icon('plus',13)+' Add note','new-note','soft'))+'</div></div>';
    }else{
      body='<div class="student-grid"><div class="stack">'+panel('Co-curricular activities',
        '<div class="detail-list"><div class="detail-row"><span class="label">Registered activity</span><span class="value">'+escape(s.cca)+'</span></div><div class="detail-row"><span class="label">Attendance</span><span class="value">'+escape(s.ccaAttendance)+'</span></div></div><p class="tiny-copy">These are fictional activity details, not a live SchoolsBuddy connection.</p>')+
        '</div><div class="stack">'+panel('Parent-teacher meetings','<div class="detail-list"><div class="detail-row"><span class="label">PTM status</span><span class="value">'+escape(s.ptm)+'</span></div></div><p class="tiny-copy">The production integration could expose appointment booking and follow-up workflows here.</p>')+'</div></div>';
    }
    return '<div class="inner-intro"><button class="back-btn" data-action="student-back" aria-label="Back to previous view">'+icon('back')+'</button><div><p class="eyebrow">People / Student profile</p><h1 class="page-title">Student profile</h1></div></div>'+
      '<section class="surface student-header"><div class="student-intro">'+avatar(s.name,'lg',s.year===10?'lavender':s.year===12?'green':'')+
      '<div><h2 class="student-title">'+escape(s.name)+'</h2><div class="student-sub"><span>Year '+s.year+'</span><span class="inline-dot"></span><span>Form '+escape(s.form)+'</span><span class="inline-dot"></span><span>'+escape(s.classId)+'</span><span class="inline-dot"></span><span>'+escape(s.id)+'</span></div></div></div>'+
      '<div class="student-actions">'+button(icon('file',14)+' Add note','new-note','light')+
      button(icon('plus',14)+' Intervention','new-intervention','light')+button(icon('tasks',14)+' Assign task','new-task','primary')+'</div></section>'+
      '<div class="tab-bar" role="tablist" aria-label="Student profile sections">'+tabs.map(([id,label])=>
      '<button class="tab-btn '+(store.studentTab===id?'active':'')+'" role="tab" aria-selected="'+(store.studentTab===id)+'" data-action="student-tab" data-id="'+id+'">'+label+'</button>').join('')+'</div>'+body;
  }
  function taskRow(t){
    const related=t.studentId?studentName(t.studentId):t.classId?className(t.classId):t.category;
    return '<div class="list-row"><div><div class="row-title">'+escape(t.title)+'</div><div class="row-sub">'+escape(related)+' · '+escape(t.due)+' · '+escape(t.assignee)+'</div></div>'+
      '<div class="row-end"><span class="tag '+(t.status==='Done'?'teal':t.priority==='high'?'amber':'slate')+'">'+escape(t.status)+'</span>'+
      button('Open','open-task','light','data-id="'+t.id+'"')+'</div></div>';
  }
  function renderTasks(){
    const filtered=assignedTasks().filter(t=>store.taskFilter==='all'||t.status.toLowerCase()===store.taskFilter);
    const filters=[['open','Outstanding'],['done','Completed'],['all','All']];
    return topIntro('Action centre','My tasks','Assigned work, contextual follow-ups and clear next steps.',
      button(icon('plus',14)+' New task','new-task','primary'))+
      '<div class="page-toolbar"><div class="pill-tabs" role="group" aria-label="Task status">'+filters.map(([id,label])=>
      '<button class="pill-tab '+(store.taskFilter===id?'active':'')+'" data-action="task-filter" data-id="'+id+'">'+label+'</button>').join('')+'</div>'+
      '<span class="small-muted">'+filtered.length+' actions</span></div>'+
      '<section class="surface">'+(filtered.map(t=>taskRow(t)).join('')||'<div class="empty-state">'+icon('check',27)+'<strong>Nothing here</strong><p>No tasks match this filter.</p></div>')+'</section>';
  }
  function renderSchool(){
    const page=topIntro('School operations','School calendar & activities','Quick access to bookings, registrations and upcoming review cycles.');
    return page+'<div class="split-grid">'+panel('Upcoming school processes',
      events.map(e=>'<div class="event-row"><div class="event-date"><strong>'+e.day+'</strong><span>'+e.month+'</span></div><div class="event-detail"><strong>'+escape(e.title)+'</strong><small>'+escape(e.detail)+'</small></div>'+
      button('Open','event-action','light','data-id="'+e.id+'"')+'</div>').join(''))+
      panel('Common actions','<div class="list-row"><div><div class="row-title">Parent-teacher meetings</div><div class="row-sub">Manage demo availability and view bookings</div></div>'+button('Open','event-action','soft','data-id="e1"')+'</div>'+
      '<div class="list-row"><div><div class="row-title">Co-curricular activities</div><div class="row-sub">Registration and attendance concept</div></div>'+button('Open','event-action','soft','data-id="e2"')+'</div>'+
      '<div class="list-row"><div><div class="row-title">Exams & data review</div><div class="row-sub">Assessment-cycle review concept</div></div>'+button('Open','event-action','soft','data-id="e3"')+'</div>')+
      '</div>';
  }
  function renderResources(){
    return topIntro('Knowledge base','School information','Find policies and guidance without navigating several separate portals.')+
      '<div class="resource-grid">'+resources.map(r=>'<button class="resource-card" data-action="resource" data-id="'+r.id+'"><span class="resource-icon">'+icon('bookOpen',19)+'</span><strong>'+escape(r.title)+'</strong><p>'+escape(r.summary)+'</p></button>').join('')+'</div>';
  }
  function body(){
    if(store.page==='home') return renderHome();
    if(store.page==='people') return renderPeople();
    if(store.page==='classes') return renderClasses();
    if(store.page==='class') return renderClass();
    if(store.page==='student') return renderStudent();
    if(store.page==='tasks') return renderTasks();
    if(store.page==='school') return renderSchool();
    if(store.page==='resources') return renderResources();
    return renderHome();
  }
  function results(){
    const q=store.search.trim().toLowerCase();
    if(!q) return [
      {type:'Students',id:'S002',label:'Daniel Tan',sub:'Year 11 · 11MA1',action:'open-student',ic:'people'},
      {type:'Classes',id:'11MA1',label:'11MA1',sub:'Year 11 Mathematics',action:'open-class',ic:'book'},
      {type:'Tasks',id:'T001',label:'Review Year 11 assessment analysis',sub:'Academic review',action:'open-task',ic:'tasks'}
    ];
    const match=(...xs)=>xs.some(x=>String(x||'').toLowerCase().includes(q));
    return [
      ...students.filter(s=>match(s.name,s.id,s.classId,s.form,'year '+s.year)).map(s=>({type:'Students',id:s.id,label:s.name,sub:'Year '+s.year+' · '+s.classId,action:'open-student',ic:'people'})),
      ...classes.filter(c=>match(c.id,c.name,c.course)).map(c=>({type:'Classes',id:c.id,label:c.id,sub:c.name,action:'open-class',ic:'book'})),
      ...assignedTasks().filter(t=>match(t.title,t.category,t.detail)).map(t=>({type:'Tasks',id:t.id,label:t.title,sub:t.category,action:'open-task',ic:'tasks'})),
      ...resources.filter(r=>match(r.title,r.category,r.summary)).map(r=>({type:'Information',id:r.id,label:r.title,sub:r.summary,action:'resource',ic:'info'}))
    ].slice(0,15);
  }
  function searchLayer() {
    if(!store.searchOpen) return '';
    const res=results(); let prior='';
    const html=res.map((r,i)=>{
      const heading=prior===r.type?'':'<div class="search-group-title">'+escape(r.type)+'</div>';
      prior=r.type;
      return heading+'<button role="option" aria-selected="'+(i===store.searchIndex)+'" class="search-result '+(i===store.searchIndex?'is-selected':'')+'" data-action="'+r.action+'" data-id="'+escape(r.id)+'" data-result-index="'+i+'"><span class="search-icon">'+icon(r.ic,15)+'</span><span><strong>'+escape(r.label)+'</strong><small>'+escape(r.sub)+'</small></span><span class="search-tail">'+icon('arrow',15)+'</span></button>';
    }).join('');
    return '<div class="search-scrim" data-action="close-search"></div>'+
      '<div class="search-popover" role="listbox" aria-label="Search suggestions">'+(html||'<div class="empty-state">'+icon('search',24)+'<strong>No results found</strong><p>Try a different name, class, task or policy.</p></div>')+
      '<div class="search-footer"><span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div></div>';
  }
  function drawerHTML(){
    if(!store.drawer) return '';
    let type=store.drawer, title='',subtitle='',content='',foot='',kicker='QUICK ACTION';
    const s=student(store.selectedStudent);
    const context=s&&store.page==='student'?'<div class="drawer-context">'+avatar(s.name,'sm')+'<span><strong>'+escape(s.name)+'</strong><small>Year '+s.year+' · '+escape(s.classId)+'</small></span></div>':'';
    const close=button('Cancel','close-drawer','light');
    if(type==='quick'){
      title='What would you like to do?';subtitle='Start work directly, without digging through menus.';
      const list=[['new-task','Create a follow-up task','Assign an action and review date'],
        ['new-note','Record an academic note','Capture useful academic context'],
        ['new-intervention','Start an intervention','Set up a support action'],
        ['go-search','Find a student or class','Open a record from anywhere']];
      content=list.map(([action,label,sub])=>'<button class="list-row click-row" data-action="'+action+'"><span><span class="row-title">'+escape(label)+'</span><span class="row-sub">'+escape(sub)+'</span></span>'+icon('chevron',16)+'</button>').join('');
      foot=close;
    }else if(type==='task'){
      const t=tasks.find(t=>t.id===store.taskContext);
      if(!t){store.drawer=null;return '';}
      kicker='FOLLOW-UP TASK';title=t.title;subtitle=t.category+' · '+t.due;
      const related=t.studentId?studentName(t.studentId):t.classId?className(t.classId):'Whole-school process';
      content='<div class="detail-list"><div class="detail-row"><span class="label">Status</span><span class="tag '+(t.status==='Done'?'teal':'amber')+'">'+escape(t.status)+'</span></div>'+
        '<div class="detail-row"><span class="label">Owner</span><span class="value">'+escape(t.assignee)+'</span></div>'+
        '<div class="detail-row"><span class="label">Related to</span><span class="value">'+escape(related)+'</span></div>'+
        '<div class="detail-row"><span class="label">Due</span><span class="value">'+escape(t.due)+'</span></div></div>'+
        '<div class="subtle-rule"></div><p class="tiny-copy">'+escape(t.detail)+'</p>'+
        (t.studentId?'<div style="margin-top:17px">'+button('Open student profile '+icon('arrow',13),'task-student','soft')+'</div>':'')+
        (t.classId?'<div style="margin-top:17px">'+button('Open class '+icon('arrow',13),'task-class','soft')+'</div>':'');
      foot=close+' '+button(t.status==='Open'?icon('check',14)+' Mark complete':'Reopen task','toggle-task','primary');
    }else if(type==='new-task'){
      title='Assign a follow-up';subtitle='A small action with a clear owner and deadline.';
      const defaultTarget=s&&store.page==='student'?s.id:'';
      content=context+'<form id="task-form">'+
        '<div class="form-field"><label for="task-title">What needs to happen?</label><input id="task-title" name="title" placeholder="e.g. Review next assessment outcome" maxlength="120" required autofocus></div>'+
        '<div class="form-field"><label for="task-detail">Context</label><textarea id="task-detail" name="detail" maxlength="600" placeholder="Add a short explanation so the recipient knows what to do."></textarea></div>'+
        '<div class="form-field"><label for="task-student">Related student (optional)</label><select id="task-student" name="studentId"><option value="">No student</option>'+sorted(students).map(p=>'<option value="'+p.id+'" '+(p.id===defaultTarget?'selected':'')+'>'+escape(p.name)+'</option>').join('')+'</select></div>'+
        '<div class="form-field"><label for="task-owner">Assigned to</label><select id="task-owner" name="assignee"><option>Sam Taylor</option><option>Maths Faculty</option><option>Year Team</option></select></div>'+
        '<div class="form-field"><label for="task-date">Due date</label><input id="task-date" name="due" type="date" value="2026-11-27" required></div>'+
        '<p class="form-hint">Prototype only: tasks are stored in browser memory and disappear on refresh.</p></form>';
      foot=close+' <button class="btn btn-primary" type="submit" form="task-form">'+icon('check',14)+' Create task</button>';
    }else if(type==='new-note'){
      title='Add an academic note';subtitle='Keep the useful context attached to the student.';
      content=context+'<form id="note-form"><div class="form-field"><label for="note-student">Student</label><select id="note-student" name="studentId">'+sorted(students).map(p=>'<option value="'+p.id+'" '+(p.id===store.selectedStudent?'selected':'')+'>'+escape(p.name)+'</option>').join('')+'</select></div>'+
        '<div class="form-field"><label for="note-title">Note title</label><input id="note-title" name="title" maxlength="90" required placeholder="e.g. Assessment review"></div>'+
        '<div class="form-field"><label for="note-body">Academic observation</label><textarea id="note-body" name="body" maxlength="800" required placeholder="Record a concise, factual observation."></textarea></div>'+
        '<p class="form-hint">Demo academic notes only. Do not enter real personal or safeguarding information.</p></form>';
      foot=close+' <button type="submit" form="note-form" class="btn btn-primary">'+icon('check',14)+' Save note</button>';
    }else if(type==='new-intervention'){
      title='Record an intervention';subtitle='Capture the support plan without leaving the profile.';
      content=context+'<form id="intervention-form"><div class="form-field"><label for="intervention-student">Student</label><select id="intervention-student" name="studentId">'+sorted(students).map(p=>'<option value="'+p.id+'" '+(p.id===store.selectedStudent?'selected':'')+'>'+escape(p.name)+'</option>').join('')+'</select></div>'+
        '<div class="form-field"><label for="intervention-title">Support focus</label><input id="intervention-title" name="title" maxlength="90" placeholder="e.g. Algebra confidence" required></div>'+
        '<div class="form-field"><label for="intervention-description">Agreed action</label><textarea id="intervention-description" name="description" maxlength="700" placeholder="What will be tried and what would progress look like?" required></textarea></div>'+
        '<p class="form-hint">No safeguarding details should be entered into this academic demo.</p></form>';
      foot=close+' <button type="submit" form="intervention-form" class="btn btn-primary">'+icon('check',14)+' Save intervention</button>';
    }else if(type==='resource'){
      const r=resources.find(a=>a.id===store.taskContext);
      if(!r){store.drawer=null;return '';}
      kicker='INFORMATION / '+r.category.toUpperCase();title=r.title;subtitle=r.summary;
      content='<div class="notice">'+icon('info')+'<span>Illustrative information only. No real policy documents are loaded.</span></div><p class="tiny-copy" style="margin-top:20px">'+escape(r.body)+'</p>';
      foot=close;
    }else if(type==='event'){
      const e=events.find(a=>a.id===store.taskContext);
      if(!e){store.drawer=null;return '';}
      kicker='SCHOOL WORKFLOW';title=e.title;subtitle=e.detail;
      content='<div class="notice">'+icon('info')+'<span>This is an interaction preview, not a connected booking or registration service.</span></div><div class="subtle-rule"></div>'+
        '<p class="tiny-copy">'+(e.action==='availability'?'A future booking module could let staff mark available PTM slots, show bookings, and open student profiles directly.':e.action==='cca'?'A CCA module could show registrations, remaining places and attendance without sending staff to a separate site.':'An exam review workflow could combine a class data summary, review prompts, actions and faculty sign-off.')+'</p>';
      foot=close+' '+button('Create a related task','new-task','soft');
    }
    return '<div class="drawer-backdrop" data-action="close-drawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">'+
      '<div class="drawer-head"><div><div class="drawer-kicker">'+escape(kicker)+'</div><h2 id="drawer-title">'+escape(title)+'</h2><p>'+escape(subtitle)+'</p></div>'+
      '<button class="icon-button" data-action="close-drawer" aria-label="Close panel">'+icon('close',19)+'</button></div>'+
      '<div class="drawer-body">'+content+'</div><div class="drawer-foot">'+foot+'</div></aside>';
  }
  function render(opts={}){
    const workspace=document.getElementById('workspace');
    const oldScroll=workspace?.scrollTop||0;
    const wizardScroll=document.querySelector('.assessment-wizard-scroll')?.scrollTop||0;
    document.getElementById('app').innerHTML='<div class="app-frame">'+header()+'<div class="body-grid">'+sidebar()+
      '<main id="workspace" class="workspace" tabindex="-1"><div class="workspace-inner">'+body()+'</div></main></div>'+
      searchLayer()+roleMenu()+drawerHTML()+Classroom.wizardHTML()+'<div id="toast-slot" aria-live="polite"></div></div>';
    if(!opts.scrollTop) document.getElementById('workspace').scrollTop=oldScroll;
    const wizardPane=document.querySelector('.assessment-wizard-scroll');
    if(wizardPane && !opts.wizardTop)wizardPane.scrollTop=wizardScroll;
    if(opts.focusSearch)takeFocus();
    if(store.drawer){window.setTimeout(()=>document.querySelector('.drawer [autofocus], .drawer .icon-button')?.focus(),0);}
    renderToast();
  }
  function route(page){
    store.page=page;store.mobileNav=false;store.roleMenu=false;store.searchOpen=false;store.drawer=null;
    render({scrollTop:true});document.getElementById('workspace').scrollTop=0;
  }
  function openStudent(id){
    if(!student(id))return;
    store.lastPage=store.page==='student'?store.lastPage:store.page;
    store.selectedStudent=id;store.studentTab='overview';store.search='';
    route('student');
  }
  function openClass(id){
    if(!group(id))return;
    store.selectedClass=id;store.classTab='register';store.search='';
    Classroom.resetFilter();
    route('class');
  }
  function openDrawer(type,id){
    store.drawer=type;store.taskContext=id||null;store.searchOpen=false;store.search='';
    store.roleMenu=false;render();
  }
  function dispatch(action,el){
    if(Classroom.onAction(action,el,{render,notify,store}))return;
    const id=el?.dataset.id || '';
    switch(action){
      case 'navigate':case 'home': route(action==='home'?'home':el.dataset.page);break;
      case 'go-classes':route('classes');break;
      case 'go-tasks':route('tasks');break;
      case 'open-student':openStudent(id);break;
      case 'open-class':openClass(id);break;
      case 'student-back':route(store.lastPage==='student'?'people':store.lastPage);break;
      case 'student-tab':store.studentTab=id;render({scrollTop:true});break;
      case 'class-tab':store.classTab=id;render({scrollTop:true});break;
      case 'academic-tab':store.studentTab='academic';render({scrollTop:true});break;
      case 'task-filter':store.taskFilter=id;render();break;
      case 'quick-action':openDrawer('quick');break;
      case 'open-task':openDrawer('task',id);break;
      case 'new-task':openDrawer('new-task');break;
      case 'new-note':openDrawer('new-note');break;
      case 'new-intervention':openDrawer('new-intervention');break;
      case 'resource':openDrawer('resource',id);break;
      case 'event-action':openDrawer('event',id);break;
      case 'task-student':{const t=tasks.find(t=>t.id===store.taskContext);if(t?.studentId)openStudent(t.studentId);break;}
      case 'task-class':{const t=tasks.find(t=>t.id===store.taskContext);if(t?.classId)openClass(t.classId);break;}
      case 'toggle-task':{
        const t=tasks.find(t=>t.id===store.taskContext);
        if(t){t.status=t.status==='Open'?'Done':'Open';store.drawer=null;render();notify(t.status==='Done'?'Demo task marked complete':'Demo task reopened');}
        break;
      }
      case 'go-search':store.drawer=null;store.searchOpen=true;render({focusSearch:true});break;
      case 'close-drawer':store.drawer=null;render();break;
      case 'close-search':store.searchOpen=false;store.search='';render();break;
      case 'toggle-nav':store.mobileNav=!store.mobileNav;render();break;
      case 'notifications':route('tasks');break;
      case 'role-menu':store.roleMenu=!store.roleMenu;render();break;
      case 'set-role':store.role=el.dataset.role;store.roleMenu=false;store.drawer=null;route('home');notify('Viewing as '+roleNames[store.role]);break;
      default:break;
    }
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-action]');
    if(target){event.preventDefault();dispatch(target.dataset.action,target);}
    else if(store.roleMenu&&!event.target.closest('.role-menu')){store.roleMenu=false;render();}
  });
  document.addEventListener('input',event=>{
    if(Classroom.onInput(event))return;
    if(event.target.id==='global-search'){
      const value=event.target.value;const selection=event.target.selectionStart;
      store.search=value;store.searchOpen=true;store.searchIndex=0;
      const root=document.getElementById('app'),existing=root.querySelector('.search-popover');
      const scrim=root.querySelector('.search-scrim');
      if(existing)existing.remove();if(scrim)scrim.remove();
      const marker=document.createElement('div');marker.innerHTML=searchLayer();
      const elements=Array.from(marker.children);
      const oldRole=root.querySelector('.role-menu');
      elements.forEach(element=>root.querySelector('.app-frame').appendChild(element));
      if(oldRole)oldRole.remove();
      return;
    }
    if(event.target.id==='person-filter'){
      store.personFilter=event.target.value;
      const node=document.querySelector('.data-table tbody');
      if(node){
        const q=store.personFilter.trim().toLowerCase();
        const matches=sorted(students.filter(s=>!q||[s.name,s.id,s.classId,s.form,String(s.year)].some(v=>v.toLowerCase().includes(q))));
        node.querySelectorAll('tr').forEach(tr=>{
          const name=tr.querySelector('.person strong')?.textContent||'';
          const s=students.find(p=>p.name===name);
          tr.hidden=!(s&&matches.some(p=>p.id===s.id));
        });
        const counter=document.querySelector('.page-toolbar .small-muted');if(counter)counter.textContent=matches.length+' fictional students';
      }
    }
  });
  document.addEventListener('change',event=>{
    Classroom.onChange(event,{render,notify});
  });
  document.addEventListener('keydown',event=>{
    if(Classroom.wizardOpen()){
      if(event.key==='Escape'){
        event.preventDefault();Classroom.askClose();render();
      }
      return;
    }
    const active=document.activeElement;
    const typing=active&&(['INPUT','TEXTAREA','SELECT'].includes(active.tagName)||active.isContentEditable);
    if(event.key==='Escape'){
      if(store.drawer){store.drawer=null;render();return;}
      if(store.searchOpen){store.searchOpen=false;store.search='';render({focusSearch:true});return;}
      if(store.roleMenu||store.mobileNav){store.roleMenu=false;store.mobileNav=false;render();}
      return;
    }
    if(event.key==='/'&&!typing&&!event.ctrlKey&&!event.metaKey&&!store.drawer){
      event.preventDefault();store.searchOpen=true;render({focusSearch:true});return;
    }
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&!store.drawer){
      event.preventDefault();store.searchOpen=true;render({focusSearch:true});return;
    }
    if(store.searchOpen&&active?.id==='global-search'){
      const found=results();
      if(event.key==='ArrowDown'){event.preventDefault();store.searchIndex=(store.searchIndex+1)%Math.max(1,found.length);updateSearchSelection();}
      else if(event.key==='ArrowUp'){event.preventDefault();store.searchIndex=(store.searchIndex-1+Math.max(1,found.length))%Math.max(1,found.length);updateSearchSelection();}
      else if(event.key==='Enter'&&found.length){
        event.preventDefault();const result=found[store.searchIndex]||found[0];
        dispatch(result.action,{dataset:{id:result.id}});
      }
    }
  });
  function updateSearchSelection(){
    document.querySelectorAll('[data-result-index]').forEach(el=>{
      const selected=Number(el.dataset.resultIndex)===store.searchIndex;
      el.classList.toggle('is-selected',selected);el.setAttribute('aria-selected',String(selected));
      if(selected)el.scrollIntoView({block:'nearest'});
    });
  }
  document.addEventListener('submit',event=>{
    if(!['task-form','note-form','intervention-form','message-form'].includes(event.target.id))return;
    event.preventDefault();const data=new FormData(event.target);
    const val=name=>String(data.get(name)||'').trim();
    if(event.target.id==='task-form'){
      if(!val('title')||!val('due'))return;
      const created={id:'T'+(100+tasks.length),title:val('title'),detail:val('detail')||'Follow-up action',
        studentId:val('studentId')||undefined,category:'Follow-up',due:val('due'),priority:'medium',
        assignee:val('assignee'),status:'Open',roles:Object.keys(roleNames)};
      tasks.unshift(created);store.drawer=null;render();notify('Demo follow-up task created');
    }else if(event.target.id==='note-form'){
      if(!val('title')||!val('body'))return;
      const id=val('studentId');if(!student(id))return;
      (notes[id] ||= []).unshift({title:val('title'),body:val('body'),author:'Sam Taylor',date:'22 Nov',audience:'Relevant academic staff'});
      store.drawer=null;openStudent(id);notify('Demo academic note saved');
    }else if(event.target.id==='intervention-form'){
      if(!val('title')||!val('description'))return;
      const id=val('studentId');if(!student(id))return;
      (interventions[id] ||= []).unshift({title:val('title'),description:val('description'),owner:'Sam Taylor',date:'22 Nov',status:'Active'});
      store.drawer=null;openStudent(id);notify('Demo intervention saved');
    }else if(event.target.id==='message-form'){
      if(!val('message'))return;
      const id=store.selectedStudent;(messages[id] ||= []).push({author:'Sam Taylor',initials:'ST',date:'Just now',text:val('message')});
      const searchFocused=document.activeElement?.id==='global-search';
      render();notify('Demo staff update posted locally');
    }
  });
  render({scrollTop:true});
})();
