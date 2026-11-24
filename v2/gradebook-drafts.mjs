// Browser-local recovery of unsaved gradebook marks.
// Drafts are written as the teacher types so an accidental refresh, closed tab or
// browser crash does not lose work. They are never committed to the record store:
// the teacher still reviews and presses Save. A draft entry is only restored when the
// saved result it was based on is unchanged, so newer marks saved elsewhere win.
import {draftFromResult,canEditStructured} from './gradebook-entry.mjs';

export const DRAFT_PREFIX='jis-hub-v2-gradebook-draft:';
const VERSION=1;

export const draftStorageKey=(staffId,classId,unitId)=>DRAFT_PREFIX+JSON.stringify([staffId,classId,unitId||'']);

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function serializeDrafts(edits,records,now=new Date()){
 const entries=[];
 for(const [key,change] of edits){
  const record=records.get(key);if(!record)continue;
  entries.push([key,change.draft,draftFromResult(record.a,record.r)]);
 }
 return {v:VERSION,savedAt:now.toISOString(),entries};
}

export function restorableDrafts(payload,records){
 if(!payload||payload.v!==VERSION||!Array.isArray(payload.entries))return {restored:[],skipped:0};
 const restored=[];let skipped=0;
 for(const entry of payload.entries){
  const [key,draft,base]=Array.isArray(entry)?entry:[];
  const record=records.get(key);
  const valid=record&&draft&&typeof draft.status==='string'&&draft.raw&&typeof draft.raw==='object';
  if(!valid||!canEditStructured(record.a,record.r)||!same(draftFromResult(record.a,record.r),base)){skipped++;continue;}
  restored.push([key,{status:draft.status,raw:Object.fromEntries(record.a.items.map(i=>[i.id,String(draft.raw[i.id]??'')]))}]);
 }
 return {restored,skipped};
}

export function createDraftStore(storage){
 const safe=fn=>{try{return fn();}catch{return null;}};
 return {
  load:key=>safe(()=>{const text=storage?.getItem(key);return text?JSON.parse(text):null;}),
  save(key,edits,records){
   if(!storage)return false;
   if(!edits.size){safe(()=>storage.removeItem(key));return true;}
   return safe(()=>{storage.setItem(key,JSON.stringify(serializeDrafts(edits,records)));return true;})===true;
  },
  clear:key=>safe(()=>storage?.removeItem(key)),
  clearAll:()=>safe(()=>{for(let i=storage.length-1;i>=0;i--){const k=storage.key(i);if(k?.startsWith(DRAFT_PREFIX))storage.removeItem(k);}})
 };
}
