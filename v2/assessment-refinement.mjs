import {previewRow} from './markbook.mjs';
export const RESULT_STATES=['scored','missing','incomplete','absent','excluded','invalid'];
export function markBufferSummary(detail,buffer=new Map()){
 const counts=Object.fromEntries(RESULT_STATES.map(k=>[k,0])),changedIds=[],clearingIds=[],pendingIds=[];
 for(const original of detail.rows){
  const row=buffer.get(original.enrolmentId)??original,invalid=Boolean(row.invalid);
  const state=invalid?'invalid':previewRow(detail.assessment,detail.bands,row.entryStatus,row.marks,Boolean(original.exclusionReason)).state;
  counts[state]++;
  if(!original.editable)continue;
  if(invalid||row.entryStatus!==original.entryStatus||detail.assessment.items.some(i=>row.marks[i.id]!==original.marks[i.id]))changedIds.push(original.enrolmentId);
  if(!invalid&&detail.assessment.items.some(i=>Object.hasOwn(original.marks,i.id)&&!Object.hasOwn(row.marks,i.id)))clearingIds.push(original.enrolmentId);
  if(['missing','incomplete','invalid'].includes(state))pendingIds.push(original.enrolmentId);
 }
 return {counts,eligible:detail.rows.length,changedIds,clearingIds,pendingIds,needsEntry:counts.missing+counts.incomplete};
}
export function nextMarkCell(cells,current,key,shift=false){
 const ordered=[...cells].sort((a,b)=>a.row-b.row||a.col-b.col);
 if(key==='Tab'){
  const index=ordered.findIndex(c=>c.row===current.row&&c.col===current.col);
  return index<0?null:ordered[index+(shift?-1:1)]??null;
 }
 const vertical=key==='ArrowUp'||key==='ArrowDown'||key==='Enter',horizontal=key==='ArrowLeft'||key==='ArrowRight';
 if(!vertical&&!horizontal)return null;
 const direction=key==='ArrowUp'||key==='ArrowLeft'||key==='Enter'&&shift?-1:1,axis=vertical?'row':'col',fixed=vertical?'col':'row';
 return ordered.filter(c=>c[fixed]===current[fixed]&&(c[axis]-current[axis])*direction>0).sort((a,b)=>(a[axis]-b[axis])*direction)[0]??null;
}
export function rankedEvidence(rows){
 return [...rows].sort((a,b)=>{
  const av=Number.isFinite(a.percent)&&a.available>0,bv=Number.isFinite(b.percent)&&b.available>0;
  if(av!==bv)return av?-1:1;
  return (av?a.percent-b.percent:0)||String(a.topic??a.label??a.id).localeCompare(String(b.topic??b.label??b.id),'en',{numeric:true});
 });
}
export function assessmentCoverage(rows,assessmentId){
 const counts={scored:0,missing:0,incomplete:0,absent:0,excluded:0};
 for(const p of rows){const result=p.results[assessmentId];if(result&&Object.hasOwn(counts,result.status))counts[result.status]++;}
 return {...counts,eligible:rows.length,needsEntry:counts.missing+counts.incomplete};
}
export const evidenceShare=(count,total)=>total?100*count/total:null;
