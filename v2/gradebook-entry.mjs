import {cellMark,previewRow,parseDelimited} from './markbook.mjs';
import {gradeFor,weightedMean} from './analytics.mjs';
export const entryKey=(assessmentId,enrolmentId)=>JSON.stringify([assessmentId,enrolmentId]);
export const canEditStructured=(assessment,result)=>Boolean(result.editable&&!result.exclusionReason);
export const canEnter=(assessment,result,itemId=assessment.mode==='total'?assessment.items[0]?.id:null)=>Boolean(canEditStructured(assessment,result)&&itemId!==null&&assessment.items.some(i=>i.id===itemId));
export function gradebookColumns(overview,expanded=[]){
 const open=new Set(expanded);
 return overview.assessments.flatMap(a=>a.mode==='total'?[{assessment:a,item:a.items[0],kind:'total'}]:
  [...(open.has(a.id)?a.items.map(item=>({assessment:a,item,kind:'item'})):[]),{assessment:a,item:null,kind:'summary'}]);
}
export function entryValue(assessment,result,itemId=assessment.items[0].id){
 if(assessment.mode==='total'&&result.entryStatus==='absent')return 'A';
 return String(result.marks[itemId]??'');
}
export function draftFromResult(assessment,result){
 return {status:result.entryStatus,raw:Object.fromEntries(assessment.items.map(i=>[i.id,String(result.marks[i.id]??'')]))};
}
export function draftValue(assessment,draft,itemId){
 return assessment.mode==='total'&&draft.status==='absent'?'A':draft.raw[itemId]??'';
}
export function editDraftItem(assessment,draft,itemId,value){
 if(!assessment.items.some(i=>i.id===itemId))throw Error('Unknown assessment item');
 const raw=String(value??''),next={status:draft.status,raw:{...draft.raw,[itemId]:raw}};
 if(assessment.mode==='total'&&/^a(?:bsent)?$/i.test(raw.trim()))return editDraftStatus(assessment,next,'absent');
 if(raw.trim())next.status='present';
 else if(!Object.values(next.raw).some(v=>v.trim())&&next.status!=='absent')next.status='missing';
 return next;
}
export function editDraftStatus(assessment,draft,status){
 if(!['present','missing','absent'].includes(status))throw Error('Invalid entry status');
 return {status,raw:status==='present'?{...draft.raw}:Object.fromEntries(assessment.items.map(i=>[i.id,'']))};
}
export function decodeDraft(assessment,result,draft){
 if(!canEditStructured(assessment,result))throw Error('This result is read-only here; open the assessment detail.');
 const marks={},errors={};
 if(draft.status==='present')for(const i of assessment.items){
  try{const v=cellMark(draft.raw[i.id],i);if(v!==null)marks[i.id]=v;}catch(e){errors[i.id]=e.message;}
 }
 const invalid=Object.keys(errors).length>0;
 return {entry:invalid?null:{assessmentId:assessment.id,enrolmentId:result.enrolmentId,status:draft.status,marks},errors};
}
export function decodeEntry(assessment,result,value){
 if(!canEnter(assessment,result))throw Error('This result is read-only here; open the assessment detail.');
 const decoded=decodeDraft(assessment,result,editDraftItem(assessment,draftFromResult(assessment,result),assessment.items[0].id,value));
 if(!decoded.entry)throw Error(Object.values(decoded.errors)[0]);
 return decoded.entry;
}
export function isChanged(entry,result){
 return entry.status!==result.entryStatus||Object.keys(entry.marks).length!==Object.keys(result.marks).length||
  Object.entries(entry.marks).some(([id,value])=>result.marks[id]!==value);
}
export function entryPreview(assessment,result,entry){
 return previewRow(assessment,assessment.bands,entry.status,entry.marks,Boolean(result.exclusionReason));
}
export function structuredPreview(assessment,result,entry=null){
 const marks=entry?.marks??result.marks,status=entry?.status??result.entryStatus;
 const p=previewRow(assessment,assessment.bands,status,marks,Boolean(result.exclusionReason));
 return {...p,entered:assessment.items.filter(i=>Object.hasOwn(marks,i.id)).length,
  partial:assessment.items.reduce((sum,i)=>sum+(marks[i.id]??0),0),
  maxMarks:assessment.items.reduce((sum,i)=>sum+i.maxMarks,0),status};
}
export function liveSummary(summary,previews,scheme){
 const rows=summary.results.map(r=>{const p=previews.get(r.assessmentId);return p?{...r,status:p.state,percent:p.percent}:r;});
 const scored=rows.filter(r=>r.status==='scored');
 const average=weightedMean(scored.map(r=>({value:r.percent,weight:r.weight})));
 return {average,grade:gradeFor(average,scheme),scored:scored.length,eligible:rows.length};
}
export function blockEntries(overview,row,col,text,columns=gradebookColumns(overview)){
 const matrix=parseDelimited(text,'\t'),entries=[];
 if(!matrix.length||!matrix[0].length)throw Error('Nothing to paste');
 const width=matrix[0].length;
 if(matrix.some(line=>line.length!==width))throw Error('Paste a rectangular block of cells');
 if(row+matrix.length>overview.rows.length||col+width>columns.length)throw Error('Pasted block extends beyond the gradebook');
 for(const [i,line] of matrix.entries())for(const [j,value] of line.entries()){
  const {assessment:a,item}=columns[col+j],p=overview.rows[row+i],r=p.results[a.id];
  if(!item||!canEnter(a,r,item.id))throw Error('Pasted block includes a read-only or structured assessment cell; expand assessments and paste into mark columns only');
  if(!value.trim())continue;
  const raw=value.trim().toUpperCase()==='CLEAR'?'':value;
  if(a.mode==='total')decodeEntry(a,r,raw);else cellMark(raw,item);
  entries.push({row:row+i,col:col+j,raw});
 }
 return entries;
}
export function selectionBounds(anchor,end){
 return {top:Math.min(anchor.row,end.row),bottom:Math.max(anchor.row,end.row),left:Math.min(anchor.col,end.col),right:Math.max(anchor.col,end.col)};
}
