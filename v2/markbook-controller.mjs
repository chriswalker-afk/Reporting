import {cellMark,previewRow,parseDelimited,importPreview} from './markbook.mjs';
import {unpackBookId} from './markbook-views.mjs';
import {pct} from './workspace.mjs';
import {markBufferSummary,nextMarkCell} from './assessment-refinement.mjs';

const byId=id=>document.getElementById(id);
export function parseItemLines(text){
 const lines=String(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 return lines.map((line,i)=>{
  const parts=line.split('|').map(x=>x.trim());
  if(parts.length<2||parts.length>4||!parts[0]||!parts[1]||!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(parts[1]))throw Error('Invalid item on line '+(i+1)+': use label | maximum mark | topic | AO');
  return {label:parts[0],maxMarks:Number(parts[1]),topic:parts[2]||null,ao:parts[3]||null};
 });
}
export function definitionInput(form,book,old){
 const get=k=>String(form.get(k)??''),ids=old?.locked?old.assessment.classIds:[...new Set([book.classId,...form.getAll('assigned').map(String)])];
 return {title:get('title'),date:get('date'),unitId:get('unitId'),classIds:ids,mode:get('mode'),items:parseItemLines(get('items')),weight:Number(get('weight')),
  bands:book.defaultBands.map((b,i)=>({grade:b.grade,min:Number(form.getAll('boundary')[i])})),confirmed:form.has('confirmed'),reason:get('reason')};
}
/** The mark grid is an unsaved buffer. No mark changes are persisted until its single explicit save. */
export function createGridController({dialog,getDetail,getWorkspace,getStore,getStaff,notify}){
 let dirty=false,revision=null,stagedImport=null,activeDetail=null,buffer=new Map(),summary=null;
 const detail=()=>{
  const record=getDetail();
  if(record?.kind!=='mark-grid')throw Error('No active mark-entry grid');
  const [classId,id]=unpackBookId(record.id);
  return getWorkspace().markbook(classId).detail(id);
 };
 const rows=()=>[...dialog.querySelectorAll('tr[data-mark-row]')];
 const findRow=id=>rows().find(row=>row.dataset.markRow===id);
 const cell=(row,id)=>[...row.querySelectorAll('.mark-cell')].find(n=>n.dataset.item===id);
 const setText=(row,key,value)=>{row.querySelector('[data-preview="'+key+'"]').textContent=value;};
 const error=message=>{const node=byId('form-error');if(node){node.hidden=!message;node.textContent=message||'';}else if(message)notify(message);};
 function readRow(row,d,strict=true){
  const original=d.rows.find(r=>r.enrolmentId===row.dataset.markRow),select=row.querySelector('.entry-status');
  if(!original||!select)return original;
  const status=select.value,marks={};let invalid=false;
  for(const item of d.assessment.items){
   const input=cell(row,item.id);let value=null;
   try{if(status==='present')value=cellMark(input.value,item);input.removeAttribute('aria-invalid');}
   catch(e){input.setAttribute('aria-invalid','true');invalid=true;if(strict)throw Error(original.name+': '+e.message);}
   if(value!==null)marks[item.id]=value;
  }
  if(invalid)return null;
  return {...original,entryStatus:status,marks};
 }
 function updateRow(row,d=activeDetail??detail()){
  if(!row.querySelector('.entry-status'))return;
  const r=readRow(row,d,false);
  buffer.set(row.dataset.markRow,r??{enrolmentId:row.dataset.markRow,invalid:true});
  row.classList.toggle('inactive-mark-row',row.querySelector('.entry-status').value!=='present');
  if(!r){row.dataset.entryState='invalid';setText(row,'total','—');setText(row,'percent','—');setText(row,'grade','—');setText(row,'status','Invalid mark');return;}
  const p=previewRow(d.assessment,d.bands,r.entryStatus,r.marks,Boolean(r.exclusionReason));
  setText(row,'total',p.total===null?'—':p.total+'/'+d.maxMarks);setText(row,'percent',pct(p.percent));setText(row,'grade',p.grade??'—');
  row.dataset.entryState=p.state;setText(row,'status',p.state[0].toUpperCase()+p.state.slice(1));
 }
 function resetImport(){
  stagedImport=null;const node=byId('mark-import-preview');if(node)node.replaceChildren();
 }
 function refreshSummary(){
  if(!activeDetail)return;
  summary=markBufferSummary(activeDetail,buffer);dirty=summary.changedIds.length>0;
  const changed=new Set(summary.changedIds);
  for(const row of rows())row.classList.toggle('changed-mark-row',changed.has(row.dataset.markRow));
  const values={scored:summary.counts.scored+'/'+summary.eligible,pending:summary.needsEntry,absent:summary.counts.absent,excluded:summary.counts.excluded,invalid:summary.counts.invalid};
  for(const [key,value] of Object.entries(values)){const node=byId('entry-stat-'+key);if(node)node.textContent=value;}
  const node=byId('mark-dirty');if(node)node.textContent=dirty?'Unsaved changes · '+summary.changedIds.length+' pupil'+(summary.changedIds.length===1?'':'s'):'No unsaved changes';
  const clear=byId('mark-clear-count');if(clear)clear.textContent=summary.clearingIds.length?summary.clearingIds.length+' pupil result(s) will lose previously entered marks. Confirm to save.':'';
  const next=dialog.querySelector('[data-action="next-unfinished-mark"]');if(next){next.disabled=!summary.pendingIds.length;next.textContent='Next unfinished ('+summary.pendingIds.length+')';}
 }
 function setDirty(){resetImport();refreshSummary();}
 function init(){
  dirty=false;revision=getStore().revision();stagedImport=null;activeDetail=null;buffer=new Map();summary=null;
  if(getDetail()?.kind==='mark-grid'){activeDetail=detail();for(const row of rows())updateRow(row,activeDetail);refreshSummary();}
 }
 function focusCell(input){if(!input)return false;input.focus();input.select();return true;}
 function focusRequested(){
  if(getDetail()?.kind!=='mark-grid')return;
  const [,,id]=unpackBookId(getDetail().id);if(!id)return;
  const row=findRow(id);if(!row)return;
  const cells=[...row.querySelectorAll('.mark-cell')];
  if(!focusCell(cells.find(n=>n.getAttribute('aria-invalid')==='true')??cells.find(n=>!n.value.trim())??cells[0])){row.focus();row.scrollIntoView({block:'nearest',inline:'nearest'});}
 }
 function onFocus(target){
  if(getDetail()?.kind!=='mark-grid'||!activeDetail||!target.matches?.('.mark-cell'))return;
  const row=target.closest('tr'),col=target.dataset.col;
  dialog.querySelectorAll('.mark-row-focus,.mark-column-focus').forEach(n=>n.classList.remove('mark-row-focus','mark-column-focus'));
  row.classList.add('mark-row-focus');
  dialog.querySelector('[data-mark-header="'+col+'"]')?.classList.add('mark-column-focus');
  for(const td of dialog.querySelectorAll('[data-mark-column="'+col+'"]'))td.classList.add('mark-column-focus');
  const node=byId('mark-focus');if(node)node.textContent=target.getAttribute('aria-label')+' · Row '+(Number(target.dataset.row)+1)+' of '+activeDetail.rows.length;
 }
 function nextUnfinished(){
  if(!summary?.pendingIds.length)return;
  const all=rows(),current=all.findIndex(r=>r.classList.contains('mark-row-focus'));
  const ids=new Set(summary.pendingIds),ordered=[...all.slice(current+1),...all.slice(0,current+1)];
  const row=ordered.find(r=>ids.has(r.dataset.markRow));if(!row)return;
  const cells=[...row.querySelectorAll('.mark-cell')];
  focusCell(cells.find(n=>n.getAttribute('aria-invalid')==='true')??cells.find(n=>!n.value.trim())??cells[0]);
 }
 function canLeave(){
  if(getDetail()?.kind==='mark-grid'&&dirty&&!window.confirm('Discard unsaved marks? Your saved results will not change.'))return false;
  dirty=false;stagedImport=null;activeDetail=null;return true;
 }
 function onInput(target){
  if(getDetail()?.kind!=='mark-grid')return false;
  if(target.matches('.mark-cell')){
   const row=target.closest('tr'),status=row.querySelector('.entry-status');
   if(target.value.trim()&&status)status.value='present';
   updateRow(row);setDirty();return true;
  }
  if(target.id==='mark-import-text'){resetImport();return true;}
  return false;
 }
 function onChange(target){
  if(getDetail()?.kind!=='mark-grid')return false;
  if(target.matches('.entry-status')){updateRow(target.closest('tr'));setDirty();return true;}
  if(target.id==='mark-import-file'){
   const f=target.files?.[0],current=getDetail()?.id;
   if(!f)return true;
   if(f.size>500000){notify('Choose a CSV or TSV under 500 KB.');return true;}
   f.text().then(text=>{if(getDetail()?.kind==='mark-grid'&&getDetail()?.id===current&&byId('mark-import-text')){byId('mark-import-text').value=text;resetImport();}}).catch(()=>notify('Could not read the selected file.'));
   return true;
  }
  return false;
 }
 function paste(event){
  if(getDetail()?.kind!=='mark-grid'||!event.target.matches('.mark-cell'))return;
  const text=event.clipboardData?.getData('text/plain')??'';
  if(!/[\t\r\n]/.test(text))return;
  event.preventDefault();
  try{
   const d=activeDetail??detail(),matrix=parseDelimited(text,'\t'),startRow=Number(event.target.dataset.row),startCol=Number(event.target.dataset.col),all=rows(),changes=[];
   if(startRow+matrix.length>all.length)throw Error('Pasted block extends beyond the class register');
   for(const [i,line] of matrix.entries()){
    if(startCol+line.length>d.assessment.items.length)throw Error('Pasted block extends beyond the assessment columns');
    for(const [j,value] of line.entries()){
     const item=d.assessment.items[startCol+j],row=all[startRow+i],input=cell(row,item.id);
     if(!input)throw Error('The pasted block includes a read-only pupil');
     const raw=value.trim();if(!raw)continue;
     const next=raw.toUpperCase()==='CLEAR'?'':String(cellMark(raw,item));
     changes.push({row,input,next});
    }
   }
   for(const c of changes){c.input.value=c.next;c.row.querySelector('.entry-status').value='present';}
   for(const row of new Set(changes.map(c=>c.row)))updateRow(row,d);
   if(changes.length){setDirty();error('');notify('Pasted '+changes.length+' cells. Review and save changes.');}
  }catch(e){error(e.message);}
 }
 function keyboard(event){
  if(getDetail()?.kind!=='mark-grid')return false;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&activeDetail?.editable){event.preventDefault();byId('mark-grid-form')?.requestSubmit();return true;}
  if(!event.target.matches?.('.mark-cell')||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return false;
  const target=event.target,key=event.key;
  if(event.shiftKey&&key.startsWith('Arrow'))return false;
  if(key==='ArrowLeft'&&(target.selectionStart!==target.selectionEnd||target.selectionStart!==0))return false;
  if(key==='ArrowRight'&&(target.selectionStart!==target.selectionEnd||target.selectionEnd!==target.value.length))return false;
  const cells=[...dialog.querySelectorAll('.mark-cell')].map(input=>({row:Number(input.dataset.row),col:Number(input.dataset.col),input}));
  const next=nextMarkCell(cells,{row:Number(target.dataset.row),col:Number(target.dataset.col)},key,event.shiftKey);
  if(!next&&key!=='Enter')return false;
  event.preventDefault();if(next)focusCell(next.input);return true;
 }
 function save(form){
  const d=activeDetail??detail(),entries=[];
  for(const row of rows()){
   const r=readRow(row,d),old=d.rows.find(x=>x.enrolmentId===r.enrolmentId);
   if(!old.editable)continue;
   const same=d.assessment.items.every(i=>r.marks[i.id]===old.marks[i.id]);
   if(!same||r.entryStatus!==old.entryStatus)entries.push({enrolmentId:r.enrolmentId,status:r.entryStatus,marks:r.marks});
  }
  if(!entries.length){dirty=false;byId('mark-dirty').textContent='No unsaved changes';notify('No result changes to save.');return false;}
  const options={confirmed:true,confirmClear:new FormData(form).has('confirmClear'),expectedRevision:revision};
  getStore().saveResultBatch(getStaff(),d.assessment.id,entries,options);
  dirty=false;revision=getStore().revision();notify('Saved '+entries.length+' pupil result'+(entries.length===1?'':'s')+'. All relevant summaries updated.');return true;
 }
 function previewImport(){
  const d=activeDetail??detail(),current=rows().map(row=>readRow(row,d));
  resetImport();stagedImport=importPreview(byId('mark-import-text').value,d.assessment,current);
  const node=byId('mark-import-preview');node.replaceChildren();
  const intro=document.createElement('p');intro.textContent=stagedImport.length+' pupil results will change in the unsaved grid. Review before applying.';node.append(intro);
  const list=document.createElement('div');list.className='import-preview-list';
  for(const r of stagedImport){
   const old=current.find(x=>x.enrolmentId===r.enrolmentId),p=previewRow(d.assessment,d.bands,r.status,r.marks,Boolean(old.exclusionReason));
   const row=document.createElement('p'),changes=d.assessment.items.filter(i=>old.marks[i.id]!==r.marks[i.id]).map(i=>i.label+': '+(old.marks[i.id]??'blank')+' → '+(r.marks[i.id]??'blank'));
   row.textContent=r.name+' · '+old.entryStatus+' → '+r.status+' · '+changes.join('; ')+' · '+(p.total??'unscored')+' / '+d.maxMarks;list.append(row);
  }
  node.append(list);
  const apply=document.createElement('button');apply.type='button';apply.className='btn btn-primary';apply.dataset.action='apply-mark-import';apply.textContent='Apply to unsaved grid';node.append(apply);
 }
 function applyImport(){
  if(!stagedImport)throw Error('Preview the import first');
  const d=activeDetail??detail();
  for(const r of stagedImport){
   const row=findRow(r.enrolmentId);if(!row)throw Error('Pupil is no longer in the grid');
   row.querySelector('.entry-status').value=r.status;
   for(const item of d.assessment.items)cell(row,item.id).value=r.marks[item.id]??'';
   updateRow(row,d);
  }
  setDirty();notify('Import staged. Save changes to commit results.');
 }
 function copyTemplate(){
  const node=byId('csv-template');
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(node.value).then(()=>notify('CSV template copied.')).catch(()=>{node.focus();node.select();notify('Press Ctrl/Cmd+C to copy the selected template.');});
  else{node.focus();node.select();}
 }
 function downloadTemplate(){
  const url=URL.createObjectURL(new Blob([byId('csv-template').value],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=detail().assessment.id+'-fictional-results.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return {init,canLeave,onInput,onChange,paste,keyboard,save,previewImport,applyImport,copyTemplate,downloadTemplate,error,onFocus,focusRequested,nextUnfinished,isDirty:()=>dirty};
}
