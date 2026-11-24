export const FOCUS_PANELS=['assessment','layout','tools','help'];
export const focusContext=({staffId,scope,page,classId,classTab})=>page==='classes'&&classId&&classTab==='markbook'?JSON.stringify([staffId,scope,classId]):null;
export const FOCUS_PANEL_TITLES={assessment:'Manage assessments',layout:'Organise columns',tools:'Mark entry tools & import/export',help:'Mark entry help'};
export const nextFocusPanel=(current,requested)=>FOCUS_PANELS.includes(requested)&&current!==requested?requested:'';

// App-level focus, not the browser Fullscreen API. Never reparent, replace,
// remount or mutate the spreadsheet or its entry controller.
export function createGradebookFocus({app,root,getContext,restoreDisclosures}){
 let active=false,context=null,panel='',outerScroll=0;
 const surface=()=>root.querySelector('#gradebook-surface');
 const table=()=>surface()?.querySelector('.gradebook-scroll');
 const toggle=()=>surface()?.querySelector('[data-action="gradebook-focus-toggle"]');
 const panelButton=id=>surface()?.querySelector('[data-action="gradebook-focus-panel"][data-id="'+id+'"]');
 const scrollPosition=()=>{const t=table();return t?{node:t,top:t.scrollTop,left:t.scrollLeft}:null;};
 function restoreScroll(position){
  if(position?.node===table()&&position.node){position.node.scrollTop=position.top;position.node.scrollLeft=position.left;}
 }
 function fitPanel(){
  const node=surface(),flyout=node?.querySelector('.gradebook-toolbar-flyout');
  if(!flyout||flyout.hidden)return;
  // Bound the floating panel to the visible workspace where possible. On
  // very short screens the outer workspace can still scroll to reach it.
  const top=flyout.getBoundingClientRect().top,bounds=root.getBoundingClientRect();
  const footer=node.querySelector('.gradebook-save-bar')?.getBoundingClientRect().top;
  const end=Number.isFinite(footer)&&footer-top>=112?Math.min(bounds.bottom,footer):bounds.bottom;
  const scale=Number(root.dataset.pageZoom||100)/100;
  flyout.style.setProperty('--gradebook-flyout-room',Math.max(100,(end-top-6)/scale)+'px');
 }
 function syncHeaders(){
  const node=surface(),t=table();if(!node||!t)return;
  const expanded=node.dataset.headerDetails==='true';
  for(const detail of node.querySelectorAll('[data-assessment-header-detail]'))detail.hidden=!expanded;
  const button=node.querySelector('[data-action="gradebook-header-toggle"]');
  if(button){
   button.setAttribute('aria-expanded',String(expanded));
   button.title=(expanded?'Collapse':'Expand')+' assessment header details';
   button.querySelector('[data-header-toggle-label]').textContent=expanded?'Hide details':'Show details';
  }
  const head=t.querySelector('thead');
  if(head)t.style.scrollPaddingTop=(head.offsetHeight+4)+'px';
 }
 function setHeaderDetails(expanded){
  const node=surface();if(!node||!node.querySelector('[data-action="gradebook-header-toggle"]'))return false;
  const pos=scrollPosition();
  node.dataset.headerDetails=String(Boolean(expanded));syncHeaders();restoreScroll(pos);
  return true;
 }
 function sync(){
  const current=getContext(),node=surface();
  if(!node||!current||current!==context){active=false;panel='';context=current;outerScroll=0;}
  if(panel&&!panelButton(panel))panel='';
  app.dataset.gradebookFocus=String(active);
  app.dataset.gradebookFocusPanel=panel;
  if(!node)return;
  const control=toggle();
  if(control){control.textContent=active?'Exit focus':'Full screen';control.setAttribute('aria-pressed',String(active));control.title=active?'Exit focus mode (Escape)':'Maximise the gradebook within the browser window';}
  for(const id of FOCUS_PANELS){const button=panelButton(id);if(button)button.setAttribute('aria-expanded',String(panel===id));}
  // Explicit visibility keeps secondary controls out of layout and the tab
  // order even if a cached stylesheet has not caught up with the markup.
  const flyout=node.querySelector('.gradebook-toolbar-flyout');
  if(flyout){
   flyout.hidden=!panel;
   flyout.querySelector('[data-gradebook-panel-title]').textContent=FOCUS_PANEL_TITLES[panel]??'Gradebook options';
   flyout.setAttribute('aria-label',FOCUS_PANEL_TITLES[panel]??'Gradebook options');
   for(const section of flyout.querySelectorAll('[data-gradebook-focus-section]'))section.hidden=section.dataset.gradebookFocusSection!==panel;
  }
  // The same exclusive tools panels drive the normal and full-screen views.
  // Open their inner disclosures only while the corresponding panel is shown.
  {const help=node.querySelector('[data-workspace-disclosure="gradebook-help"]');if(help)help.open=panel==='help';const tools=node.querySelector('[data-workspace-disclosure="single-tools"]');if(tools)tools.open=panel==='tools';}
  syncHeaders();fitPanel();
 }
 function setActive(value){
  if(!surface()||!getContext())return false;
  const pos=scrollPosition();
  if(value===active)return true;
  if(value){context=getContext();outerScroll=root.scrollTop;active=true;panel='';}
  else{active=false;panel='';restoreDisclosures();}
  sync();
  root.scrollTop=value?0:outerScroll;
  restoreScroll(pos);
  toggle()?.focus({preventScroll:true});
  return true;
 }
 function togglePanel(id){
  if(!surface()||!getContext()||!FOCUS_PANELS.includes(id)||!panelButton(id))return false;
  const pos=scrollPosition();panel=nextFocusPanel(panel,id);sync();restoreScroll(pos);panelButton(id)?.focus({preventScroll:true});return true;
 }
 function closePanel({restoreFocus=true}={}){
  if(!panel)return false;
  const previous=panel,pos=scrollPosition();panel='';sync();restoreScroll(pos);
  if(restoreFocus)panelButton(previous)?.focus({preventScroll:true});
  return true;
 }
 function outsidePointer(event){
  const node=surface(),top=node?.querySelector('.gradebook-focus-top');
  if(panel&&top&&!top.contains(event.target)&&!event.target.closest?.('dialog'))closePanel({restoreFocus:false});
 }
 function keyboard(event){
  if((!active&&!panel)||event.key!=='Escape'||event.defaultPrevented||app.ownerDocument.querySelector('dialog[open]'))return false;
  event.preventDefault();
  if(panel)closePanel();else setActive(false);
  return true;
 }
 return {sync,toggle:()=>setActive(!active),togglePanel,closePanel,outsidePointer,fitPanel,syncHeaders,setHeaderDetails,keyboard,isActive:()=>active};
}
