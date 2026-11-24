const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const panelKey=(kind,title)=>kind+':'+title;
export function expandButton(kind,title){
 return '<button type="button" class="btn panel-expand" data-action="expand-panel" data-id="'+e(panelKey(kind,title))+'" aria-label="'+e('Expand '+title)+'" aria-expanded="false">Expand</button>';
}
export function panelAttributes(kind,title){return ' data-expandable-panel="'+e(panelKey(kind,title))+'" data-panel-title="'+e(title)+'"';}
export const nextExpandedPanel=(current,requested)=>current===requested?'':requested;
export function createExpandablePanels({root,getContext}){
 const choices=new Map();
 const context=()=>JSON.stringify(getContext());
 const panels=()=>[...root.querySelectorAll('[data-expandable-panel]')];
 function sync(){
  const key=context(),selected=choices.get(key)??'';
  for(const panel of panels()){
   const open=panel.dataset.expandablePanel===selected,button=panel.querySelector('[data-action="expand-panel"]');
   panel.dataset.panelExpanded=String(open);
   if(button){button.textContent=open?'Restore':'Expand';button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',(open?'Restore ':'Expand ')+panel.dataset.panelTitle);}
  }
 }
 function toggle(button){
  if(!root.contains(button))return false;
  const panel=button.closest('[data-expandable-panel]');
  if(!panel||panel.dataset.expandablePanel!==button.dataset.id)return false;
  const key=context();choices.set(key,nextExpandedPanel(choices.get(key)??'',button.dataset.id));sync();
  button.focus({preventScroll:true});
  // Keep the selected panel heading reachable without changing its content.
  if(panel.dataset.panelExpanded==='true')panel.scrollIntoView({block:'nearest',inline:'nearest'});
  return true;
 }
 function collapse(){
  const panel=panels().find(p=>p.dataset.panelExpanded==='true');
  if(!panel)return false;
  choices.delete(context());sync();panel.querySelector('[data-action="expand-panel"]')?.focus({preventScroll:true});return true;
 }
 function reset(){choices.clear();sync();}
 return {sync,toggle,collapse,reset};
}

// The same modal, forms and mark inputs remain mounted. Browser-managed
// modal focus, back navigation, validation and unsaved guards remain in charge.
export function createDrawerDisplay(dialog){
 let expanded=false;
 function sync(){
  dialog.dataset.drawerExpanded=String(expanded);
  const button=dialog.querySelector('[data-action="drawer-expand"]');
  if(button){button.textContent=expanded?'Restore':'Full screen';button.setAttribute('aria-pressed',String(expanded));button.setAttribute('aria-label',expanded?'Restore detail drawer':'Expand detail drawer to full screen');}
 }
 function toggle(){
  if(!dialog.open)return false;
  const body=dialog.querySelector('.drawer-body'),scroll=body?.scrollTop??0;
  const regions=[...dialog.querySelectorAll('.table-scroll,.entry-table')].map(node=>({node,top:node.scrollTop,left:node.scrollLeft}));
  expanded=!expanded;sync();
  if(body)body.scrollTop=scroll;
  for(const {node,top,left} of regions){node.scrollTop=top;node.scrollLeft=left;}
  dialog.querySelector('[data-action="drawer-expand"]')?.focus({preventScroll:true});
  return true;
 }
 function restore(){if(!expanded)return false;return toggle();}
 function reset(){expanded=false;sync();}
 return {sync,toggle,restore,reset,isExpanded:()=>expanded};
}
