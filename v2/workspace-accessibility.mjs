// Native closed details can retain client rectangles in Chromium. Do not
// mistake those rectangles for visible/focusable content.
export function isPresented(node,{allowClosedDetails=false}={}){
 if(!node?.isConnected||!node.getClientRects().length)return false;
 for(let n=node;n&&n.nodeType===1;n=n.parentElement){
  if(n.hidden||n.inert||n.getAttribute('aria-hidden')==='true')return false;
  if(n!==node&&n.tagName==='DETAILS'&&!n.open&&!allowClosedDetails){
   const summary=[...n.children].find(c=>c.tagName==='SUMMARY');
   if(!summary?.contains(node))return false;
  }
  const style=n.ownerDocument.defaultView.getComputedStyle(n);
  if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;
 }
 return true;
}
export function focusRecord(node){
 return node?{element:node,id:node.id,action:node.dataset?.action,record:node.dataset?.id}:null;
}
export function restoreRecordFocus(root,token,fallback){
 if(!token)return false;
 const candidates=[];
 if(token.element&&root.contains(token.element))candidates.push(token.element);
 if(token.id){const node=root.querySelector('#'+CSS.escape(token.id));if(node)candidates.push(node);}
 if(token.action)candidates.push(...root.querySelectorAll('[data-action="'+CSS.escape(token.action)+'"]'+(token.record!==undefined?'[data-id="'+CSS.escape(token.record)+'"]':'')));
 let node=candidates.find(n=>!n.disabled&&isPresented(n));
 // A record may be inside a collapsed card on the newly selected layout.
 if(!node)node=candidates.find(n=>!n.disabled&&isPresented(n,{allowClosedDetails:true}));
 if(node){
  for(let parent=node.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
  node.focus({preventScroll:true});
  if(node.ownerDocument.activeElement===node)return true;
 }
 if(fallback&&isPresented(fallback)){fallback.focus({preventScroll:true});return true;}
 return false;
}
export function nameScrollRegions(root){
 for(const node of root.querySelectorAll('.table-scroll,.profile-tabs,.tabs,.entry-table')){
  if(!node.hasAttribute('tabindex'))node.tabIndex=0;
  if(!node.hasAttribute('role'))node.setAttribute('role','region');
  if(!node.hasAttribute('aria-label')&&!node.hasAttribute('aria-labelledby')){
   const section=node.closest('section,.drawer-body'),heading=section?.querySelector('h2,h3');
   node.setAttribute('aria-label',node.matches('.tabs,.profile-tabs')?'Available views':heading?.textContent.trim()||'Scrollable records');
  }
 }
}
