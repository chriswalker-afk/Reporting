import {entryKey,canEnter,entryValue,decodeEntry,isChanged,entryPreview,liveSummary,blockEntries,selectionBounds} from './gradebook-entry.mjs';
import {nextMarkCell} from './assessment-refinement.mjs';
import {pct} from './workspace.mjs';

export function createGradebookController({root,getWorkspace,getStore,getStaff,notify}){
 let context=null,book=null,overview=null,revision=null,edits=new Map(),anchor=null,end=null,saving=false;
 const surface=()=>root.querySelector('#gradebook-surface');
 const cells=()=>[...root.querySelectorAll('.gradebook-cell')];
 const at=(row,col)=>root.querySelector('.gradebook-cell[data-row="'+row+'"][data-col="'+col+'"]');
 const point=el=>({row:Number(el.dataset.row),col:Number(el.dataset.col)});
 const keyOf=el=>entryKey(el.dataset.assessment,el.dataset.enrolment);
 const getRecord=(row,col)=>{const a=overview.assessments[col],p=overview.rows[row];return {a,p,r:p.results[a.id]};};
 const error=message=>{const node=root.querySelector('#gradebook-error');if(node){node.hidden=!message;node.textContent=message||'';}if(message)notify(message);};
 function dirty(){return edits.size>0;}
 function guard(){
  if(!dirty())return true;
  error('Save or discard gradebook changes before leaving this view.');return false;
 }
 function reset(){edits.clear();anchor=end=null;context=null;overview=null;book=null;revision=null;}
 function mount(){
  const node=surface();
  if(!node){if(!dirty())reset();return;}
  const w=getWorkspace(),key=JSON.stringify([getStaff(),w.scope,node.dataset.classId,node.dataset.unitId]);
  if(context!==key){if(dirty()){error('Unsaved changes belong to a different gradebook. Return to that view.');return;}context=key;anchor=end=null;revision=getStore().revision();}
  if(!dirty())revision=getStore().revision();
  book=w.markbook(node.dataset.classId);overview=book.overview(node.dataset.unitId);
  for(const el of cells()){const change=edits.get(keyOf(el));if(change)el.value=change.raw;}
  refresh();
 }
 function setEntry(el,raw){
  const {row,col}=point(el),{a,r}=getRecord(row,col),key=keyOf(el);
  let entry=null,message='';
  try{entry=decodeEntry(a,r,raw);}catch(e){message=e.message;}
  el.value=raw;
  if(raw===entryValue(a,r)||entry&&!isChanged(entry,r))edits.delete(key);
  else edits.set(key,{row,col,raw,entry,message});
 }
 function refresh(){
  if(!overview||!surface())return;
  const coverage=overview.assessments.map(()=>0);
  for(const [i,p] of overview.rows.entries()){
   const previews=new Map();let invalid=false;
   for(const [j,a] of overview.assessments.entries()){
    const r=p.results[a.id],change=edits.get(entryKey(a.id,p.enrolmentId)),el=at(i,j);
    let scored=r.status==='scored';
    if(el){
     const td=el.closest('td'),label=td.querySelector('[data-entry-preview]');
     td.classList.toggle('gradebook-changed',Boolean(change));
     el.toggleAttribute('aria-invalid',Boolean(change?.message));
     if(change?.message){label.textContent='Invalid mark';invalid=true;scored=false;}
     else if(change?.entry){
      const preview=entryPreview(a,r,change.entry);previews.set(a.id,preview);
      scored=preview.state==='scored';
      label.textContent=scored?pct(preview.percent)+' · '+preview.grade:preview.state==='absent'?'Absent':'—';
     }else label.textContent=r.status==='scored'?pct(r.percent)+' · '+r.grade:r.status==='absent'?'Absent':r.status==='incomplete'?'Incomplete':'—';
    }
    if(scored)coverage[j]++;
   }
   const output=root.querySelector('[data-gradebook-summary="'+i+'"]');
   if(output){const summary=liveSummary(p.summary,previews,{bands:book.defaultBands});output.querySelector('strong').textContent=invalid?'—':pct(summary.average);
    output.querySelector('.cell-sub').textContent=invalid?'Fix invalid marks':(summary.grade??'—')+' · '+summary.scored+'/'+summary.eligible;}
  }
  overview.assessments.forEach((a,i)=>{const node=[...root.querySelectorAll('[data-gradebook-coverage]')].find(n=>n.dataset.gradebookCoverage===a.id);if(node)node.textContent=coverage[i]+'/'+overview.rows.length+' scored';});
  const invalid=[...edits.values()].filter(c=>c.message).length,status=root.querySelector('#gradebook-save-status');
  if(status)status.textContent=dirty()?edits.size+' unsaved result'+(edits.size===1?'':'s')+(invalid?' · '+invalid+' invalid':''):'All changes saved';
  const save=root.querySelector('[data-action="gradebook-save"]'),discard=root.querySelector('[data-action="gradebook-discard"]');
  if(save)save.disabled=!dirty()||invalid>0;if(discard)discard.disabled=!dirty();
  paintSelection();
 }
 function paintSelection(){
  const bounds=anchor&&end?selectionBounds(anchor,end):null;
  let count=0;
  for(const el of cells()){
   const {row,col}=point(el),selected=Boolean(bounds&&row>=bounds.top&&row<=bounds.bottom&&col>=bounds.left&&col<=bounds.right);
   el.closest('td').classList.toggle('gradebook-selected',selected);
   if(selected)count++;
  }
  const label=root.querySelector('#gradebook-selection');
  if(label)label.textContent=count>1?count+' editable cells selected':count===1?'1 cell selected':'Select a mark cell';
 }
 function focus(el,{extend=false,select=true}={}){
  if(!el)return false;
  const next=point(el);
  // focusin runs synchronously, so set the desired range after focus.
  const start=extend?(anchor??next):next;el.focus();if(select)el.select();anchor=start;end=next;paintSelection();return true;
 }
 function onFocus(el){if(!el.matches?.('.gradebook-cell'))return;anchor=end=point(el);paintSelection();}
 function pointer(event){
  const el=event.target.closest?.('.gradebook-cell');if(!el||!event.shiftKey)return;
  event.preventDefault();focus(el,{extend:true});
 }
 function onInput(el){
  if(!el.matches?.('.gradebook-cell')||!overview)return false;
  setEntry(el,el.value);error('');refresh();return true;
 }
 function paste(event){
  if(!event.target.matches?.('.gradebook-cell')||!overview)return false;
  const text=event.clipboardData?.getData('text/plain')??'';
  if(!/[\t\r\n]/.test(text))return false;
  event.preventDefault();
  try{
   const {row,col}=point(event.target),changes=blockEntries(overview,row,col,text);
   for(const c of changes){const el=at(c.row,c.col);if(!el)throw Error('The pasted block is no longer editable');}
   for(const c of changes)setEntry(at(c.row,c.col),c.raw);
   error('');refresh();notify(changes.length+' cells pasted. Review and save.');
  }catch(e){error(e.message);}return true;
 }
 function save(){
  if(!dirty()||saving)return;
  try{
   const pending=[...edits.values()];
   if(pending.some(c=>c.message))throw Error('Correct invalid marks before saving');
   const clearing=pending.filter(c=>{const {r}=getRecord(c.row,c.col);return Object.keys(r.marks).some(id=>!Object.hasOwn(c.entry.marks,id));}).length;
   if(clearing&&!window.confirm('Clear previously recorded marks from '+clearing+' result(s)?'))return;
   const active=document.activeElement,activePoint=active?.matches?.('.gradebook-cell')?point(active):end;
   const count=pending.length,expectedRevision=revision,backup=new Map(edits);
   saving=true;edits.clear();
   try{getStore().saveGradebookBatch(getStaff(),book.classId,pending.map(c=>c.entry),{confirmed:true,confirmClear:true,expectedRevision});}
   catch(e){edits=backup;refresh();throw e;}
   revision=getStore().revision();error('');refresh();
   if(activePoint)focus(at(activePoint.row,activePoint.col));notify(count+' result'+(count===1?'':'s')+' saved across the gradebook.');
  }catch(e){error(e.message);}finally{saving=false;}
 }
 function discard(){
  if(!dirty()||!window.confirm('Discard unsaved gradebook changes?'))return;
  edits.clear();revision=getStore().revision();
  for(const el of cells()){const {row,col}=point(el),{a,r}=getRecord(row,col);el.value=entryValue(a,r);}
  error('');refresh();
 }
 function keyboard(event){
  if(!surface()||document.querySelector('dialog[open]'))return false;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&dirty()){event.preventDefault();save();return true;}
  const el=event.target;if(!el.matches?.('.gradebook-cell')||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return false;
  const key=event.key;
  if(!event.shiftKey&&key==='ArrowLeft'&&(el.selectionStart!==el.selectionEnd||el.selectionStart!==0)&&!(el.selectionStart===0&&el.selectionEnd===el.value.length))return false;
  if(!event.shiftKey&&key==='ArrowRight'&&(el.selectionStart!==el.selectionEnd||el.selectionEnd!==el.value.length)&&!(el.selectionStart===0&&el.selectionEnd===el.value.length))return false;
  const available=cells().map(input=>({...point(input),input}));
  const next=nextMarkCell(available,point(el),key,event.shiftKey);
  if(!next&&key!=='Enter')return false;
  event.preventDefault();if(next)focus(next.input,{extend:event.shiftKey&&key.startsWith('Arrow')});return true;
 }
 return {mount,isDirty:dirty,guard,onInput,onFocus,pointer,paste,keyboard,save,discard};
}
