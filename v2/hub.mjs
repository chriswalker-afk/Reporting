import {createStore} from './store.mjs';
import {createWorkspace,parseRoute,routeHash,HELP} from './workspace.mjs';
import {sidebar,topbar,renderPage,renderDetail,renderSearchResults,esc,icon} from './views.mjs';

const byId=id=>document.getElementById(id);
const main=byId('workspace'),nav=byId('sidebar'),bar=byId('topbar');
const searchDialog=byId('search-dialog'),detailDialog=byId('detail-dialog'),resetDialog=byId('reset-dialog');
const tooltip=byId('tooltip'),toast=byId('toast');
let store,w,workspaceKey='',toastTimer,helpAnchor=null,helpPinned=false,drawerReturn=null,searchReturn=null,detail=null,detailStack=[];
const state={...parseRoute(location.hash),staffId:'sam',scope:null,query:'',flag:'all',below:false,caseFilter:'active',caseClass:null,noticeFilter:'active',deadlineFilter:'open',sorts:{}};
let storageIssue='';
function boot(){
 try{store=createStore({storage:window.localStorage});}
 catch(error){storageIssue='Saved demo data could not be loaded. This session uses fresh fictional data; existing storage was not overwritten. '+String(error.message||error);store=createStore();}
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
 if(state.page==='classes'&&state.classId&&!w.scopedClassIds.has(state.classId)){state.classId=null;history.replaceState(null,'',routeHash('classes'));}
 nav.innerHTML=sidebar(state.page,w);bar.innerHTML=topbar(w);
 main.innerHTML=(storageIssue?'<div class="alert" role="status">'+esc(storageIssue)+'</div>':'')+renderPage(w,state);
 main.scrollTop=top?0:oldScroll;
 const table=main.querySelector('.table-scroll');if(!top&&table&&tableScroll){table.scrollTop=tableScroll.top;table.scrollLeft=tableScroll.left;}
 if(oldId){const next=byId(oldId);next?.focus({preventScroll:true});if(caret!==null&&next?.type==='search')try{next.setSelectionRange(caret,caret);}catch{}}
 if(detail&&detailDialog.open)try{refreshDetail();}catch{closeDetail();}
}
function clearFilters(){state.query='';state.flag='all';state.below=false;state.caseFilter='active';state.caseClass=null;state.noticeFilter='active';state.deadlineFilter='open';}
function navigate(page,{classId=null,below=false,caseFilter='active',caseClass=null,noticeFilter='active',deadlineFilter='open',preserve=false}={}){
 closeDetail(false);closeSearch(false);nav.dataset.open='false';
 if(!preserve)clearFilters();
 state.page=page;state.classId=classId;state.below=below;state.caseFilter=caseFilter;state.caseClass=caseClass;state.noticeFilter=noticeFilter;state.deadlineFilter=deadlineFilter;
 const hash=routeHash(page,classId);if(location.hash!==hash)history.pushState(null,'',hash);
 render({top:true});main.focus({preventScroll:true});
}
function openClass(id,below=false){
 if(!w.accessibleClassIds.has(id)){notify('Class outside your accessible demo scope.');return;}
 if(!w.scopedClassIds.has(id))state.scope='accessible';
 navigate('classes',{classId:id,below});
}
function focusToken(el){return el?{element:el,id:el.id,action:el.dataset?.action,record:el.dataset?.id}:null;}
function restoreFocus(token){
 if(!token)return;
 const node=token.element?.isConnected?token.element:token.id?byId(token.id):token.action?document.querySelector('[data-action="'+CSS.escape(token.action)+'"]'+(token.record!==undefined?'[data-id="'+CSS.escape(token.record)+'"]':'')):null;
 node?.focus({preventScroll:true});
}
function openDetail(kind,id){
 hideHelp();
 const next={kind,id};
 try{
  const markup=renderDetail(w,next);
  if(!detailDialog.open){drawerReturn=focusToken(document.activeElement);detailStack=[];detail=next;detailDialog.innerHTML=markup;detailDialog.showModal();}
  else{if(detail)detailStack.push({...detail,scroll:detailDialog.querySelector('.drawer-body')?.scrollTop||0});detail=next;detailDialog.innerHTML=markup;addBack();}
  detailDialog.querySelector('.dialog-head button')?.focus({preventScroll:true});
 }catch(error){notify(String(error.message||error));}
}
function addBack(){
 if(detailStack.length){
  const head=detailDialog.querySelector('.dialog-head');
  head?.insertAdjacentHTML('afterbegin','<button type="button" class="btn btn-icon" data-action="detail-back" aria-label="Back to previous record">'+icon('back')+'</button>');
 }
}
function refreshDetail(){
 const scroll=detailDialog.querySelector('.drawer-body')?.scrollTop||0;
 detailDialog.innerHTML=renderDetail(w,detail);addBack();
 const body=detailDialog.querySelector('.drawer-body');if(body)body.scrollTop=scroll;
}
function detailBack(){
 if(!detailStack.length){closeDetail();return;}
 const old=detailStack.pop();detail={kind:old.kind,id:old.id};refreshDetail();
 const body=detailDialog.querySelector('.drawer-body');if(body)body.scrollTop=old.scroll;
 detailDialog.querySelector('.dialog-head button')?.focus({preventScroll:true});
}
function closeDetail(restore=true){
 detail=null;detailStack=[];if(detailDialog.open)detailDialog.close();
 if(restore)restoreFocus(drawerReturn);
 drawerReturn=null;
}
function openSearch(){
 if(searchDialog.open)return;
 hideHelp();searchReturn=focusToken(document.activeElement);
 searchDialog.innerHTML='<div class="dialog-head"><div><h2 id="search-title">Global search</h2><p class="subtitle">Search across all assigned responsibilities, not just the current scope.</p></div><button class="btn btn-icon" data-action="close-search" aria-label="Close search">'+icon('close')+'</button></div><div class="search-input-wrap">'+icon('search')+'<input id="global-query" type="search" autocomplete="off" placeholder="Student, class, tutor group, staff…" aria-label="Search your workspace"></div><div id="search-results" class="search-results">'+renderSearchResults(w,'')+'</div><div class="search-hint">Type to search · ↑ ↓ to move · Enter to open · Esc to close</div>';
 searchDialog.showModal();byId('global-query').focus();
}
function closeSearch(restore=true){
 if(searchDialog.open)searchDialog.close();if(restore)restoreFocus(searchReturn);searchReturn=null;
}
function pickSearch(value){
 const i=value.indexOf(':'),kind=value.slice(0,i),id=value.slice(i+1);closeSearch();
 if(kind==='class')openClass(id);else openDetail(kind,id);
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
 resetDialog.innerHTML='<div class="dialog-head"><h2 id="reset-title">Reset fictional demo data?</h2></div><div class="drawer-body"><p>This will restore the original fictional marks and predictions and remove local demo edits. It does not affect the archived prototype.</p></div><div class="drawer-footer"><button class="btn" data-action="cancel-reset">Cancel</button><button class="btn btn-danger" data-action="confirm-reset">Reset demo</button></div>';
 resetDialog.showModal();resetDialog.querySelector('button')?.focus();
}
document.addEventListener('click',event=>{
 if(event.target.closest('.skip-link')){event.preventDefault();main.focus();return;}
 const help=event.target.closest('[data-help]');
 if(help){if(helpAnchor===help&&helpPinned)hideHelp();else showHelp(help,true);return;}
 hideHelp();
 const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
 const action=el.dataset.action,id=el.dataset.id||'';
 if(el.tagName==='A'&&(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey))return;
 event.preventDefault();
 switch(action){
  case 'navigate':navigate(id);break;
  case 'mobile-menu':{const open=nav.dataset.open!=='true';nav.dataset.open=String(open);el.setAttribute('aria-expanded',String(open));break;}
  case 'close-menu':nav.dataset.open='false';bar.querySelector('.mobile-toggle')?.setAttribute('aria-expanded','false');bar.querySelector('.mobile-toggle')?.focus();break;
  case 'search':openSearch();break;
  case 'close-search':closeSearch();break;
  case 'search-result':pickSearch(id);break;
  case 'open-class':openClass(id);break;
  case 'open-below':openClass(id,true);break;
  case 'go-classes':navigate('classes');break;
  case 'go-below':navigate('classes',{below:true});break;
  case 'go-students':navigate('students');break;
  case 'go-notices':navigate('notices');break;
  case 'go-acknowledgements':navigate('notices',{noticeFilter:'pending'});break;
  case 'go-schedule':navigate('notices');byId('schedule-panel')?.focus();break;
  case 'focus-schedule':byId('schedule-panel')?.focus();break;
  case 'focus-attention':byId('attention-panel')?.focus();break;
  case 'go-personal-actions':state.scope='accessible';navigate('intervention',{caseFilter:'actions'});break;
  case 'show-active-notices':state.noticeFilter='active';render();break;
  case 'show-pending-notices':state.noticeFilter='pending';render();break;
  case 'show-archive':state.noticeFilter='archive';render();break;
  case 'go-cases':navigate('intervention');break;
  case 'go-actions':navigate('intervention',{caseFilter:'actions'});break;
  case 'class-cases':navigate('intervention',{caseClass:id});break;
  case 'class-cases-current':navigate('intervention',{caseClass:state.classId});break;
  case 'open-student':openDetail('student',id);break;
  case 'open-case':openDetail('case',id);break;
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
  case 'close-detail':closeDetail();break;
  case 'detail-back':detailBack();break;
  case 'toggle-below':state.below=!state.below;render({keepFocus:true});break;
  case 'filter-active':state.caseFilter='active';render();break;
  case 'filter-due':state.caseFilter='due';render();break;
  case 'filter-closed':state.caseFilter='closed';render();break;
  case 'clear-case-class':state.caseClass=null;render();break;
  case 'sort':{const [name,key]=id.split(':');const previous=state.sorts[name];state.sorts[name]={key,direction:previous?.key===key&&previous.direction==='asc'?'desc':'asc'};render();main.querySelector('[data-action="sort"][data-id="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});break;}
  case 'reset-demo':confirmReset();break;
  case 'cancel-reset':resetDialog.close();break;
  case 'confirm-reset':try{store.reset({confirmed:true});resetDialog.close();notify('Fictional demo data restored.');}catch(error){notify(String(error.message||error));}break;
 }
});
document.addEventListener('input',event=>{
 if(event.target.id==='global-query'){byId('search-results').innerHTML=renderSearchResults(w,event.target.value);return;}
 if(event.target.id==='page-query'){state.query=event.target.value;render({keepFocus:true});}
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='staff'){closeDetail(false);clearFilters();state.staffId=el.value;state.scope=null;state.classId=null;state.page='home';history.replaceState(null,'',routeHash('home'));render({top:true});byId('staff')?.focus({preventScroll:true});}
 if(el.id==='scope'){state.scope=el.value;clearFilters();render({top:true});byId('scope')?.focus({preventScroll:true});}
 if(el.id==='quick-class'){if(el.value)openClass(el.value);else navigate('classes');}
 if(el.id==='flag-filter'){state.flag=el.value;render({keepFocus:true});}
 if(el.id==='below-filter'){state.below=el.checked;render({keepFocus:true});}
 if(el.id==='case-filter'){state.caseFilter=el.value;render({keepFocus:true});}
 if(el.id==='notice-filter'){state.noticeFilter=el.value;render({keepFocus:true});}
 if(el.id==='deadline-filter'){state.deadlineFilter=el.value;render({keepFocus:true});}
});
document.addEventListener('submit',event=>{
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
    closeDetail();notify('Record archived. Active views and reminders updated.');return;
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
   if(detailStack.length)detailBack();else closeDetail();
  }catch(error){const node=byId('form-error');if(node){node.hidden=false;node.textContent=String(error.message||error);}else notify(String(error.message||error));}
  return;
 }
 if(event.target.id!=='prediction-form')return;
 event.preventDefault();
 try{
  if(detail?.kind!=='prediction')throw Error('No prediction selected');
  const value=byId('prediction').value;
  store.setPrediction(state.staffId,detail.id,value||null);
  if(detailStack.length)detailBack();else closeDetail();
  notify('Predicted grade saved. All relevant views are updated.');
 }catch(error){const node=byId('form-error');if(node){node.hidden=false;node.textContent=String(error.message||error);}else notify(String(error.message||error));}
});
document.addEventListener('keydown',event=>{
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
searchDialog.addEventListener('cancel',event=>{event.preventDefault();closeSearch();});
detailDialog.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
for(const d of [searchDialog,detailDialog])d.addEventListener('click',event=>{if(event.target===d){const rect=d.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)d===detailDialog?closeDetail():closeSearch();}});
window.addEventListener('popstate',()=>{const route=parseRoute(location.hash);closeDetail(false);clearFilters();Object.assign(state,route);if(route.classId&&!w.scopedClassIds.has(route.classId)&&w.accessibleClassIds.has(route.classId))state.scope='accessible';render({top:true});});
boot();
