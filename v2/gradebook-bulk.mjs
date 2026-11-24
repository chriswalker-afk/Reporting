import {parseDelimited,cellMark} from './markbook.mjs';
import {entryKey,canEditStructured,canEnter,draftFromResult,editDraftItem,editDraftStatus,decodeDraft,selectionBounds} from './gradebook-entry.mjs';

// Drafts are immutable values; snapshot maps retain stable result keys even when columns collapse.
export function createEditHistory(limit=100){
 let past=[],future=[];
 const signature=m=>JSON.stringify([...m].sort(([a],[b])=>a.localeCompare(b)));
 return {
  record(before,after){
   if(signature(before)===signature(after))return false;
   past.push({before:new Map(before),after:new Map(after)});if(past.length>limit)past.shift();future=[];return true;
  },
  undo(){const step=past.pop();if(!step)return null;future.push(step);return new Map(step.before);},
  redo(){const step=future.pop();if(!step)return null;past.push(step);return new Map(step.after);},
  canUndo:()=>past.length>0,canRedo:()=>future.length>0,
  reset(){past=[];future=[];}
 };
}
export function selectedRectangle(overview,columns,anchor,end){
 if(!anchor||!end)throw Error('Select a range of mark cells first');
 const b=selectionBounds(anchor,end);
 if(b.top<0||b.left<0||b.bottom>=overview.rows.length||b.right>=columns.length)throw Error('Selection is outside the current gradebook');
 const rows=[];
 for(let row=b.top;row<=b.bottom;row++){
  const line=[];
  for(let col=b.left;col<=b.right;col++){
   const p=overview.rows[row],{assessment:a,item}=columns[col],r=a?p.results[a.id]:null;
   if(!a||!item||!canEnter(a,r,item.id))throw Error('Select only editable marks; the range includes a calculated or read-only cell');
   line.push({row,col,p,a,item,r});
  }
  rows.push(line);
 }
 return rows;
}
const quoteTSV=v=>/["\t\r\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);
export function copyRectangle(rows,valueFor){
 return rows.map(row=>row.map(c=>{const raw=String(valueFor(c));if(!(c.a.mode==='total'&&/^a(?:bsent)?$/i.test(raw.trim())))cellMark(raw,c.item);return quoteTSV(raw);}).join('\t')).join('\r\n');
}
export function planRangeEdit(rows,operation,valueFor){
 if(operation==='fill'&&rows.length<2)throw Error('Select at least two rows to fill down');
 if(!['fill','clear'].includes(operation))throw Error('Unknown range operation');
 const result=[];
 for(const [i,row] of rows.entries()){
  if(operation==='fill'&&i===0)continue;
  for(const [j,c] of row.entries()){
   const raw=operation==='clear'?'':String(valueFor(rows[0][j]));
   if(!(c.a.mode==='total'&&/^a(?:bsent)?$/i.test(raw.trim())))cellMark(raw,c.item);
   result.push({row:c.row,col:c.col,raw});
  }
 }
 return result;
}

// Excel-compatible interchange is deliberately keyed rather than positional.
// Exact headers also detect changed assessment labels/maxima before importing an outdated template.
const metadata=['Enrolment ID','Student ID','Student name','MTG','Predicted grade','Current grade'];
export function exchangeColumns(overview){
 return overview.assessments.flatMap(a=>[
  {header:'Status | '+JSON.stringify([a.id])+' | '+a.title,a,item:null},
  ...a.items.map(item=>({header:'Mark | '+JSON.stringify([a.id,item.id])+' | '+a.title+' / '+item.label+' ('+item.maxMarks+')',a,item}))
 ]);
}
const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
// Neutralise spreadsheet formula-like text metadata, not numeric marks.
const safeText=v=>/^[=+@\-\t\r]/.test(String(v??''))?"'"+v:String(v??'');
export function exportGradebook(overview){
 const cols=exchangeColumns(overview);
 const rows=[metadata.concat(cols.map(c=>c.header))];
 for(const p of overview.rows){
  rows.push([p.enrolmentId,p.studentId,safeText(p.name),p.summary.minimumGrade??'',p.summary.predictedGrade??'',p.summary.grade??'',
   ...cols.map(({a,item})=>{const r=p.results[a.id];return item?r.marks[item.id]??'':r.exclusionReason?'excluded':r.entryStatus;})]);
 }
 return rows.map(row=>row.map(csv).join(',')).join('\r\n');
}
export function planKeyedImport(overview,text,getDraft=(a,r)=>draftFromResult(a,r)){
 const rows=parseDelimited(text);
 if(rows.length<2)throw Error('Include the header and at least one pupil row');
 const header=rows[0].map(v=>v.trim()),keyIndex=header.indexOf('Enrolment ID'),studentIndex=header.indexOf('Student ID');
 if(keyIndex<0)throw Error('Keep the Enrolment ID header from the gradebook export');
 if(new Set(header).size!==header.length)throw Error('Duplicate import column');
 const known=new Map(exchangeColumns(overview).map(c=>[c.header,c]));
 const mapped=header.map(h=>metadata.includes(h)?null:known.get(h));
 if(mapped.some(c=>c===undefined))throw Error('Unknown or changed assessment/item header. Export a fresh gradebook and keep its headings.');
 if(!mapped.some(Boolean))throw Error('Include at least one assessment status or mark column');
 const pupils=new Map(overview.rows.map(p=>[p.enrolmentId,p])),seen=new Set(),changes=[];
 for(let i=1;i<rows.length;i++){
  const row=rows[i];if(row.every(x=>!x.trim()))continue;
  if(row.length!==header.length)throw Error('Row '+(i+1)+' has the wrong number of fields');
  const id=row[keyIndex].trim(),p=pupils.get(id);
  if(!p)throw Error('Unknown or out-of-scope Enrolment ID on row '+(i+1)+': '+id);
  if(seen.has(id))throw Error('Duplicate Enrolment ID: '+id);seen.add(id);
  if(studentIndex>=0&&row[studentIndex].trim()!==p.studentId)throw Error('Student ID does not match Enrolment ID on row '+(i+1));
  const groups=new Map();
  for(const [j,c] of mapped.entries()){
   const raw=row[j].trim();if(!c||!raw)continue;
   if(!groups.has(c.a.id))groups.set(c.a.id,{a:c.a,status:null,marks:new Map()});
   const g=groups.get(c.a.id);if(c.item)g.marks.set(c.item.id,raw);else g.status=raw.toLowerCase();
  }
  for(const {a,status,marks} of groups.values()){
   const r=p.results[a.id],base=getDraft(a,r);
   if(!canEditStructured(a,r)){
    // An unmodified export can be re-imported without touching a locked record.
    if(status!==null&&status!==(r.exclusionReason?'excluded':r.entryStatus)||[...marks].some(([id,v])=>v!==String(r.marks[id]??'')))throw Error(p.name+' · '+a.title+' is read-only');
    continue;
   }
   if(status!==null&&!['present','absent','missing'].includes(status))throw Error(p.name+' · '+a.title+': invalid status');
   const normalized=[...marks].map(([id,v])=>[id,v.toUpperCase()==='CLEAR'?'':v]);
   if(['absent','missing'].includes(status)&&normalized.some(([,v])=>v!==''))throw Error(p.name+' · '+a.title+': absent/missing conflicts with entered marks');
   let draft=status===null?base:editDraftStatus(a,base,status);
   for(const [itemId,raw] of normalized){
    const item=a.items.find(i=>i.id===itemId);cellMark(raw,item);
    if(['absent','missing'].includes(status))continue;
    draft=editDraftItem(a,draft,itemId,raw);
   }
   if(status==='present'&&draft.status!=='present')draft=editDraftStatus(a,draft,'present');
   const decoded=decodeDraft(a,r,draft);
   if(!decoded.entry)throw Error(p.name+' · '+a.title+': '+Object.values(decoded.errors).join('; '));
   const previous=decodeDraft(a,r,base);
   if(JSON.stringify(draft)===JSON.stringify(base)||previous.entry&&JSON.stringify(decoded.entry)===JSON.stringify(previous.entry))continue;
   changes.push({key:entryKey(a.id,p.enrolmentId),draft,entry:decoded.entry,pupil:p.name,title:a.title,
    before:base,clears:Object.keys(r.marks).some(id=>!Object.hasOwn(decoded.entry.marks,id))});
  }
 }
 if(!changes.length)throw Error('No changed results found. Blank import cells leave marks unchanged.');
 return changes;
}
