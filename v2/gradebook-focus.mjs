export const FOCUS_PANELS=['assessment','layout','tools','help'];
export const focusContext=({staffId,scope,page,classId,classTab})=>page==='classes'&&classId&&classTab==='markbook'?JSON.stringify([staffId,scope,classId]):null;
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
  // The same exclusive tools panels drive the normal and full-screen views.
  // Open their inner disclosures only while the corresponding panel is shown.
  {const help=node.querySelector('[data-workspace-disclosure="gradebook-help"]');if(help)help.open=panel==='help';const tools=node.querySelector('[data-workspace-disclosure="single-tools"]');if(tools)tools.open=panel==='tools';}
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
 function keyboard(event){
  if((!active&&!panel)||event.key!=='Escape'||event.defaultPrevented||app.ownerDocument.querySelector('dialog[open]'))return false;
  event.preventDefault();
  if(panel)togglePanel(panel);else setActive(false);
  return true;
 }
 return {sync,toggle:()=>setActive(!active),togglePanel,keyboard,isActive:()=>active};
}
