import {entryKey,canEnter,canEditStructured,entryValue,gradebookColumns,draftFromResult,draftValue,editDraftItem,editDraftStatus,decodeDraft,isChanged,structuredPreview,liveSummary,blockEntries,selectionBounds} from './gradebook-entry.mjs';
import {createEditHistory,selectedRectangle,copyRectangle,planRangeEdit,exportGradebook,planKeyedImport} from './gradebook-bulk.mjs';
import {projectGradebook,groupSummary,targetGap,markDisplay,itemDisplay} from './gradebook-layout.mjs';
import {nextMarkCell} from './assessment-refinement.mjs';
import {pct} from './workspace.mjs';

export function createGradebookController({root,getWorkspace,getStore,getStaff,notify}){
 let context=null,layout=null,book=null,overview=null,columns=[],projection=null,records=new Map(),revision=null,edits=new Map(),anchor=null,end=null,saving=false;
 const history=createEditHistory();let stagedImport=null;
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
 function reset(){edits.clear();history.reset();stagedImport=null;anchor=end=null;context=layout=null;overview=book=projection=null;columns=[];records.clear();revision=null;}
 function mount(){
  const node=surface();
  if(!node){if(!dirty())reset();return;}
  stagedImport=null;
  const w=getWorkspace(),key=JSON.stringify([getStaff(),w.scope,node.dataset.classId,node.dataset.unitId]);
  if(context!==key){if(dirty()){error('Unsaved changes belong to a different gradebook. Return to that view.');return;}context=key;anchor=end=null;history.reset();revision=getStore().revision();}
  if(!dirty())revision=getStore().revision();
  book=w.markbook(node.dataset.classId);overview=book.overview(node.dataset.unitId);
  projection=projectGradebook(overview,book.units,JSON.parse(node.dataset.layout??'{}'),JSON.parse(node.dataset.expanded??'[]'),w.asOf,node.dataset.entryView==='single'?{assessmentId:node.dataset.entryAssessment,itemId:node.dataset.entryItem}:null);
  columns=projection.columns;
  const nextLayout=JSON.stringify([projection.layout.display,columns.map(c=>c.kind==='group'?['group',c.group.id]:[c.assessment.id,c.item?.id??null])]);
  if(layout!==nextLayout){anchor=end=null;layout=nextLayout;}
  records=new Map();
  for(const p of overview.rows)for(const a of overview.assessments)records.set(entryKey(a.id,p.enrolmentId),{a,r:p.results[a.id]});
  syncValues();refresh();invalidateImport();
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
  columns.forEach((c,j)=>{if(c.kind==='group')return;if(!byAssessment.has(c.assessment.id))byAssessment.set(c.assessment.id,[]);byAssessment.get(c.assessment.id).push({c,j});});
  const tableCells=new Map([...root.querySelectorAll('td[data-gradebook-row][data-gradebook-col]')].map(td=>[td.dataset.gradebookRow+':'+td.dataset.gradebookCol,td]));
  const groupCells=new Map([...root.querySelectorAll('[data-gradebook-group]')].map(td=>[td.dataset.gradebookPupilIndex+':'+td.dataset.gradebookGroup,td]));
  for(const [i,p] of overview.rows.entries()){
   const previews=new Map(),invalidIds=new Set();let invalid=false;
   for(const a of overview.assessments){
    const r=p.results[a.id],change=edits.get(entryKey(a.id,p.enrolmentId)),bad=Boolean(change&&!change.entry);
    const preview=structuredPreview(a,r,change?.entry??null);
    if(bad){invalid=true;invalidIds.add(a.id);}
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
     const itemValue=td.querySelector('[data-item-display]'),itemMeta=td.querySelector('[data-item-meta]');
     if(itemValue&&itemMeta){const marks=change?.entry?.marks??r.marks;itemValue.textContent=bad?'—':itemDisplay(marks[c.item.id],c.item,projection.layout.display,pct);itemMeta.textContent=bad?'Invalid mark':preview.state==='excluded'?'Excluded':preview.status==='absent'?'Absent':change?'Unsaved':'';}
     const value=td.querySelector('[data-result-value]'),meta=td.querySelector('[data-result-meta]');
     if(value&&meta){
      value.textContent=bad?'—':markDisplay(preview,projection.layout.display,pct);
      meta.textContent=bad?'Invalid marks · expand to fix':preview.state==='scored'?pct(preview.percent)+' · '+preview.grade:preview.state==='incomplete'?preview.entered+'/'+a.items.length+' entered · Incomplete':preview.state==='excluded'?'Excluded · marks retained':preview.state==='absent'?'Absent':'Missing';
      if(change)meta.textContent+=' · Unsaved';
      const button=value.closest('.tracker-cell');
      if(button){for(const name of ['scored','missing','incomplete','absent','excluded','invalid'])button.classList.remove('tracker-'+name);button.classList.add('tracker-'+(bad?'invalid':preview.state));}
     }
    }
   }
   const scheme={bands:book.defaultBands},summary=liveSummary(p.summary,previews,scheme),output=root.querySelector('[data-gradebook-summary="'+i+'"]');
   if(output){output.querySelector('strong').textContent=invalid?'—':pct(summary.average);
    output.querySelector('.cell-sub').textContent=invalid?'Fix invalid marks':(summary.grade??'—')+' · '+summary.scored+'/'+summary.eligible;}
   const gap=root.querySelector('[data-gradebook-gap="'+i+'"]');if(gap)gap.textContent=invalid?'—':targetGap(p.summary,summary.grade,scheme);
   for(const g of projection.groups){const node=groupCells.get(i+':'+g.id);if(!node)continue;const gs=groupSummary(p.summary,g,previews,scheme),bad=g.all.some(id=>invalidIds.has(id));node.querySelector('strong').textContent=bad?'—':pct(gs.average);node.querySelector('.cell-sub').textContent=bad?'Fix invalid marks':(gs.grade??'—')+' · '+gs.scored+'/'+gs.eligible;}
  }
  for(const node of root.querySelectorAll('[data-gradebook-coverage]'))node.textContent=coverage.get(node.dataset.gradebookCoverage)+'/'+overview.rows.length+' scored';
  const invalid=[...edits.values()].filter(c=>!c.entry).length,status=root.querySelector('#gradebook-save-status');
  if(status)status.textContent=dirty()?edits.size+' unsaved result'+(edits.size===1?'':'s')+(invalid?' · '+invalid+' invalid':''):'All changes saved';
  const hidden=root.querySelector('[data-gradebook-hidden-edits]');if(hidden){const count=[...edits].filter(([key,change])=>{const record=records.get(key);if(!projection.shownIds.has(record?.a.id))return true;return Boolean(projection.single&&record?.a.items.some(i=>i.id!==projection.single.item?.id&&(change.draft.raw[i.id]!==String(record.r.marks[i.id]??'')||change.errors[i.id])));}).length;hidden.textContent=count?count+' unsaved result'+(count===1?'':'s')+(projection.single?' with changes outside this view — switch assessment or question, or return to spreadsheet':' in hidden assessments — Show all to review'):'';}
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
  let rectangle=null;try{if(overview)rectangle=selectedRectangle(overview,columns,anchor,end);}catch{}
  for(const [name,disabled] of [['copy',!rectangle],['clear',!rectangle],['fill',!rectangle||rectangle.length<2],['undo',!history.canUndo()],['redo',!history.canRedo()]]){const control=root.querySelector('[data-action="gradebook-'+name+'"]');if(control)control.disabled=disabled;}
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
  const el=event.target.closest?.('.gradebook-cell');if(!el)return;
  if(event.shiftKey){event.preventDefault();focus(el,{extend:true});}else{anchor=end=point(el);paintSelection();}
 }
 function onInput(el){
  if(el.id==='gradebook-import-text'){invalidateImport();return true;}
  if(!el.matches?.('.gradebook-cell')||!overview)return false;
  perform(()=>setEntry(el,el.value),el);return true;
 }
 function onChange(el){
  if(el.id==='gradebook-import-file'){loadImportFile(el);return true;}
  if(!el.matches?.('.gradebook-result-status')||!overview)return false;
  perform(()=>{
   const key=keyOf(el),{a,r}=records.get(key);
   if(!canEditStructured(a,r))throw Error('This result is read-only');
   setDraft(key,editDraftStatus(a,edits.get(key)?.draft??draftFromResult(a,r),el.value));
  });return true;
 }
 function paste(event){
  if(!event.target.matches?.('.gradebook-cell')||!overview)return false;
  const text=event.clipboardData?.getData('text/plain')??'';
  if(!event.clipboardData)return false;
  if(!text.trim()){event.preventDefault();return true;}
  event.preventDefault();
  try{
   const {row,col}=point(event.target),changes=blockEntries(overview,row,col,text,columns);
   for(const c of changes){const el=at(c.row,c.col);if(!el)throw Error('The pasted block is no longer editable');}
   if(perform(()=>{for(const c of changes)setEntry(at(c.row,c.col),c.raw);}))notify(changes.length+' cells pasted. Review and save.');
  }catch(e){error(e.message);}return true;
 }
 function invalidateImport(){
  stagedImport=null;
  const panel=root.querySelector('#gradebook-import-preview'),apply=root.querySelector('[data-action="gradebook-import-apply"]');
  if(panel)panel.replaceChildren();if(apply)apply.disabled=true;
 }
 function perform(fn,skip=null){
  const before=new Map(edits);
  try{fn();history.record(before,edits);invalidateImport();syncValues(skip);error('');refresh();return true;}
  catch(e){edits=before;syncValues();refresh();error(e.message);return false;}
 }
 function historyMove(direction){
  const snapshot=direction==='undo'?history.undo():history.redo();
  if(!snapshot)return;edits=snapshot;invalidateImport();syncValues();error('');refresh();
  notify(direction==='undo'?'Unsaved edit undone.':'Unsaved edit redone.');
 }
 const rectangle=()=>selectedRectangle(overview,columns,anchor,end);
 const rangeValue=({a,r,item})=>{const changed=edits.get(entryKey(a.id,r.enrolmentId));return changed?draftValue(a,changed.draft,item.id):entryValue(a,r,item.id);};
 function rangeEdit(operation){
  try{
   const planned=planRangeEdit(rectangle(),operation,rangeValue);
   for(const p of planned)if(!at(p.row,p.col))throw Error('Selection changed; select the marks again');
   if(perform(()=>{for(const p of planned)setEntry(at(p.row,p.col),p.raw);}))notify(planned.length+' cells '+(operation==='fill'?'filled down':'cleared')+'. Review and save.');
  }catch(e){error(e.message);}
 }
 function copy(event){
  if(!surface()||!event.target.matches?.('.gradebook-cell')||!event.clipboardData)return false;
  event.preventDefault();
  try{event.clipboardData.setData('text/plain',copyRectangle(rectangle(),rangeValue));notify('Selected marks copied.');}
  catch(e){error(e.message);}return true;
 }
 function copyFallback(value){
  const field=root.querySelector('#gradebook-copy-fallback');if(!field)return;
  field.hidden=false;field.value=value;field.focus();field.select();notify('Copy the selected text with Ctrl / Cmd+C.');
 }
 function copyButton(){
  try{
   const value=copyRectangle(rectangle(),rangeValue);
   const fallback=root.querySelector('#gradebook-copy-fallback');if(fallback)fallback.hidden=true;
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>notify('Selected marks copied.'),()=>copyFallback(value));
   else copyFallback(value);
  }catch(e){error(e.message);}
 }
 function downloadCSV(){
  if(!overview)return;
  const value=exportGradebook(overview),url=URL.createObjectURL(new Blob(['\uFEFF',value],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
  link.href=url;link.download='gradebook-'+book.classCode.replace(/[^a-z0-9_-]/gi,'-')+'.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  notify('Saved gradebook exported. Unsaved changes are not included.');
 }
 async function loadImportFile(el){
  invalidateImport();const file=el.files?.[0],node=surface();
  if(!file)return;
  try{if(file.size>500000)throw Error('Import must be under 500 KB');
   const text=await file.text();if(node!==surface()||!el.isConnected||el.files?.[0]!==file)return;
   root.querySelector('#gradebook-import-text').value=text;invalidateImport();notify('File loaded. Preview the import before applying.');
  }catch(e){error(e.message);}
 }
 function previewImport(){
  invalidateImport();error('');
  try{
   const text=root.querySelector('#gradebook-import-text').value;
   const changes=planKeyedImport(overview,text,(a,r)=>edits.get(entryKey(a.id,r.enrolmentId))?.draft??draftFromResult(a,r));
   stagedImport=changes;
   const panel=root.querySelector('#gradebook-import-preview'),summary=document.createElement('strong');
   const clears=changes.filter(c=>c.clears).length;
   summary.textContent=changes.length+' changed results across '+new Set(changes.map(c=>c.entry.enrolmentId)).size+' pupils'+(clears?' · '+clears+' clear recorded marks':'');
   panel.append(summary);
   const list=document.createElement('ul'),describe=(status,raw)=>status+(Object.entries(raw).some(([,v])=>String(v).trim()!=='')?' ('+Object.entries(raw).filter(([,v])=>String(v).trim()!=='').map(([id,v])=>id+': '+v).join(', ')+')':'');
   for(const c of changes.slice(0,20)){const li=document.createElement('li');li.textContent=c.pupil+' · '+c.title+': '+describe(c.before.status,c.before.raw)+' → '+describe(c.entry.status,c.entry.marks);list.append(li);}
   panel.append(list);if(changes.length>20){const more=document.createElement('p');more.textContent='Showing first 20 of '+changes.length+' results.';panel.append(more);}
   root.querySelector('[data-action="gradebook-import-apply"]').disabled=false;
  }catch(e){error(e.message);}
 }
 function applyImport(){
  if(!stagedImport)return;
  const changes=stagedImport;
  if(perform(()=>{for(const c of changes)setDraft(c.key,c.draft);}))notify(changes.length+' imported results staged. Review and save.');
 }
 function bulkAction(action){
  if(!surface())return;
  switch(action){
   case 'gradebook-undo':historyMove('undo');break;
   case 'gradebook-redo':historyMove('redo');break;
   case 'gradebook-copy':copyButton();break;
   case 'gradebook-fill':rangeEdit('fill');break;
   case 'gradebook-clear':rangeEdit('clear');break;
   case 'gradebook-export':downloadCSV();break;
   case 'gradebook-import-preview':previewImport();break;
   case 'gradebook-import-apply':applyImport();break;
  }
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
   revision=getStore().revision();history.reset();invalidateImport();error('');refresh();
   if(activePoint)focus(at(activePoint.row,activePoint.col));notify(count+' result'+(count===1?'':'s')+' saved across the gradebook.');
  }catch(e){error(e.message);}finally{saving=false;}
 }
 function discard(){
  if(!dirty()||!window.confirm('Discard unsaved gradebook changes?'))return;
  edits.clear();history.reset();revision=getStore().revision();invalidateImport();syncValues();error('');refresh();
 }
 function keyboard(event){
  if(!surface()||document.querySelector('dialog[open]'))return false;
  const inEditor=event.target.matches?.('.gradebook-cell,.gradebook-result-status,.gradebook-bulk-tools button');
  const command=event.ctrlKey||event.metaKey,keyName=event.key.toLowerCase();
  if(inEditor&&command&&!event.altKey&&!event.isComposing){
   if(keyName==='z'||keyName==='y'){event.preventDefault();historyMove(keyName==='y'||event.shiftKey?'redo':'undo');return true;}
   if(keyName==='d'&&!event.shiftKey){event.preventDefault();rangeEdit('fill');return true;}
  }
  if(inEditor&&event.key==='Delete'&&!command&&anchor&&end&&(anchor.row!==end.row||anchor.col!==end.col)){event.preventDefault();rangeEdit('clear');return true;}
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
 return {mount,isDirty:dirty,guard,onInput,onChange,onFocus,pointer,paste,copy,keyboard,save,discard,bulkAction};
}
