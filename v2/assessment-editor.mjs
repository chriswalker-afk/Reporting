const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(v);
const option=(v,l,selected)=>'<option value="'+esc(v)+'"'+(selected===v?' selected':'')+'>'+esc(l)+'</option>';
const markInput=(name,value,caption)=>'<input class="input assessment-max" name="'+name+'" aria-label="'+esc(caption)+'" type="number" min="0.000001" max="10000" step="any" required value="'+esc(value)+'">';
export function assessmentItemRow(item,index,locked=false){
 const label=item.label??'Q'+(index+1),topic=item.topic??'',ao=item.ao??'';
 return '<tr data-assessment-item><td><input name="item-label" aria-label="Item label '+(index+1)+'" class="input" maxlength="80" required value="'+esc(label)+'"'+(locked?' readonly':'')+'></td><td>'+markInput('item-max',item.maxMarks??10,'Maximum mark '+(index+1))+'</td><td><input name="item-topic" aria-label="Topic '+(index+1)+'" class="input" value="'+esc(topic)+'"'+(locked?' readonly':'')+'></td><td>'+(locked?'<input type="hidden" name="item-ao" value="'+esc(ao)+'">'+esc(ao||'—'):'<select name="item-ao" aria-label="Assessment objective '+(index+1)+'" class="select">'+[['','—'],['AO1','AO1'],['AO2','AO2'],['AO3','AO3']].map(([v,l])=>option(v,l,ao)).join('')+'</select>')+'</td><td>'+(locked?'':'<button type="button" class="btn btn-quiet" data-action="remove-assessment-item" aria-label="Remove item '+(index+1)+'">×</button>')+'</td></tr>';
}
export function assessmentFormat(a,locked){
 const mode=a?.mode??'total',total=mode==='total'?a?.items[0]:null,items=mode!=='total'?a.items:[{label:'Q1',maxMarks:10,topic:'',ao:null}];
 const modes=[['total','Overall mark'],['topics','Topic marks'],['questions','Question-level analysis (QLA)']];
 return '<div id="assessment-format" data-locked="'+Boolean(locked)+'"><label>Assessment type'+(locked?'<input type="hidden" name="mode" value="'+esc(mode)+'"><strong>'+esc(modes.find(m=>m[0]===mode)[1])+'</strong>':'<select id="assessment-mode" name="mode" class="select">'+modes.map(([v,l])=>option(v,l,mode)).join('')+'</select>')+'</label>'+
 '<fieldset id="assessment-total-pane" '+(mode!=='total'?'hidden disabled':'')+'><label>Maximum mark'+markInput('total-max',total?.maxMarks??40,'Maximum mark')+'</label><input type="hidden" name="total-label" value="'+esc(total?.label??'Total')+'"></fieldset>'+
 '<fieldset id="assessment-items-pane" '+(mode==='total'?'hidden disabled':'')+'><div class="table-scroll assessment-item-scroll"><table class="data-table"><thead><tr><th>Label</th><th>Max mark</th><th>Topic</th><th>AO (optional)</th><th></th></tr></thead><tbody id="assessment-item-rows">'+items.map((item,i)=>assessmentItemRow(item,i,locked)).join('')+'</tbody></table></div>'+
 (locked?'':'<button class="btn" type="button" data-action="add-assessment-item">+ Add item</button>')+'<p class="small muted">For topic marks, the topic defaults to the label. For QLA, enter the topic of each question.</p></fieldset>'+
 '<div class="assessment-total-line">Total available: <strong id="assessment-total-value">'+(mode==='total'?(total?.maxMarks??40):items.reduce((s,i)=>s+i.maxMarks,0))+'</strong> marks</div>'+
 (locked?'<p class="info-box">Recorded results lock the assessment format, item labels, order and assignments. Maximum marks can be corrected with confirmation if no recorded mark exceeds the revised maximum.</p>':'')+'</div>';
}
export function formItems(form,old){
 const mode=String(form.get('mode')??'');
 if(mode==='total'){
  const item=old?.locked?old.assessment.items[0]:null;
  return [{label:String(form.get('total-label')??'Total'),maxMarks:n(form.get('total-max')),topic:item?.topic??null,ao:item?.ao??null}];
 }
 const labels=form.getAll('item-label'),max=form.getAll('item-max'),topics=form.getAll('item-topic'),ao=form.getAll('item-ao');
 if(!labels.length||[max,topics,ao].some(xs=>xs.length!==labels.length))throw Error('Enter at least one complete assessment item');
 return labels.map((label,i)=>({label:String(label),maxMarks:n(max[i]),topic:String(topics[i]).trim()||(mode==='topics'?String(label).trim():null),ao:String(ao[i])||null}));
}
export const itemTotal=items=>items.reduce((s,i)=>s+i.maxMarks,0);
export function boundaryPercent(values,unit,total,labels){
 if(values.length!==labels.length||values.some(v=>String(v).trim()==='')||!Number.isFinite(total)||total<=0)throw Error('Enter all grade boundaries and a valid maximum mark');
 if(!['marks','percent'].includes(unit))throw Error('Choose a valid boundary unit');
 return labels.map((b,i)=>({grade:b.grade,min:unit==='marks'?n(values[i])/total*100:n(values[i])}));
}
function modeOf(form){return form.querySelector('[name="mode"]').value;}
function maxOf(form){
 const values=modeOf(form)==='total'?[form.querySelector('[name="total-max"]').value]:[...form.querySelectorAll('[name="item-max"]')].map(el=>el.value);
 return values.map(Number).reduce((s,v)=>s+v,0);
}
function updateTotal(form){
 const total=maxOf(form);form.querySelector('#assessment-total-value').textContent=Number.isFinite(total)?String(total):'—';
 const raw=form.querySelector('#boundary-unit')?.value==='marks';
 for(const el of form.querySelectorAll('[name="boundary"]'))el.max=String(raw?Math.max(total,0):100);
}
export function syncAssessmentMode(form){
 const mode=modeOf(form);
 for(const [id,show] of [['assessment-total-pane',mode==='total'],['assessment-items-pane',mode!=='total']]){
  const pane=form.querySelector('#'+id);pane.hidden=!show;pane.disabled=!show;
 }
 const rows=form.querySelector('#assessment-item-rows');
 if(rows&&mode==='topics'&&rows.children.length===1){
  const label=rows.querySelector('[name="item-label"]');
  if(label?.value==='Q1'&&!rows.querySelector('[name="item-topic"]').value)label.value='';
 }else if(rows&&mode==='questions'&&rows.children.length===1){
  const label=rows.querySelector('[name="item-label"]');if(label&&!label.value)label.value='Q1';
 }
 updateTotal(form);
}
export function editorInput(form,target){
 if(target.id==='assessment-mode'){syncAssessmentMode(form);return;}
 if(target.classList.contains('assessment-max'))updateTotal(form);
}
export function changeBoundaryUnit(form){
 const unit=form.querySelector('#boundary-unit'),previous=unit.dataset.previous??'percent',next=unit.value,total=maxOf(form);
 if(previous===next)return;
 if(!(total>0)){unit.value=previous;throw Error('Enter a positive total mark before switching boundary units');}
 for(const el of form.querySelectorAll('[name="boundary"]')){
  if(el.value!=='')el.value=String(next==='marks'?Number(el.value)*total/100:Number(el.value)*100/total);
 }
 unit.dataset.previous=next;updateTotal(form);
}
export function resetEditorBoundaries(form,bands){
 const raw=form.querySelector('#boundary-unit')?.value==='marks',total=maxOf(form);
 if(raw&&!(total>0))throw Error('Enter a positive total mark first');
 [...form.querySelectorAll('[name="boundary"]')].forEach((el,i)=>el.value=String(raw?bands[i].min*total/100:bands[i].min));
}
export function changeEditorRows(form,action,target){
 const rows=form.querySelector('#assessment-item-rows');
 if(form.querySelector('#assessment-format').dataset.locked==='true'||modeOf(form)==='total')return;
 if(action==='add-assessment-item'){
  if(rows.children.length>=100)throw Error('Maximum 100 assessment items');
  let label='';if(modeOf(form)==='questions'){const used=new Set([...rows.querySelectorAll('[name="item-label"]')].map(el=>el.value.toLowerCase()));let index=1;while(used.has('q'+index))index++;label='Q'+index;}
  rows.insertAdjacentHTML('beforeend',assessmentItemRow({label,maxMarks:10},rows.children.length));
  rows.lastElementChild.querySelector('[name="item-label"]').focus();
 }else if(action==='remove-assessment-item'){
  if(rows.children.length<=1)throw Error('Keep at least one assessment item');
  target.closest('[data-assessment-item]')?.remove();
 }
 updateTotal(form);
}
