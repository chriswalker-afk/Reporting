import {gradebookColumns,liveSummary} from './gradebook-entry.mjs';
import {gradeDistance} from './analytics.mjs';

export const LAYOUT_KEY='jis-hub-v2-gradebook-layout-1';
export const SUMMARY_FIELDS=[['mtg','MTG'],['prediction','Pred.'],['overall','Overall % / grade'],['gap','Target gap']];
export const DEFAULT_LAYOUT=Object.freeze({group:'none',order:'oldest',display:'marks',filter:'all',format:'all',from:'',to:'',hidden:[],custom:[],collapsed:[],summary:['mtg','prediction','overall'],density:'compact'});
const choices={
 group:['none','unit','term','type'],order:['oldest','newest','title','custom'],display:['marks','percent','grade'],
 filter:['all','counted','draft','diagnostic','future'],format:['all','total','topics','questions'],density:['compact','comfortable']
};
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const ids=v=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&x.length<=300))].slice(0,1000):[];
export function normalizeLayout(input={}){
 const p=input&&typeof input==='object'?input:{},out={...DEFAULT_LAYOUT};
 for(const [k,allowed] of Object.entries(choices))if(allowed.includes(p[k]))out[k]=p[k];
 for(const k of ['hidden','custom','collapsed'])out[k]=ids(p[k]);
 if(Array.isArray(p.summary))out.summary=SUMMARY_FIELDS.map(([id])=>id).filter(id=>p.summary.includes(id));else out.summary=[...DEFAULT_LAYOUT.summary];
 out.from=validDate(p.from)?p.from:'';out.to=validDate(p.to)?p.to:'';
 if(out.from&&out.to&&out.from>out.to){out.from='';out.to='';}
 return out;
}
export const layoutKey=(staffId,classId)=>LAYOUT_KEY+':'+JSON.stringify([staffId,classId]);
export function loadLayout(storage,staffId,classId){try{return normalizeLayout(JSON.parse(storage?.getItem(layoutKey(staffId,classId))??'null'));}catch{return normalizeLayout();}}
export function saveLayout(storage,staffId,classId,layout){try{storage?.setItem(layoutKey(staffId,classId),JSON.stringify(normalizeLayout(layout)));return Boolean(storage);}catch{return false;}}
export function updateLayout(layout,patch){return normalizeLayout({...layout,...patch});}
export function revealLayout(layout){return updateLayout(layout,{filter:'all',format:'all',from:'',to:'',hidden:[],collapsed:[],display:'marks'});}
const byDate=(a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id);
export function orderedAssessments(assessments,layout){
 const p=normalizeLayout(layout),rank=new Map(p.custom.map((id,i)=>[id,i]));
 return [...assessments].sort((a,b)=>p.order==='newest'?byDate(b,a):p.order==='title'?a.title.localeCompare(b.title)||byDate(a,b):p.order==='custom'?(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity)||byDate(a,b):byDate(a,b));
}
export function reorderPeers(assessments,layout,id,units=[],unitId=''){
 const p=normalizeLayout(layout),a=assessments.find(a=>a.id===id);
 if(!a)return [];
 return orderedAssessments(assessments,p).filter(x=>(!unitId||x.unitId===unitId)&&groupOf(x,p.group,units).id===groupOf(a,p.group,units).id);
}
export function moveAssessment(assessments,layout,id,delta,units=[],unitId=''){
 const ordered=orderedAssessments(assessments,layout).map(a=>a.id),peers=reorderPeers(assessments,layout,id,units,unitId).map(a=>a.id);
 const index=peers.indexOf(id),next=index+delta;
 if(index<0||next<0||next>=peers.length)return normalizeLayout(layout);
 const i=ordered.indexOf(id),j=ordered.indexOf(peers[next]);
 [ordered[i],ordered[j]]=[ordered[j],ordered[i]];
 return updateLayout(layout,{order:'custom',custom:ordered});
}
const formats={total:'Overall marks',topics:'Topic assessments',questions:'Question-level assessments'};
export function groupOf(a,group,units){
 if(group==='unit'){const u=units.find(u=>u.id===a.unitId);return {id:'unit:'+a.unitId,label:u?.title??'Other unit',sort:u?.order??999};}
 if(group==='term'){
  const y=Number(a.date.slice(0,4)),m=Number(a.date.slice(5,7)),i=m>=9?0:m<=3?1:2;
  return {id:'term:'+y+':'+i,label:(i===0?'Sep–Dec':i===1?'Jan–Mar':'Apr–Aug')+' '+y,sort:y*12+(i===0?9:i===1?1:4)};
 }
 if(group==='type')return {id:'type:'+a.mode,label:formats[a.mode]??a.mode,sort:['total','topics','questions'].indexOf(a.mode)};
 return {id:'none',label:'Assessments',sort:0};
}
export function matchesLayout(a,layout,asOf){
 return !layout.hidden.includes(a.id)&&(!layout.from||a.date>=layout.from)&&(!layout.to||a.date<=layout.to)&&
  (layout.format==='all'||layout.format===a.mode)&&
  (layout.filter==='all'||layout.filter==='counted'&&a.status==='published'&&a.includeInSummary&&a.date<=asOf||
   layout.filter==='draft'&&a.status==='draft'||layout.filter==='diagnostic'&&!a.includeInSummary||layout.filter==='future'&&a.date>asOf);
}
// The full overview remains the data scope. Layout only projects columns; never change eligible evidence.
export function projectGradebook(overview,units,layout,expanded=[],asOf='9999-12-31'){
 const p=normalizeLayout(layout),ordered=orderedAssessments(overview.assessments,p),visible=ordered.filter(a=>matchesLayout(a,p,asOf)),visibleIds=new Set(visible.map(a=>a.id)),groups=new Map();
 if(p.group==='none'){
  return {layout:p,ordered,visible,groups:[],columns:gradebookColumns({...overview,assessments:visible},expanded),shownIds:visibleIds};
 }
 for(const a of ordered){
  const g=groupOf(a,p.group,units);if(!groups.has(g.id))groups.set(g.id,{...g,all:[],visible:[]});
  const record=groups.get(g.id);record.all.push(a.id);if(visibleIds.has(a.id))record.visible.push(a);
 }
 const grouped=[...groups.values()].filter(g=>g.visible.length).sort((a,b)=>a.sort-b.sort||a.label.localeCompare(b.label));
 const shownIds=new Set(),columns=[];
 for(const g of grouped){
  g.collapsed=p.collapsed.includes(g.id);
  columns.push({kind:'group',assessment:null,item:null,group:g});
  if(!g.collapsed){for(const a of g.visible)shownIds.add(a.id);columns.push(...gradebookColumns({...overview,assessments:g.visible},expanded));}
 }
 return {layout:p,ordered,visible,groups:grouped,columns,shownIds};
}
export function groupSummary(summary,group,previews,scheme){
 const ids=new Set(group.all);
 return liveSummary({...summary,results:summary.results.filter(r=>ids.has(r.assessmentId))},previews,scheme);
}
export function targetGap(summary,grade,scheme){
 const value=gradeDistance(grade,summary.minimumGrade,scheme);
 return value===null?'—':value>0?'+'+value:String(value);
}
export function markDisplay(preview,mode,percent){
 if(preview.state==='scored'){
  if(mode==='grade')return preview.grade??'—';
  if(mode==='percent')return percent(preview.percent);
 }
 return preview.total!==null?preview.total+'/'+preview.maxMarks:preview.entered?preview.partial+'/'+preview.maxMarks:'—';
}
export function itemDisplay(mark,item,mode,percent){return mark===null||mark===undefined?'—':mode==='percent'?percent(100*mark/item.maxMarks):String(mark);}
