import {cellMark,previewRow,parseDelimited} from './markbook.mjs';
import {gradeFor,weightedMean} from './analytics.mjs';
export const entryKey=(assessmentId,enrolmentId)=>JSON.stringify([assessmentId,enrolmentId]);
export const canEnter=(assessment,result)=>Boolean(assessment.mode==='total'&&assessment.items.length===1&&result.editable&&!result.exclusionReason);
export function entryValue(assessment,result){
 if(result.entryStatus==='absent')return 'A';
 return String(result.marks[assessment.items[0].id]??'');
}
export function decodeEntry(assessment,result,value){
 if(!canEnter(assessment,result))throw Error('This result is read-only here; open the assessment detail.');
 const input=String(value??'').trim();
 let status='missing',marks={};
 if(/^a(?:bsent)?$/i.test(input))status='absent';
 else if(input!==''){status='present';marks[assessment.items[0].id]=cellMark(input,assessment.items[0]);}
 return {assessmentId:assessment.id,enrolmentId:result.enrolmentId,status,marks};
}
export function isChanged(entry,result){
 // A blank present-but-incomplete result is not rewritten merely by viewing it.
 return entry.status!==result.entryStatus||Object.keys(entry.marks).length!==Object.keys(result.marks).length||
  Object.entries(entry.marks).some(([id,value])=>result.marks[id]!==value);
}
export function entryPreview(assessment,result,entry){
 return previewRow(assessment,assessment.bands,entry.status,entry.marks,Boolean(result.exclusionReason));
}
export function liveSummary(summary,previews,scheme){
 // Use precisely the same eligible result set and weighting as studentSummary.
 const rows=summary.results.map(r=>{const p=previews.get(r.assessmentId);return p?{...r,status:p.state,percent:p.percent}:r;});
 const scored=rows.filter(r=>r.status==='scored');
 const average=weightedMean(scored.map(r=>({value:r.percent,weight:r.weight})));
 return {average,grade:gradeFor(average,scheme),scored:scored.length,eligible:rows.length};
}
export function blockEntries(overview,row,col,text){
 const matrix=parseDelimited(text,'\t'),entries=[];
 if(!matrix.length||!matrix[0].length)throw Error('Nothing to paste');
 const width=matrix[0].length;
 if(matrix.some(line=>line.length!==width))throw Error('Paste a rectangular block of cells');
 if(row+matrix.length>overview.rows.length||col+width>overview.assessments.length)throw Error('Pasted block extends beyond the gradebook');
 for(const [i,line] of matrix.entries())for(const [j,value] of line.entries()){
  const a=overview.assessments[col+j],p=overview.rows[row+i],r=p.results[a.id];
  // Do not silently shift columns or skip non-editable cells.
  if(!canEnter(a,r))throw Error('Pasted block includes a read-only or structured assessment cell');
  if(!value.trim())continue; // Blank clipboard cells leave existing marks unchanged.
  const raw=value.trim().toUpperCase()==='CLEAR'?'':value;
  decodeEntry(a,r,raw);entries.push({row:row+i,col:col+j,raw});
 }
 return entries;
}
export function selectionBounds(anchor,end){
 return {top:Math.min(anchor.row,end.row),bottom:Math.max(anchor.row,end.row),left:Math.min(anchor.col,end.col),right:Math.max(anchor.col,end.col)};
}
