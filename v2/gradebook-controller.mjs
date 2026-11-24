import {entryKey,canEnter,canEditStructured,entryValue,gradebookColumns,draftFromResult,draftValue,editDraftItem,editDraftStatus,decodeDraft,isChanged,structuredPreview,liveSummary,blockEntries,selectionBounds} from './gradebook-entry.mjs';
import {nextMarkCell} from './assessment-refinement.mjs';
import {pct} from './workspace.mjs';

export function createGradebookController({root,getWorkspace,getStore,getStaff,notify}){
 let context=null,layout=null,book=null,overview=null,columns=[],records=new Map(),revision=null,edits=new Map(),anchor=null,end=null,saving=false;
 const surface=()=>root.querySelector('#gradebook-surface');
 const cells=()=>[...root.querySelectorAll('.gradebook-cell')];
 const at=(row,col)=>root.querySelector('.gradebook-cell[data-row="'+row+'"][data-col="'+col+'"]');
 const point=el=>({row:Number(el.dataset.row),col:Number(el.dataset.col)});
 const keyOf=el=>entryKey(el.dataset.assessment,el.dataset.enrolment);
 const error=message=>{const node=root.querySelector('#gradebook-error');if(node){node.hidden=!message;node.textContent=message||'';}if(message)notify(message);};
 const dirty=()=>edits.size>0;
 function guard(){
  if(!dirty())return true;
  error('Save or discard gradebook changes before leaving this view.');return false;
 }
 function reset(){edits.clear();anchor=end=null;context=layout=null;overview=book=null;columns=[];records.clear();revision=null;}
 function mount(){
  const node=surface();
  if(!node){if(!dirty())reset();return;}
  const w=getWorkspace(),key=JSON.stringify([getStaff(),w.scope,node.dataset.classId,node.dataset.unitId]);
  if(context!==key){if(dirty()){error('Unsaved changes belong to a different gradebook. Return to that view.');return;}context=key;anchor=end=null;revision=getStore().revision();}
  if(!dirty())revision=getStore().revision();
  book=w.markbook(node.dataset.classId);overview=book.overview(node.dataset.unitId);
  columns=gradebookColumns(overview,JSON.parse(node.dataset.expanded??'[]'));
  const nextLayout=JSON.stringify(columns.map(c=>[c.assessment.id,c.item?.id??null]));
  if(layout!==nextLayout){anchor=end=null;layout=nextLayout;}
  records=new Map();
  for(const p of overview.rows)for(const a of overview.assessments)records.set(entryKey(a.id,p.enrolmentId),{a,r:p.results[a.id]});
  syncValues();refresh();
 }
 function syncValues(skip=null){
  for(const el of cells()){
   if(el===skip)continue;
   const key=keyOf(el),{a,r}=records.get(key),change=edits.get(key);
   el.value=change?draftValue(a,change.draft,el.dataset.item):entryValue(a,r,el.dataset.item);
  }
  for(const el of root.querySelectorAll('.gradebook-result-status')){
   const key=keyOf(el);el.value=edits.get(key)?.draft.status??records.get(key).r.entryStatus;
  }
 }
 function setDraft(key,draft){
  const {a,r}=records.get(key),decoded=decodeDraft(a,r,draft);
  if(decoded.entry&&!isChanged(decoded.entry,r))edits.delete(key);
  else edits.set(key,{draft,...decoded});
 }
 function setEntry(el,raw){
  const key=keyOf(el),{a,r}=records.get(key),itemId=el.dataset.item;
  if(!canEnter(a,r,itemId))throw Error('This mark is read-only');
  // Do not turn a present-but-empty untouched result into Missing.
  if(!edits.has(key)&&raw===entryValue(a,r,itemId))return;
  setDraft(key,editDraftItem(a,edits.get(key)?.draft??draftFromResult(a,r),itemId,raw));
 }
 function refresh(){
  if(!overview||!surface())return;
  const coverage=new Map(overview.assessments.map(a=>[a.id,0])),byAssessment=new Map();
  columns.forEach((c,j)=>{if(!byAssessment.has(c.assessment.id))byAssessment.set(c.assessment.id,[]);byAssessment.get(c.assessment.id).push({c,j});});
  const tableCells=new Map([...root.querySelectorAll('td[data-gradebook-row][data-gradebook-col]')].map(td=>[td.dataset.gradebookRow+':'+td.dataset.gradebookCol,td]));
  for(const [i,p] of overview.rows.entries()){
   const previews=new Map();let invalid=false;
   for(const a of overview.assessments){
    const r=p.results[a.id],change=edits.get(entryKey(a.id,p.enrolmentId)),bad=Boolean(change&&!change.entry);
    const preview=structuredPreview(a,r,change?.entry??null);
    if(bad){invalid=true;}
    else if(change?.entry)previews.set(a.id,preview);
    if(!bad&&preview.state==='scored')coverage.set(a.id,coverage.get(a.id)+1);
    for(const {c,j} of byAssessment.get(a.id)??[]){
     const td=tableCells.get(i+':'+j);if(!td)continue;
     const el=td.querySelector('.gradebook-cell');
     td.classList.toggle('gradebook-changed',Boolean(change));
     if(el){
      const message=change?.errors[c.item.id];
      if(message){el.setAttribute('aria-invalid','true');el.title=message;}else{el.removeAttribute('aria-invalid');el.removeAttribute('title');}
      const label=td.querySelector('[data-entry-preview]');
      if(c.kind==='item')label.textContent=message?'Invalid mark':preview.status==='absent'?'Absent':'';
      else label.textContent=bad?'Invalid mark':preview.state==='scored'?pct(preview.percent)+' · '+preview.grade:preview.state==='absent'?'Absent':preview.state==='incomplete'?'Incomplete':'—';
     }
     const value=td.querySelector('[data-result-value]'),meta=td.querySelector('[data-result-meta]');
     if(value&&meta){
      value.textContent=bad?'—':preview.total!==null?preview.total+'/'+preview.maxMarks:preview.entered?preview.partial+'/'+preview.maxMarks:'—';
      meta.textContent=bad?'Invalid marks · expand to fix':preview.state==='scored'?pct(preview.percent)+' · '+preview.grade:preview.state==='incomplete'?preview.entered+'/'+a.items.length+' entered · Incomplete':preview.state==='excluded'?'Excluded · marks retained':preview.state==='absent'?'Absent':'Missing';
      if(change)meta.textContent+=' · Unsaved';
      const button=value.closest('.tracker-cell');
      if(button){for(const name of ['scored','missing','incomplete','absent','excluded','invalid'])button.classList.remove('tracker-'+name);button.classList.add('tracker-'+(bad?'invalid':preview.state));}
     }
    }
   }
   const output=root.querySelector('[data-gradebook-summary="'+i+'"]');
   if(output){const summary=liveSummary(p.summary,previews,{bands:book.defaultBands});output.querySelector('strong').textContent=invalid?'—':pct(summary.average);
    output.querySelector('.cell-sub').textContent=invalid?'Fix invalid marks':(summary.grade??'—')+' · '+summary.scored+'/'+summary.eligible;}
  }
  for(const node of root.querySelectorAll('[data-gradebook-coverage]'))node.textContent=coverage.get(node.dataset.gradebookCoverage)+'/'+overview.rows.length+' scored';
  const invalid=[...edits.values()].filter(c=>!c.entry).length,status=root.querySelector('#gradebook-save-status');
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
  const current=document.activeElement?.matches?.('.gradebook-cell')?point(document.activeElement):next;
  const start=extend?(anchor??current):next;
  anchor=start;end=next;el.focus();if(select)el.select();paintSelection();return true;
 }
 function onFocus(el){if(!el.matches?.('.gradebook-cell'))return;const p=point(el);if(end?.row===p.row&&end?.col===p.col)return;anchor=end=p;paintSelection();}
 function pointer(event){
  const el=event.target.closest?.('.gradebook-cell');if(!el||!event.shiftKey)return;
  event.preventDefault();focus(el,{extend:true});
 }
 function onInput(el){
  if(!el.matches?.('.gradebook-cell')||!overview)return false;
  try{setEntry(el,el.value);syncValues(el);error('');refresh();}catch(e){error(e.message);}
  return true;
 }
 function onChange(el){
  if(!el.matches?.('.gradebook-result-status')||!overview)return false;
  try{
   const key=keyOf(el),{a,r}=records.get(key);
   if(!canEditStructured(a,r))throw Error('This result is read-only');
   setDraft(key,editDraftStatus(a,edits.get(key)?.draft??draftFromResult(a,r),el.value));
   syncValues();error('');refresh();
  }catch(e){error(e.message);}return true;
 }
 function paste(event){
  if(!event.target.matches?.('.gradebook-cell')||!overview)return false;
  const text=event.clipboardData?.getData('text/plain')??'';
  if(!/[\t\r\n]/.test(text))return false;
  event.preventDefault();
  try{
   const {row,col}=point(event.target),changes=blockEntries(overview,row,col,text,columns);
   for(const c of changes){const el=at(c.row,c.col);if(!el)throw Error('The pasted block is no longer editable');}
   for(const c of changes)setEntry(at(c.row,c.col),c.raw);
   syncValues();error('');refresh();notify(changes.length+' cells pasted. Review and save.');
  }catch(e){error(e.message);}return true;
 }
 function save(){
  if(!dirty()||saving)return;
  try{
   const pending=[...edits.values()];
   if(pending.some(c=>!c.entry))throw Error('Correct invalid marks before saving');
   const clearing=[...edits.entries()].filter(([key,c])=>{const {r}=records.get(key);return Object.keys(r.marks).some(id=>!Object.hasOwn(c.entry.marks,id));}).length;
   if(clearing&&!window.confirm('Clear previously recorded marks from '+clearing+' result(s)?'))return;
   const active=document.activeElement,activePoint=active?.matches?.('.gradebook-cell')?point(active):end;
   const count=pending.length,expectedRevision=revision,backup=new Map(edits);
   saving=true;edits.clear();
   try{getStore().saveGradebookBatch(getStaff(),book.classId,pending.map(c=>c.entry),{confirmed:true,confirmClear:true,expectedRevision});}
   catch(e){edits=backup;syncValues();refresh();throw e;}
   revision=getStore().revision();error('');refresh();
   if(activePoint)focus(at(activePoint.row,activePoint.col));notify(count+' result'+(count===1?'':'s')+' saved across the gradebook.');
  }catch(e){error(e.message);}finally{saving=false;}
 }
 function discard(){
  if(!dirty()||!window.confirm('Discard unsaved gradebook changes?'))return;
  edits.clear();revision=getStore().revision();syncValues();error('');refresh();
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
  event.preventDefault();if(next){if(event.shiftKey&&key.startsWith('Arrow')&&(!anchor||!end||end.row!==point(el).row||end.col!==point(el).col))anchor=end=point(el);focus(next.input,{extend:event.shiftKey&&key.startsWith('Arrow')});}return true;
 }
 return {mount,isDirty:dirty,guard,onInput,onChange,onFocus,pointer,paste,keyboard,save,discard};
}
