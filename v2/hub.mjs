import {createStore,STORAGE_KEY} from './store.mjs';
import {groupFilter} from './home-dashboard.mjs';
import {ANALYSIS_TABS} from './academic-analysis.mjs';
import {filterStudents,PROFILE_TABS} from './student-profiles.mjs';
import {profilePeers} from './student-profile-views.mjs';
import {caseFormInput,unpackCaseAction} from './intervention-views.mjs';
import {CASE_FILTERS} from './intervention-refinement.mjs';
import {bookId,unpackBookId} from './markbook-views.mjs';
import {createGridController,definitionInput} from './markbook-controller.mjs';
import {createGradebookController} from './gradebook-controller.mjs';
import {loadLayout,saveLayout,normalizeLayout,updateLayout,revealLayout,moveAssessment,groupOf,matchesLayout,layoutKey} from './gradebook-layout.mjs';
import {editorInput,changeBoundaryUnit,changeEditorRows,resetEditorBoundaries} from './assessment-editor.mjs';
import {GROUPS,DEFAULT_GROUPS,FULL_GROUPS,registerFocusFilter,visibleRegisterRows} from './class-overview.mjs';
import {createWorkspace,parseRoute,routeHash,HELP,sortRows,matchText} from './workspace.mjs';
import {sidebar,topbar,renderPage,renderDetail,renderSearchResults,esc,icon} from './views.mjs';

const byId=id=>document.getElementById(id);
const main=byId('workspace'),nav=byId('sidebar'),bar=byId('topbar');
const searchDialog=byId('search-dialog'),detailDialog=byId('detail-dialog'),resetDialog=byId('reset-dialog');
const tooltip=byId('tooltip'),toast=byId('toast');
let store,w,workspaceKey='',toastTimer,helpAnchor=null,helpPinned=false,drawerReturn=null,searchReturn=null,detail=null,detailStack=[];
const state={...parseRoute(location.hash),staffId:'sam',scope:null,query:'',flag:'all',below:false,caseFilter:'active',caseClass:null,boardExpanded:false,noticeFilter:'active',deadlineFilter:'open',tutorFilter:'all',houseFilter:'all',trackFilter:'all',supportFilter:'all',classYear:'all',classFaculty:'all',columnGroups:[...DEFAULT_GROUPS],registerFiltersOpen:false,registerColumnsOpen:false,sorts:{},gradebookExpanded:{},gradebookLayout:null,gradebookLayoutOpen:false,classTab:'information',unitId:'',reportPeriod:'',analysisStudent:'',analysisAssessment:'',analysisCommon:'',analysisUnit:'',analysisFrom:'',analysisTo:'',studentYear:'all',studentAttainment:'all',studentSupport:'all'};
const grid=createGridController({dialog:detailDialog,getDetail:()=>detail,getWorkspace:()=>w,getStore:()=>store,getStaff:()=>state.staffId,notify});
const gradebook=createGradebookController({root:main,getWorkspace:()=>w,getStore:()=>store,getStaff:()=>state.staffId,notify});
const columnKey=id=>'jis-hub-v2-register-columns-'+id;
function loadColumns(id){try{const value=JSON.parse(window.localStorage.getItem(columnKey(id)));if(Array.isArray(value)&&value.every(v=>GROUPS.some(g=>g.id===v)))return [...new Set(value)];}catch{}return [...DEFAULT_GROUPS];}
function saveColumns(){try{window.localStorage.setItem(columnKey(state.staffId),JSON.stringify(state.columnGroups));}catch{}}
const gradebookLayouts=new Map(),gradebookPanels=new Map(),gradebookExpansions=new Map();
const currentLayoutKey=()=>layoutKey(state.staffId,state.classId);
function personalLayout(){
 const key=currentLayoutKey();
 if(!gradebookLayouts.has(key)){let storage;try{storage=window.localStorage;}catch{}gradebookLayouts.set(key,loadLayout(storage,state.staffId,state.classId));}
 return gradebookLayouts.get(key);
}
function changeLayout(layout,{focus=null}={}){
 const key=currentLayoutKey();gradebookLayouts.set(key,normalizeLayout(layout));
 let storage;try{storage=window.localStorage;}catch{}
 if(!saveLayout(storage,state.staffId,state.classId,layout))notify('Layout updated for this session; browser storage is unavailable.');
 render();
 if(focus)focus();
}
function setGradebookExpansion(classId,expanded){gradebookExpansions.set(layoutKey(state.staffId,classId),[...expanded]);state.gradebookExpanded[classId]=[...expanded];}
function gradebookActionFocus(action,id=''){main.querySelector('[data-action="'+CSS.escape(action)+'"]'+(id?'[data-id="'+CSS.escape(id)+'"]':''))?.focus({preventScroll:true});}
let storageIssue='',suspendDetailRefresh=false,formDirty=false;
function boot(){
 try{store=createStore({storage:window.localStorage});}
 catch(error){storageIssue='Saved demo data could not be loaded. This session uses fresh fictional data; existing storage was not overwritten. '+String(error.message||error);store=createStore();}
 state.columnGroups=loadColumns(state.staffId);
 state.classTab=parseRoute(location.hash).classTab??'information';
 const initial=createWorkspace(store,state.staffId,state.scope);state.scope=initial.scope;
 if(state.classId&&!initial.scopedClassIds.has(state.classId)&&initial.accessibleClassIds.has(state.classId))state.scope='accessible';
 render({top:true});
 if(storageIssue)notify('Local storage unavailable or invalid. See workspace notice.');
 store.subscribe(()=>render());
}
function notify(text){
 toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,4200);
}
function render({top=false,keepFocus=false}={}){
 const active=document.activeElement,oldId=keepFocus?active?.id:null,
   caret=oldId&&active?.type==='search'?active.selectionStart:null,
   oldScroll=main.scrollTop,oldTable=main.querySelector('.table-scroll'),tableScroll=oldTable?{top:oldTable.scrollTop,left:oldTable.scrollLeft}:null;
 hideHelp();
 const key=JSON.stringify([state.staffId,state.scope,store.revision()]);
 if(!w||workspaceKey!==key){w=createWorkspace(store,state.staffId,state.scope);state.scope=w.scope;workspaceKey=JSON.stringify([state.staffId,state.scope,store.revision()]);}
 if(state.page==='classes'&&state.classId&&!w.scopedClassIds.has(state.classId)){state.classId=null;state.classTab='information';history.replaceState(null,'',routeHash('classes'));}
 if(state.page==='classes'&&state.classId&&state.classTab==='markbook'){
  state.gradebookLayout=personalLayout();state.gradebookLayoutOpen=Boolean(gradebookPanels.get(currentLayoutKey()));
  state.gradebookExpanded[state.classId]=gradebookExpansions.get(currentLayoutKey())??[];
 }
 nav.innerHTML=sidebar(state.page,w);bar.innerHTML=topbar(w);
 main.innerHTML=(storageIssue?'<div class="alert" role="status">'+esc(storageIssue)+'</div>':'')+renderPage(w,state);
 main.scrollTop=top?0:oldScroll;
 const table=main.querySelector('.table-scroll');if(!top&&table&&tableScroll){table.scrollTop=tableScroll.top;table.scrollLeft=tableScroll.left;}
 gradebook.mount();
 if(oldId){const next=byId(oldId);next?.focus({preventScroll:true});if(caret!==null&&next?.type==='search')try{next.setSelectionRange(caret,caret);}catch{}}
 if(detail&&detailDialog.open&&!suspendDetailRefresh&&!formDirty&&!grid.isDirty())try{refreshDetail();}catch{closeDetail();}
}
function clearRegisterFilters(){state.query='';state.flag='all';state.below=false;state.tutorFilter='all';state.houseFilter='all';state.trackFilter='all';state.supportFilter='all';state.classYear='all';state.classFaculty='all';state.registerFiltersOpen=false;}
function clearAnalysis(){state.analysisStudent='';state.analysisAssessment='';state.analysisCommon='';state.analysisUnit='';state.analysisFrom='';state.analysisTo='';}
function clearStudentFilters(){clearRegisterFilters();state.studentYear='all';state.studentAttainment='all';state.studentSupport='all';}
function clearFilters(){clearStudentFilters();clearAnalysis();state.caseFilter='active';state.caseClass=null;state.noticeFilter='active';state.deadlineFilter='open';}
function navigate(page,{classId=null,below=false,caseFilter='active',caseClass=null,noticeFilter='active',deadlineFilter='open',preserve=false,classTab='information',analysisStudent='',analysisAssessment='',studentFilters=null}={}){
 if(!gradebook.guard()||!closeDetail(false))return;closeSearch(false);nav.dataset.open='false';
 if(!preserve)clearFilters();
 if(page==='students'&&studentFilters)for(const key of ['studentYear','tutorFilter','houseFilter','studentAttainment'])if(Object.hasOwn(studentFilters,key))state[key]=studentFilters[key];
 state.page=page;state.classId=classId;state.below=below;state.caseFilter=caseFilter;state.caseClass=caseClass;state.noticeFilter=noticeFilter;state.deadlineFilter=deadlineFilter;state.classTab=classTab;state.unitId='';state.analysisStudent=analysisStudent;state.analysisAssessment=analysisAssessment;
 const hash=routeHash(page,classId,state.classTab);if(location.hash!==hash)history.pushState(null,'',hash);
 render({top:true});main.focus({preventScroll:true});
}
function openClass(id,below=false){
 if(!gradebook.guard())return;
 if(!w.accessibleClassIds.has(id)){notify('Class outside your accessible demo scope.');return;}
 if(!w.scopedClassIds.has(id))state.scope='accessible';
 navigate('classes',{classId:id,below,classTab:!below&&state.page==='classes'&&state.classId?state.classTab:'information'});
}
function focusToken(el){return el?{element:el,id:el.id,action:el.dataset?.action,record:el.dataset?.id}:null;}
function restoreFocus(token){
 if(!token)return;
 const node=token.element?.isConnected?token.element:token.id?byId(token.id):token.action?document.querySelector('[data-action="'+CSS.escape(token.action)+'"]'+(token.record!==undefined?'[data-id="'+CSS.escape(token.record)+'"]':'')):null;
 node?.focus({preventScroll:true});
}
function canLeaveDetail(){
 if(formDirty&&!window.confirm('Discard unsaved form changes? Saved records will not change.'))return false;
 if(!grid.canLeave())return false;
 formDirty=false;return true;
}
function openDetail(kind,id,options={}){
 if(!gradebook.guard())return;
 hideHelp();
 const next={kind,id,...options};
 try{
  const markup=renderDetail(w,next);
  if(!canLeaveDetail())return;
  detailDialog.classList.toggle('wide-markbook',kind==='mark-grid');
  detailDialog.classList.toggle('wide-profile',kind==='student');
  detailDialog.classList.toggle('wide-case',kind==='case');
  if(!detailDialog.open){drawerReturn=focusToken(document.activeElement);detailStack=[];detail=next;detailDialog.innerHTML=markup;detailDialog.showModal();}
  else{if(detail)detailStack.push({...detail,scroll:detailDialog.querySelector('.drawer-body')?.scrollTop||0});detail=next;detailDialog.innerHTML=markup;addBack();}
  grid.init();detailDialog.querySelector('.dialog-head button')?.focus({preventScroll:true});grid.focusRequested();
 }catch(error){notify(String(error.message||error));}
}
function addBack(){
 if(detailStack.length){
  const head=detailDialog.querySelector('.dialog-head');
  head?.insertAdjacentHTML('afterbegin','<button type="button" class="btn btn-icon" data-action="detail-back" aria-label="Back to previous record">'+icon('back')+'</button>');
 }
}
function refreshDetail(markup=null){
 hideHelp();formDirty=false;
 const scroll=detailDialog.querySelector('.drawer-body')?.scrollTop||0;
 detailDialog.classList.toggle('wide-markbook',detail.kind==='mark-grid');
 detailDialog.classList.toggle('wide-profile',detail.kind==='student');
 detailDialog.classList.toggle('wide-case',detail.kind==='case');
 detailDialog.innerHTML=markup??renderDetail(w,detail);addBack();grid.init();
 const body=detailDialog.querySelector('.drawer-body');if(body)body.scrollTop=scroll;
}
function detailBack(){
 if(!detailStack.length){closeDetail();return;}
 if(!canLeaveDetail())return;
 const old=detailStack.pop(),{scroll,...previous}=old;detail=previous;
 if(['case-action','case-new'].includes(detail.kind))detail.revision=store.revision();
 refreshDetail();
 const body=detailDialog.querySelector('.drawer-body');if(body)body.scrollTop=old.scroll;
 detailDialog.querySelector('.dialog-head button')?.focus({preventScroll:true});
}
function closeDetail(restore=true){
 if(!canLeaveDetail())return false;
 hideHelp();detail=null;detailStack=[];if(detailDialog.open)detailDialog.close();
 if(restore)restoreFocus(drawerReturn);
 drawerReturn=null;detailDialog.classList.remove('wide-markbook','wide-profile','wide-case');return true;
}
function openStudent(id,tab='overview',subjectId=''){
 let peerIds,peerLabel='',classContext='';
 if(state.page==='classes'&&state.classId&&state.classTab==='information'&&w.scopedClassIds.has(state.classId)){
  const r=w.classRecord(state.classId),rows=visibleRegisterRows(r.roster,state,matchText,sortRows);
  const current=rows.find(p=>p.studentId===id);
  if(current){peerIds=rows.map(p=>p.studentId);peerLabel=r.code+' register';classContext=r.id;subjectId=subjectId||current.enrolmentId;}
 }else if(state.page==='students'){
  const rows=filterStudents(w.studentRows(),state,matchText),order=state.sorts.students;
  if(rows.some(p=>p.id===id)){peerIds=(order?sortRows(rows,order.key,order.direction):rows).map(p=>p.id);peerLabel='Student directory';}
 }
 openDetail('student',id,{tab,peerIds,peerLabel,classContext,subjectId});
}
function openPupilHistory(enrolmentId){
 try{const d=w.subjectDetail(enrolmentId);openStudent(d.student.id,'assessments',enrolmentId);}
 catch(error){notify(error.message);}
}
function changeProfile(values,focusId=null,action=null){
 if(detail?.kind!=='student')return;
 const next={...detail,...values};
 try{
  if(!w.access.canViewStudent(next.id))throw Error('Student outside current demo scope');
  const markup=renderDetail(w,next);detail=next;refreshDetail(markup);
  const body=detailDialog.querySelector('.drawer-body');if(body)body.scrollTop=0;
  if(focusId)byId(focusId)?.focus({preventScroll:true});
  else if(action)detailDialog.querySelector('[data-action="'+action+'"][data-id="'+CSS.escape(String(values.tab??values.id??''))+'"]')?.focus({preventScroll:true});
 }catch(error){notify(error.message);}
}
function switchProfile(id){
 if(detail?.kind!=='student'||!profilePeers(w,detail).some(p=>p.id===id))return;
 const previous=w.studentProfile(detail.id).subjects,next=w.studentProfile(id).subjects;
 const equivalent=oldId=>{const old=previous.find(s=>s.enrolmentId===oldId);return old?next.find(s=>s.classInfo.course.id===old.classInfo.course.id)?.enrolmentId??'':'';};
 changeProfile({id,subjectId:equivalent(detail.subjectId)||next.find(s=>s.classId===detail.classContext)?.enrolmentId||'',commentSubject:equivalent(detail.commentSubject),subjectFilter:'all'},'profile-pupil');
}
function openProfileAnalysis(enrolmentId){
 if(detail?.kind!=='student')return;
 const s=w.studentProfile(detail.id).subjects.find(s=>s.enrolmentId===enrolmentId);
 if(!s){notify('Subject outside your accessible profile.');return;}
 if(!w.scopedClassIds.has(s.classId)||!w.scopeStudentIds.has(detail.id)||!w.academicAnalysis(s.classId).roster.some(p=>p.id===enrolmentId))state.scope='accessible';
 navigate('classes',{classId:s.classId,classTab:'student-analysis',analysisStudent:enrolmentId});
}
function openSearch(){
 if(!gradebook.guard()||searchDialog.open)return;
 hideHelp();searchReturn=focusToken(document.activeElement);
 searchDialog.innerHTML='<div class="dialog-head"><div><h2 id="search-title">Global search</h2><p class="subtitle">Search across all assigned responsibilities, not just the current scope.</p></div><button class="btn btn-icon" data-action="close-search" aria-label="Close search">'+icon('close')+'</button></div><div class="search-input-wrap">'+icon('search')+'<input id="global-query" type="search" autocomplete="off" placeholder="Student, class, tutor group, staff…" aria-label="Search your workspace"></div><div id="search-results" class="search-results">'+renderSearchResults(w,'')+'</div><div class="search-hint">Type to search · ↑ ↓ to move · Enter to open · Esc to close</div>';
 searchDialog.showModal();byId('global-query').focus();
}
function closeSearch(restore=true){
 if(searchDialog.open)searchDialog.close();if(restore)restoreFocus(searchReturn);searchReturn=null;
}
function pickSearch(value){
 const i=value.indexOf(':'),kind=value.slice(0,i),id=value.slice(i+1);closeSearch();
 if(kind==='class')openClass(id);else if(kind==='student')openStudent(id);else openDetail(kind,id);
}
function showHelp(anchor,pin=false){
 const content=HELP[anchor?.dataset.help];if(!content)return;
 if(helpAnchor!==anchor)hideHelp();
 helpAnchor=anchor;helpPinned=pin||helpPinned;tooltip.textContent=content;tooltip.hidden=false;
 // Put the tooltip inside the active native dialog so it remains in the top layer.
 const activeDialog=anchor.closest('dialog[open]');(activeDialog||document.body).appendChild(tooltip);
 anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-describedby','tooltip');
 const rect=anchor.getBoundingClientRect(),tip=tooltip.getBoundingClientRect();
 tooltip.style.left=Math.max(8,Math.min(rect.left,innerWidth-tip.width-8))+'px';
 tooltip.style.top=(rect.bottom+8+tip.height<innerHeight?rect.bottom+6:Math.max(8,rect.top-tip.height-6))+'px';
}
function hideHelp(){
 if(helpAnchor){helpAnchor.setAttribute('aria-expanded','false');helpAnchor.removeAttribute('aria-describedby');}
 helpAnchor=null;helpPinned=false;tooltip.hidden=true;
 if(tooltip.parentNode!==document.body)document.body.appendChild(tooltip);
}
function confirmReset(){
 if(!closeDetail(false))return;closeSearch(false);
 resetDialog.innerHTML='<div class="dialog-head"><h2 id="reset-title">Reset fictional demo data?</h2></div><div class="drawer-body"><p>This restores the original fictional school records, including assessments, notices, comments and interventions. All local demo edits will be lost. The archived prototype is unaffected.</p></div><div class="drawer-footer"><button class="btn" data-action="cancel-reset">Cancel</button><button class="btn btn-danger" data-action="confirm-reset">Reset demo</button></div>';
 resetDialog.showModal();resetDialog.querySelector('button')?.focus();
}
document.addEventListener('click',event=>{
 if(event.target.closest('.skip-link')){event.preventDefault();main.focus();return;}
 const help=event.target.closest('[data-help]');
 if(help){if(helpAnchor===help&&helpPinned)hideHelp();else showHelp(help,true);return;}
 hideHelp();
 const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
 const action=el.dataset.action,id=el.dataset.id||'';
 if(!['gradebook-save','gradebook-discard','toggle-assessment-columns','gradebook-undo','gradebook-redo','gradebook-copy','gradebook-fill','gradebook-clear','gradebook-export','gradebook-import-preview','gradebook-import-apply','gradebook-layout-toggle','gradebook-reveal-layout','gradebook-reset-layout','gradebook-toggle-group','gradebook-move-earlier','gradebook-move-later'].includes(action)&&!gradebook.guard()){event.preventDefault();return;}
 if(el.tagName==='A'&&(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey))return;
 event.preventDefault();
 switch(action){
  case 'gradebook-save':gradebook.save();break;
  case 'gradebook-discard':gradebook.discard();break;
  case 'gradebook-undo':case 'gradebook-redo':case 'gradebook-copy':case 'gradebook-fill':case 'gradebook-clear':case 'gradebook-export':case 'gradebook-import-preview':case 'gradebook-import-apply':gradebook.bulkAction(action);break;
  case 'gradebook-layout-toggle':{
    gradebookPanels.set(currentLayoutKey(),!state.gradebookLayoutOpen);render();gradebookActionFocus(action);break;
  }
  case 'gradebook-reveal-layout':changeLayout(revealLayout(personalLayout()),{focus:()=>gradebookActionFocus(action)});break;
  case 'gradebook-reset-layout':changeLayout(normalizeLayout(),{focus:()=>gradebookActionFocus(action)});break;
  case 'gradebook-toggle-group':{
    const p=personalLayout(),closed=new Set(p.collapsed);if(closed.has(id))closed.delete(id);else closed.add(id);
    changeLayout(updateLayout(p,{collapsed:[...closed]}),{focus:()=>gradebookActionFocus(action,id)});break;
  }
  case 'gradebook-move-earlier':case 'gradebook-move-later':{
    const b=w.markbook(state.classId),p=personalLayout();
    // Keep the complete class's custom order when working in one curriculum unit.
    changeLayout(moveAssessment(b.overview('').assessments,p,id,action==='gradebook-move-earlier'?-1:1,b.units,state.unitId),{focus:()=>gradebookActionFocus(action,id)});break;
  }
  case 'toggle-assessment-columns':{
    const b=w.markbook(state.classId),a=b.overview(state.unitId).assessments.find(a=>a.id===id&&a.mode!=='total');if(!a)break;
    const open=new Set(state.gradebookExpanded[state.classId]??[]);if(open.has(id))open.delete(id);else open.add(id);
    setGradebookExpansion(state.classId,open);render();
    const toggle=main.querySelector('[data-action="toggle-assessment-columns"][data-id="'+CSS.escape(id)+'"]');
    if(open.has(id)){const first=main.querySelector('.gradebook-cell[data-assessment="'+CSS.escape(id)+'"]');if(first){first.focus({preventScroll:true});first.scrollIntoView({block:'nearest',inline:'nearest'});}else toggle?.focus();}
    else toggle?.focus();break;
  }
  case 'navigate':navigate(id);break;
  case 'mobile-menu':{const open=nav.dataset.open!=='true';nav.dataset.open=String(open);el.setAttribute('aria-expanded',String(open));break;}
  case 'close-menu':nav.dataset.open='false';bar.querySelector('.mobile-toggle')?.setAttribute('aria-expanded','false');bar.querySelector('.mobile-toggle')?.focus();break;
  case 'search':openSearch();break;
  case 'close-search':closeSearch();break;
  case 'search-result':pickSearch(id);break;
  case 'open-class':openClass(id);break;
  case 'class-tab':
    state.classTab=['markbook','report-grades',...ANALYSIS_TABS].includes(id)?id:'information';
    {const hash=routeHash('classes',state.classId,state.classTab);if(location.hash!==hash)history.pushState(null,'',hash);}
    render({top:true});main.querySelector('[data-action="class-tab"][data-id="'+id+'"]')?.focus();break;
  case 'calculation-policy':openDetail('calculation-policy',id,{revision:store.revision()});break;
  case 'report-grade-detail':openDetail('report-grade',id,{revision:store.revision()});break;
  case 'use-calculated-report':{const grade=byId('report-grade');if(grade&&[...grade.options].some(o=>o.value===id)){grade.value=id;formDirty=true;}break;}
  case 'analysis-evidence':openDetail('analysis-evidence',id);break;
  case 'analysis-select-assessment':state.analysisAssessment=id;state.classTab='class-analysis';history.replaceState(null,'',routeHash('classes',state.classId,state.classTab));render({top:true});byId('analysis-assessment')?.focus();break;
  case 'analysis-print':window.print();break;
  case 'analysis-reset':clearAnalysis();render({top:true});byId('analysis-unit')?.focus();break;
  case 'new-unit':openDetail('unit-form',id);break;
  case 'new-assessment':openDetail('assessment-new',id);break;
  case 'reuse-assessment':{
    const selected=byId('reuse-assessment')?.value;
    if(!selected){notify('Choose an assessment to reuse.');break;}
    openDetail('assessment-copy',bookId(unpackBookId(id)[0],selected));break;
  }
  case 'open-markbook':openDetail('mark-grid',id);break;
  case 'next-unfinished-mark':grid.nextUnfinished();break;
  case 'markbook-analysis':{
    try{const [classId,assessmentId]=unpackBookId(id),a=w.markbook(classId).assessments.find(x=>x.id===assessmentId);
     if(!a||a.status!=='published'||a.date>w.asOf)throw Error('Only published assessments through the reference date can be analysed');
     navigate('classes',{classId,classTab:'class-analysis',analysisAssessment:assessmentId});
    }catch(error){notify(error.message);}break;
  }
  case 'assessment-settings':openDetail('assessment-settings',id);break;
  case 'duplicate-assessment':openDetail('assessment-copy',id);break;
  case 'delete-assessment':openDetail('delete-assessment',id);break;
  case 'edit-assessment':openDetail('assessment-edit',id);break;
  case 'add-assessment-item':case 'remove-assessment-item':{
    try{changeEditorRows(byId('assessment-form'),action,el);formDirty=true;}catch(error){notify(error.message);}break;
  }
  case 'publish-assessment':openDetail('publish-assessment',id);break;
  case 'student-exclusion':openDetail('student-exclusion',id);break;
  case 'assessment-exclusion':openDetail('assessment-exclusion',id);break;
  case 'reset-boundaries':{
    try{const b=w.markbook(unpackBookId(detail.id)[0]);resetEditorBoundaries(byId('assessment-form'),b.defaultBands);formDirty=true;}catch(error){notify(error.message);}break;
  }
  case 'preview-mark-import':try{grid.previewImport();grid.error('');}catch(error){grid.error(error.message);notify(error.message);}break;
  case 'apply-mark-import':try{grid.applyImport();grid.error('');}catch(error){grid.error(error.message);}break;
  case 'copy-mark-template':grid.copyTemplate();break;
  case 'download-mark-template':grid.downloadTemplate();break;
  case 'open-below':openClass(id,true);break;
  case 'go-classes':navigate('classes');break;
  case 'go-below':navigate('classes',{below:true});break;
  case 'go-students':navigate('students');break;
  case 'go-students-below':navigate('students',{studentFilters:{studentAttainment:'below'}});break;
  case 'home-markbook':if(w.scopedClassIds.has(id))navigate('classes',{classId:id,classTab:'markbook'});else notify('Class outside selected scope.');break;
  case 'home-group':{
    try{const [key,value,below]=JSON.parse(id);const filters=groupFilter(key,value,below===true);
      if(!w.studentRows().some(p=>String(p[key])===String(value)))throw Error('Group outside selected scope');
      navigate('students',{studentFilters:filters});
    }catch(error){notify(error.message);}break;
  }
  case 'go-notices':navigate('notices');break;
  case 'go-acknowledgements':navigate('notices',{noticeFilter:'pending'});break;
  case 'go-schedule':navigate('notices');byId('schedule-panel')?.focus();break;
  case 'focus-schedule':byId('schedule-panel')?.focus();break;
  case 'focus-attention':{const panel=byId('attention-panel');panel?.focus({preventScroll:true});panel?.scrollIntoView({block:'nearest',behavior:'instant'});break;}
  case 'go-personal-actions':navigate('intervention',{caseFilter:'actions'});break;
  case 'toggle-noticeboard':state.boardExpanded=!state.boardExpanded;render();document.querySelector('[data-action="toggle-noticeboard"]')?.focus();break;
  case 'show-active-notices':state.noticeFilter='active';render();break;
  case 'show-pending-notices':state.noticeFilter='pending';render();break;
  case 'show-archive':state.noticeFilter='archive';render();break;
  case 'go-cases':navigate('intervention');break;
  case 'go-actions':navigate('intervention',{caseFilter:'actions'});break;
  case 'class-cases':navigate('intervention',{caseClass:id});break;
  case 'class-cases-current':navigate('intervention',{caseClass:state.classId});break;
  case 'open-student':openStudent(id);break;
  case 'open-pupil-history':openPupilHistory(id);break;
  case 'profile-focus':if(['all','below','unknown','support'].includes(id))changeProfile({subjectFilter:id},'profile-filter-'+id);break;
  case 'open-student-support':openStudent(id,'support');break;
  case 'profile-tab':if(PROFILE_TABS.some(([k])=>k===id))changeProfile({tab:id},null,'profile-tab');break;
  case 'profile-switch':switchProfile(id);break;
  case 'profile-select-subject':
    if(detail?.kind==='student'&&w.studentProfile(detail.id).subjects.some(s=>s.enrolmentId===id))changeProfile({tab:'assessments',subjectId:id},'profile-subject');break;
  case 'profile-result':openDetail('profile-result',id);break;
  case 'profile-open-analysis':openProfileAnalysis(id);break;
  case 'profile-open-class':
    if(!w.accessibleClassIds.has(id)){notify('Class outside your accessible records.');break;}
    if(!w.scopedClassIds.has(id))state.scope='accessible';
    navigate('classes',{classId:id,classTab:'information'});break;
  case 'open-profile-staff':openDetail('staff',id);break;
  case 'students-reset':clearStudentFilters();render();break;
  case 'students-below':clearStudentFilters();state.studentAttainment='below';render();break;
  case 'students-soc':clearStudentFilters();state.studentSupport='active';render();break;
  case 'students-due':clearStudentFilters();state.studentSupport='due';render();break;
  case 'open-case':openDetail('case',id);break;
  case 'open-case-plan':openDetail('case',id);{
    if(detail?.kind==='case'&&detail.id===id){const plan=byId('case-study-plan');plan?.focus({preventScroll:true});plan?.scrollIntoView({block:'start'});}
  }break;
  case 'case-focus':
    if(CASE_FILTERS.some(([key])=>key===id)){
      state.caseFilter=id;
      if(id==='actions'){state.caseClass=null;state.tutorFilter='all';state.houseFilter='all';}
      render();main.querySelector('[data-action="case-focus"][data-id="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});
    }break;
  case 'new-case':openDetail('case-new',id,{revision:store.revision()});break;
  case 'case-action':openDetail('case-action',id,{revision:store.revision()});break;
  case 'cases-reset':clearRegisterFilters();state.caseClass=null;state.caseFilter='active';render();break;
  case 'open-notice':openDetail('notice',id);break;
  case 'open-deadline':openDetail('deadline',id);break;
  case 'new-notice':openDetail('notice-form','');break;
  case 'edit-notice':openDetail('notice-form',id);break;
  case 'new-deadline':openDetail('deadline-form','');break;
  case 'edit-deadline':openDetail('deadline-form',id);break;
  case 'archive-notice':openDetail('archive-notice',id);break;
  case 'archive-deadline':openDetail('archive-deadline',id);break;
  case 'ack-notice':
    try{store.acknowledgeNotice(state.staffId,id);detailDialog.querySelector('.dialog-head button')?.focus();notify('Notice acknowledged. Your Home queue has been updated.');}
    catch(error){notify(String(error.message||error));}break;
  case 'toggle-deadline':
    try{const completed=!w.deadlineDetail(id).completed;store.setDeadlineCompletion(state.staffId,id,completed);detailDialog.querySelector('.dialog-head button')?.focus();notify(completed?'Personal reminder completed.':'Personal reminder reopened.');}
    catch(error){notify(String(error.message||error));}break;
  case 'edit-prediction':openDetail('prediction',id);break;
  case 'edit-target':openDetail('target',id);break;
  case 'subject-summary':openDetail('subject-summary',id);break;
  case 'subject-comments':openDetail('subject-comments',id);break;
  case 'edit-comment':openDetail('comment-edit',id);break;
  case 'clear-register-filters':clearRegisterFilters();render();main.querySelector('[data-action="clear-register-filters"]')?.focus({preventScroll:true});break;
  case 'register-focus':
    try{Object.assign(state,registerFocusFilter(id));render();main.querySelector('[data-action="register-focus"][data-id="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});}catch(error){notify(error.message);}break;
  case 'toggle-register-filters':
    state.registerFiltersOpen=!state.registerFiltersOpen;render();main.querySelector('[data-action="toggle-register-filters"]')?.focus({preventScroll:true});break;
  case 'toggle-register-columns':
    state.registerColumnsOpen=!state.registerColumnsOpen;render();main.querySelector('[data-action="toggle-register-columns"]')?.focus({preventScroll:true});break;
  case 'register-preset':
    if(!['daily','full'].includes(id))break;
    state.columnGroups=[...(id==='daily'?DEFAULT_GROUPS:FULL_GROUPS)];saveColumns();render();
    {const table=main.querySelector('.roster-table');if(table)table.scrollLeft=0;}
    main.querySelector('[data-action="register-preset"][data-id="'+id+'"]')?.focus({preventScroll:true});break;
  case 'toggle-columns':
    if(!GROUPS.some(g=>g.id===id))break;
    state.columnGroups=state.columnGroups.includes(id)?state.columnGroups.filter(g=>g!==id):[...state.columnGroups,id];
    saveColumns();render();main.querySelector('[data-action="toggle-columns"][data-id="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});break;
  case 'reset-columns':state.columnGroups=[...DEFAULT_GROUPS];saveColumns();render();main.querySelector('[data-action="reset-columns"]')?.focus({preventScroll:true});break;
  case 'close-detail':closeDetail();break;
  case 'detail-back':detailBack();break;
  case 'toggle-below':{const below=state.below||state.trackFilter==='below';state.below=!below;state.trackFilter='all';render({keepFocus:true});break;}
  case 'filter-active':state.caseFilter='active';render();break;
  case 'filter-due':state.caseFilter='due';render();break;
  case 'filter-closed':state.caseFilter='closed';render();break;
  case 'clear-case-class':state.caseClass=null;render();break;
  case 'sort':{const [name,key]=id.split(':');const previous=state.sorts[name];state.sorts[name]={key,direction:previous?.key===key&&previous.direction==='asc'?'desc':'asc'};render();main.querySelector('[data-action="sort"][data-id="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});break;}
  case 'demo-guide':openDetail('demo-guide','');break;
  case 'demo-scenario':{
    const scenarios={faculty:{staff:'sam',scope:'faculty',page:'classes',classId:'11-maths-1',classTab:'markbook'},tutor:{staff:'jordan',scope:'tutor',page:'students'},house:{staff:'morgan',scope:'house',page:'intervention'},leadership:{staff:'avery',scope:'school',page:'home'}};
    const scenario=scenarios[id];if(!scenario||!closeDetail(false))break;
    state.staffId=scenario.staff;state.scope=scenario.scope;state.columnGroups=loadColumns(state.staffId);
    navigate(scenario.page,{classId:scenario.classId??null,classTab:scenario.classTab??'information'});
    break;
  }
  case 'reset-demo':confirmReset();break;
  case 'cancel-reset':resetDialog.close();break;
  case 'confirm-reset':try{store.reset({confirmed:true});resetDialog.close();notify('Fictional demo data restored.');}catch(error){notify(String(error.message||error));}break;
 }
});
document.addEventListener('paste',event=>{if(!gradebook.paste(event))grid.paste(event);});
document.addEventListener('copy',event=>gradebook.copy(event));
document.addEventListener('pointerdown',event=>gradebook.pointer(event));
document.addEventListener('focusin',event=>{gradebook.onFocus(event.target);grid.onFocus(event.target);});
window.addEventListener('beforeunload',event=>{if(gradebook.isDirty()||grid.isDirty()||formDirty){event.preventDefault();event.returnValue='';}});
document.addEventListener('input',event=>{
 if(gradebook.onInput(event.target)||grid.onInput(event.target))return;
 if(event.target.closest('form')?.id==='assessment-form')editorInput(byId('assessment-form'),event.target);
 if(detailDialog.contains(event.target)&&event.target.closest('form')&&event.target.closest('form').id!=='mark-grid-form')formDirty=true;
 if(event.target.id==='global-query'){byId('search-results').innerHTML=renderSearchResults(w,event.target.value);return;}
 if(event.target.id==='page-query'){state.query=event.target.value;render({keepFocus:true});}
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(gradebook.onChange(el)||grid.onChange(el))return;
 if(el.id==='boundary-unit'){try{changeBoundaryUnit(byId('assessment-form'));}catch(error){notify(error.message);}formDirty=true;return;}
 if(el.id==='assessment-mode')editorInput(byId('assessment-form'),el);
 if(detailDialog.contains(el)&&el.closest('form')&&el.closest('form').id!=='mark-grid-form')formDirty=true;
 if(el.id==='profile-pupil'){switchProfile(el.value);return;}
 if(el.id==='profile-subject'){changeProfile({subjectId:el.value},'profile-subject');return;}
 if(el.id==='profile-comment-subject'){changeProfile({commentSubject:el.value},'profile-comment-subject');return;}
 const studentFields={'student-year':'studentYear','student-attainment':'studentAttainment','student-support':'studentSupport'};
 if(studentFields[el.id]){state[studentFields[el.id]]=el.value;render({keepFocus:true});return;}
 const layoutFields={'gradebook-group':'group','gradebook-order':'order','gradebook-display':'display','gradebook-quick-display':'display','gradebook-filter':'filter','gradebook-format':'format','gradebook-density':'density','gradebook-from':'from','gradebook-to':'to'};
 if(layoutFields[el.id]&&main.querySelector('#gradebook-surface')){
  const p=personalLayout(),field=layoutFields[el.id],patch={...p,[field]:el.value};
  if(patch.from&&patch.to&&patch.from>patch.to){notify('From date must be on or before To date.');el.value=p[field];return;}
  changeLayout(updateLayout(p,patch),{focus:()=>byId(el.id)?.focus({preventScroll:true})});return;
 }
 if(el.matches('.gradebook-summary-choice,.gradebook-assessment-choice')&&main.querySelector('#gradebook-surface')){
  const p=personalLayout(),summary=el.matches('.gradebook-summary-choice'),key=summary?'summary':'hidden',set=new Set(p[key]);
  if(summary?el.checked:!el.checked)set.add(el.value);else set.delete(el.value);
  changeLayout(updateLayout(p,{[key]:[...set]}),{focus:()=>main.querySelector('.'+(summary?'gradebook-summary-choice':'gradebook-assessment-choice')+'[value="'+CSS.escape(el.value)+'"]')?.focus({preventScroll:true})});return;
 }
 if(el.id==='report-period'){state.reportPeriod=el.value;render({keepFocus:true});return;}
 if(el.id==='markbook-unit'){if(!gradebook.guard()){el.value=main.querySelector('#gradebook-surface')?.dataset.unitId??'';return;}state.unitId=el.value;render({keepFocus:true});return;}
 if(gradebook.isDirty()&&['staff','scope','quick-class'].includes(el.id)){gradebook.guard();el.value=el.id==='staff'?state.staffId:el.id==='scope'?state.scope:state.classId;return;}
 const analysisFields={'analysis-student':'analysisStudent','analysis-assessment':'analysisAssessment','analysis-common':'analysisCommon','analysis-unit':'analysisUnit','analysis-from':'analysisFrom','analysis-to':'analysisTo'};
 if(analysisFields[el.id]){
  const key=analysisFields[el.id],value=el.value,old=state[key];state[key]=value;
  try{w.academicAnalysis(state.classId).filters({from:state.analysisFrom,to:state.analysisTo,unitId:state.analysisUnit});}catch(error){state[key]=old;el.value=old||(key==='analysisTo'?w.asOf:'');notify(error.message);return;}
  render({keepFocus:true});return;
 }
 if(el.id==='staff'){if(!closeDetail(false)){el.value=state.staffId;return;}clearFilters();state.staffId=el.value;state.columnGroups=loadColumns(state.staffId);state.scope=null;state.classId=null;state.page='home';history.replaceState(null,'',routeHash('home'));render({top:true});byId('staff')?.focus({preventScroll:true});}
 if(el.id==='scope'){if(!closeDetail(false)){el.value=state.scope;return;}state.scope=el.value;clearFilters();render({top:true});byId('scope')?.focus({preventScroll:true});}
 if(el.id==='quick-class'){if(el.value)openClass(el.value);else navigate('classes');}
 if(el.id==='flag-filter'){state.flag=el.value;render({keepFocus:true});}
 const registerFilters={'tutor-filter':'tutorFilter','house-filter':'houseFilter','track-filter':'trackFilter','support-filter':'supportFilter','class-year':'classYear','class-faculty':'classFaculty'};
 if(registerFilters[el.id]){state[registerFilters[el.id]]=el.value;if(el.id==='track-filter')state.below=false;render({keepFocus:true});}
 if(el.id==='below-filter'){state.below=el.checked;render({keepFocus:true});}
 if(el.id==='case-filter'){state.caseFilter=el.value;if(el.value==='actions'){state.caseClass=null;state.tutorFilter='all';state.houseFilter='all';}render({keepFocus:true});}
 if(el.id==='notice-filter'){state.noticeFilter=el.value;render({keepFocus:true});}
 if(el.id==='deadline-filter'){state.deadlineFilter=el.value;render({keepFocus:true});}
});
document.addEventListener('submit',event=>{
 if(['calculation-faculty-form','calculation-course-form','report-grade-form'].includes(event.target.id)){
  event.preventDefault();const form=new FormData(event.target),record=detail&&{...detail};
  suspendDetailRefresh=true;
  try{
   if(!record)throw Error('No selected reporting record');
   const [classId,periodId,enrolmentId]=unpackBookId(record.id),get=name=>String(form.get(name)??''),confirmed=form.has('confirmed'),reason=get('reason');
   if(record.kind==='calculation-policy'){
    const level=get('level');store.setCalculationPolicy(state.staffId,classId,{level,method:get('calculation-'+level+'-method')||null,defaultWeight:Number(get('defaultWeight')),confirmed,reason},{expectedRevision:record.revision});
    notify('Calculation settings saved. Live attainment recalculated; submitted reports unchanged.');
   }else if(record.kind==='report-grade'){
    const action=get('report-action');store.saveReportGrade(state.staffId,periodId,enrolmentId,{action,grade:get('report-grade'),confirmed,reason},{expectedRevision:record.revision});
    notify(action==='submit'?'Report grade submitted in the fictional Hub.':action==='reopen'?'Report grade reopened to draft.':'Report grade draft saved.');
   }else throw Error('Invalid reporting action');
   formDirty=false;closeDetail();
  }catch(error){const node=byId('form-error');if(node){node.hidden=false;node.textContent=error.message;}else notify(error.message);}
  finally{suspendDetailRefresh=false;}
  return;
 }
 if(['case-select-form','intervention-form'].includes(event.target.id)){
  event.preventDefault();const form=new FormData(event.target),record=detail&&{...detail};
  if(!record)return;
  suspendDetailRefresh=true;
  try{
   if(event.target.id==='case-select-form'){
    if(record.kind!=='case-new')throw Error('No selected pupil');
    const id=String(form.get('enrolmentId')??'');
    const next={kind:'case-new',id,revision:store.revision()},markup=renderDetail(w,next);
    formDirty=false;detail=next;refreshDetail(markup);detailDialog.querySelector('.drawer-body').scrollTop=0;return;
   }
   let id;
   if(record.kind==='case-new'){
    if(record.revision!==store.revision())throw Error('Records changed since this form was opened; reopen it before saving');
    id=store.startIntervention(state.staffId,record.id,caseFormInput(form,'startWave1')).id;
   }else if(record.kind==='case-action'){
    const [caseId,action]=unpackCaseAction(record.id);id=caseId;
    store.interventionAction(state.staffId,id,action,caseFormInput(form,action),{expectedRevision:record.revision});
   }else throw Error('Unknown intervention form');
   // Keep the caller on the stack (pupil profile, class, or Home); don't add a stale form.
   if(detailStack.at(-1)?.kind==='case'&&detailStack.at(-1).id===id)detailStack.pop();
   formDirty=false;detail={kind:'case',id};refreshDetail();detailDialog.querySelector('.drawer-body').scrollTop=0;
   detailDialog.querySelector('.dialog-head button')?.focus({preventScroll:true});
   notify('Intervention record saved. Student profiles and staff action queues updated.');
  }catch(error){const node=byId('form-error');if(node){node.hidden=false;node.textContent=error.message;}else notify(error.message);}
  finally{suspendDetailRefresh=false;}
  return;
 }
 if(event.target.id==='mark-grid-form'){
  event.preventDefault();suspendDetailRefresh=true;
  try{if(grid.save(event.target)){refreshDetail();detailDialog.querySelector('#mark-grid-form button[type=submit]')?.focus({preventScroll:true});}grid.error('');}
  catch(error){grid.error(error.message);}finally{suspendDetailRefresh=false;}return;
 }
 if(['unit-form','assessment-form','assessment-guard-form'].includes(event.target.id)){
  event.preventDefault();const form=new FormData(event.target),record=detail&&{...detail};
  suspendDetailRefresh=true;
  try{
   if(!record)throw Error('No selected assessment record');
   const [classId,assessmentId,enrolmentId]=unpackBookId(record.id),book=w.markbook(classId);
   if(record.kind==='unit-form'){
    const saved=store.addUnit(state.staffId,classId,String(form.get('title')??''));
    formDirty=false;state.unitId=saved.id;closeDetail();render();notify('Curriculum unit added.');return;
   }
   if(['assessment-new','assessment-copy','assessment-edit'].includes(record.kind)){
    const old=record.kind==='assessment-edit'?book.detail(assessmentId):null;
    const input=definitionInput(form,book,old);
    const saved=store.saveAssessment(state.staffId,classId,old?assessmentId:null,input);
    formDirty=false;if(state.unitId&&state.unitId!==input.unitId)state.unitId=input.unitId;
    if(!old&&state.classId===classId&&state.classTab==='markbook'){
     const current=w.markbook(classId),a=current.overview('').assessments.find(a=>a.id===saved.id);
     if(a){
      let p=personalLayout();
      if(!matchesLayout(a,p,w.asOf))p=updateLayout(p,{filter:'all',format:'all',from:'',to:'',hidden:p.hidden.filter(id=>id!==a.id)});
      const group=groupOf(a,p.group,current.units);p=updateLayout(p,{display:'marks',collapsed:p.collapsed.filter(id=>id!==group.id)});
      gradebookLayouts.set(currentLayoutKey(),p);try{saveLayout(window.localStorage,state.staffId,classId,p);}catch{}
     }
     if(input.mode!=='total'){const expanded=new Set(gradebookExpansions.get(currentLayoutKey())??[]);expanded.add(saved.id);setGradebookExpansion(classId,expanded);}
    }render();
    if(old&&detailStack.length)detailBack();
    else if(state.page==='classes'&&state.classId===classId&&state.classTab==='markbook'){
     closeDetail(false);main.querySelector('.gradebook-cell[data-assessment="'+CSS.escape(saved.id)+'"]')?.focus();
    }else{closeDetail();openDetail('mark-grid',bookId(classId,saved.id));}
    notify(old?'Assessment settings saved.':input.initialStatus==='draft'?'Draft created. Publish it when ready.':'Assessment created. Ready for mark entry.');return;
   }
   const d=book.detail(assessmentId),confirmed=form.has('confirmed'),reason=String(form.get('reason')??'');
   if(record.kind==='delete-assessment'){store.deleteEmptyAssessment(state.staffId,assessmentId,{confirmed});formDirty=false;closeDetail();notify('Empty draft deleted.');return;}
   if(record.kind==='publish-assessment')store.publishAssessment(state.staffId,assessmentId,{confirmed});
   else if(record.kind==='assessment-exclusion')store.setAssessmentInclusion(state.staffId,assessmentId,{included:!d.assessment.includeInSummary,reason,confirmed,phrase:String(form.get('phrase')??'')});
   else if(record.kind==='student-exclusion'){
    const row=d.rows.find(r=>r.enrolmentId===enrolmentId);if(!row)throw Error('Student outside current register');
    store.setStudentExclusion(state.staffId,assessmentId,enrolmentId,{excluded:!row.exclusionReason,reason,confirmed});
   }else throw Error('Unknown assessment action');
   formDirty=false;if(detailStack.length)detailBack();else closeDetail();
   notify('Assessment updated. All dependent summaries recalculated.');
  }catch(error){const node=byId('form-error');if(node){node.hidden=false;node.textContent=error.message;}else notify(error.message);}
  finally{suspendDetailRefresh=false;}
  return;
 }
 if(['comment-form','target-form'].includes(event.target.id)){
  event.preventDefault();const form=new FormData(event.target),record=detail&&{...detail};
  try{
   if(!record)throw Error('No selected subject record');
   if(record.kind==='target'){
    if(!form.has('confirmed'))throw Error('Confirm the revised target');
    store.setMinimumTarget(state.staffId,record.id,byId('minimum-target').value);
    formDirty=false;if(detailStack.length)detailBack();else closeDetail();notify('Minimum target saved; target comparisons updated.');
   }else if(record.kind==='subject-comments'||record.kind==='comment-edit'){
    const existing=record.kind==='comment-edit'?w.noteDetail(record.id):null;
    const enrolmentId=existing?existing.enrolmentId:record.id;
    store.saveSubjectNote(state.staffId,enrolmentId,existing?.id??null,String(form.get('text')??''));
    formDirty=false;if(existing&&detailStack.length)detailBack();else if(existing){closeDetail();}
    else{refreshDetail();byId('comment-text')?.focus({preventScroll:true});}
    notify('Subject comment saved.');
   }else throw Error('Unknown subject form');
  }catch(error){const node=byId('form-error');if(node){node.hidden=false;node.textContent=String(error.message||error);}else notify(String(error.message||error));}
  return;
 }
 if(['communication-form','archive-form'].includes(event.target.id)){
  event.preventDefault();
  const form=new FormData(event.target),record=detail&&{...detail};
  try{
   if(!record)throw Error('No selected communication record');
   if(event.target.id==='archive-form'){
    const confirmed=form.has('confirmed');
    if(record.kind==='archive-notice')store.archiveNotice(state.staffId,record.id,{confirmed});
    else if(record.kind==='archive-deadline')store.archiveDeadline(state.staffId,record.id,{confirmed});
    else throw Error('Unknown archive record');
    formDirty=false;closeDetail();notify('Record archived. Active views and reminders updated.');return;
   }
   const get=name=>String(form.get(name)??''),common={title:get('title'),audience:JSON.parse(get('audience')),confirmed:form.has('confirmed')};
   if(record.kind==='notice-form'){
    store.saveNotice(state.staffId,record.id||null,{...common,kind:get('kind'),body:get('body'),priority:get('priority'),
      publishedDate:get('publishedDate'),expiryDate:get('expiryDate')||null,pinned:form.has('pinned'),
      requiresAcknowledgement:form.has('requiresAcknowledgement'),links:get('links').split(/\r?\n/).map(s=>s.trim()).filter(Boolean)});
    notify(record.id?'Notice updated.':'Notice published or scheduled.');
   }else if(record.kind==='deadline-form'){
    store.saveDeadline(state.staffId,record.id||null,{...common,event:get('event'),dueDate:get('dueDate'),details:get('details')});
    notify('Reporting schedule updated for the relevant staff.');
   }else throw Error('Unknown communication form');
   formDirty=false;if(detailStack.length)detailBack();else closeDetail();
  }catch(error){const node=byId('form-error');if(node){node.hidden=false;node.textContent=String(error.message||error);}else notify(String(error.message||error));}
  return;
 }
 if(event.target.id!=='prediction-form')return;
 event.preventDefault();
 try{
  if(detail?.kind!=='prediction')throw Error('No prediction selected');
  const value=byId('prediction').value;
  store.setPrediction(state.staffId,detail.id,value||null);
  formDirty=false;if(detailStack.length)detailBack();else closeDetail();
  notify('Predicted grade saved. All relevant views are updated.');
 }catch(error){const node=byId('form-error');if(node){node.hidden=false;node.textContent=String(error.message||error);}else notify(String(error.message||error));}
});
document.addEventListener('keydown',event=>{
 if(gradebook.keyboard(event)||grid.keyboard(event))return;
 if(event.key==='Escape'&&helpAnchor){event.preventDefault();hideHelp();return;}
 if(searchDialog.open){
  const items=[...searchDialog.querySelectorAll('.search-result')],i=items.indexOf(document.activeElement);
  if((event.key==='ArrowDown'||event.key==='ArrowUp')&&items.length){event.preventDefault();items[i<0?(event.key==='ArrowDown'?0:items.length-1):(i+(event.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();return;}
  if(event.key==='Enter'&&document.activeElement?.id==='global-query'&&items.length){event.preventDefault();pickSearch(items[0].dataset.id);return;}
  return;
 }
 if(detailDialog.open||resetDialog.open)return;
 const typing=/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable;
 if((event.key==='/'&&!typing||event.key.toLowerCase()==='k'&&(event.ctrlKey||event.metaKey))){event.preventDefault();openSearch();}
 if(event.key==='Escape'&&nav.dataset.open==='true'){nav.dataset.open='false';bar.querySelector('.mobile-toggle')?.setAttribute('aria-expanded','false');}
});
for(const eventName of ['pointerover','focusin'])document.addEventListener(eventName,event=>{const el=event.target.closest?.('[data-help]');if(el&&!helpPinned)showHelp(el);});
document.addEventListener('pointerout',event=>{if(helpAnchor&&!helpPinned&&helpAnchor.contains(event.target)&&!helpAnchor.contains(event.relatedTarget)&&document.activeElement!==helpAnchor)hideHelp();});
document.addEventListener('focusout',event=>{if(helpAnchor&&!helpPinned&&event.target===helpAnchor)hideHelp();});
window.addEventListener('resize',hideHelp);document.addEventListener('scroll',hideHelp,true);
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null)notify('Demo data changed in another tab. Reload before making further edits.');});
searchDialog.addEventListener('cancel',event=>{event.preventDefault();closeSearch();});
detailDialog.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
for(const d of [searchDialog,detailDialog])d.addEventListener('click',event=>{if(event.target===d){const rect=d.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)d===detailDialog?closeDetail():closeSearch();}});
window.addEventListener('popstate',()=>{const route=parseRoute(location.hash);if(!gradebook.guard()||!closeDetail(false)){history.pushState(null,'',routeHash(state.page,state.classId,state.classTab));return;}closeSearch(false);clearFilters();state.classTab=route.classTab??'information';state.unitId='';Object.assign(state,route);if(route.classId&&!w.scopedClassIds.has(route.classId)&&w.accessibleClassIds.has(route.classId))state.scope='accessible';render({top:true});});
boot();
