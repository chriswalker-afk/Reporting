// Only explicitly marked secondary information participates in these disclosures.
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function disclosure(id,label,body,{defaultOpen='standard',note='',kind='secondary'}={}){
 return '<details class="workspace-disclosure disclosure-'+e(kind)+'" data-workspace-disclosure="'+e(id)+'" data-disclosure-default="'+e(defaultOpen)+'"'+(defaultOpen==='standard'||defaultOpen==='always'?' open':'')+'><summary><span class="disclosure-label">'+e(label)+'</span>'+(note?'<span class="disclosure-note">'+e(note)+'</span>':'')+'</summary><div class="disclosure-body">'+body+'</div></details>';
}
export const activeFilterCount=(...pairs)=>pairs.filter(([value,defaultValue='all'])=>value!==undefined&&value!==null&&value!==''&&value!==defaultValue).length;
export const filterLabel=count=>'Filters'+(count?' ('+count+' active)':'');
export function defaultDisclosureOpen(mode,density){return mode==='always'||mode==='standard'&&density!=='compact';}
export function createWorkspaceDisclosures({root,getContext,getDensity}){
 const overrides=new Map();
 const key=node=>JSON.stringify([...getContext(),node.dataset.workspaceDisclosure]);
 function sync(){
  for(const node of root.querySelectorAll('details[data-workspace-disclosure]')){
   const k=key(node),open=overrides.has(k)?overrides.get(k):defaultDisclosureOpen(node.dataset.disclosureDefault,getDensity());
   // A resize must not hide the control currently being used.
   if(!open&&node.open&&node.querySelector('.disclosure-body')?.contains(root.ownerDocument.activeElement)){overrides.set(k,true);continue;}
   node.open=open;
  }
 }
 function click(event){
  const summary=event.target.closest?.('summary'),node=summary?.parentElement;
  if(!node?.matches('details[data-workspace-disclosure]')||!root.contains(node))return false;
  event.preventDefault();const open=!node.open;overrides.set(key(node),open);node.open=open;return true;
 }
 function reset(){const staff=getContext()[0];for(const k of overrides.keys())if(JSON.parse(k)[0]===staff)overrides.delete(k);sync();}
 return {sync,click,reset};
}
