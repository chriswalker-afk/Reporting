import {houseName} from './branding.mjs';
import {createAccess} from './access.mjs';
import {isDate,isText} from './model.mjs';

export const PRIORITIES=['normal','important','urgent'];
export const EVENTS=['Reports','SIMS grades','PTM','PTE','Moderation','Other'];
export const noticeVersion=n=>n.version??1;
export const noticeState=(n,date)=>n.archived?'archived':n.publishedDate>date?'scheduled':n.expiryDate&&n.expiryDate<date?'expired':'active';
export const safeLink=value=>{
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}
};
export function weekStart(date){
  if(!isDate(date))throw Error('Invalid briefing date');
  const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);
}
export function communicationPolicy(data,staffId){
  const access=createAccess(data,staffId);
  const audiences=[{type:'all',id:null,label:'All staff'},
    ...data.faculties.map(f=>({type:'faculty',id:f.id,label:'Faculty · '+f.name})),
    ...data.houses.map(h=>({type:'house',id:h.id,label:'House · '+houseName(h)})),
    ...data.tutorGroups.map(g=>({type:'tutorGroup',id:g.id,label:'Tutor group · '+g.name})),
    ...Array.from({length:7},(_,i)=>({type:'year',id:i+7,label:'Year '+(i+7)}))];
  const same=(a,b)=>a?.type===b?.type&&a?.id===b?.id;
  const canPublish=a=>{
    if(!audiences.some(x=>same(a,x)))return false;
    if(access.has('leadership'))return true;
    if(a.type==='faculty')return access.has('faculty')&&data.faculties.find(f=>f.id===a.id)?.headIds.includes(staffId);
    if(a.type==='house')return access.has('house')&&data.houses.find(h=>h.id===a.id)?.headIds.includes(staffId);
    if(a.type==='tutorGroup'){
      const g=data.tutorGroups.find(g=>g.id===a.id);
      return Boolean(g&&(access.has('tutor')&&g.tutorIds.includes(staffId)||access.has('house')&&data.houses.find(h=>h.id===g.houseId)?.headIds.includes(staffId)));
    }
    return false;
  };
  const canEditNotice=n=>Boolean(n&&(access.has('leadership')||n.authorStaffId===staffId&&canPublish(n.audience)));
  const recipient=a=>access.audienceMatches(a,{oversight:false});
  const canManageDeadline=()=>access.has('leadership');
  const canViewNotice=n=>Boolean(n&&(canEditNotice(n)||n.publishedDate<=data.asOf&&access.audienceMatches(n.audience)));
  const canViewDeadline=d=>Boolean(d&&(canManageDeadline()||!d.archived&&access.audienceMatches(d.audience)));
  const noticeAcknowledged=n=>(n.acknowledgements??[]).some(a=>a.staffId===staffId&&a.version===noticeVersion(n));
  const canAcknowledge=n=>Boolean(n&&noticeState(n,data.asOf)==='active'&&n.requiresAcknowledgement&&recipient(n.audience)&&!noticeAcknowledged(n));
  const deadlineCompleted=d=>(d.completions??[]).some(c=>c.staffId===staffId);
  return {audiences,publishAudiences:audiences.filter(canPublish),canPublish,canEditNotice,canViewNotice,canViewDeadline,canManageDeadline,
    recipient,noticeAcknowledged,canAcknowledge,deadlineCompleted};
}
export function communicationView(data,staffId){
  const p=communicationPolicy(data,staffId);
  const staffName=id=>data.staff.find(s=>s.id===id)?.name;
  const recipientIds=a=>data.staff.filter(s=>createAccess(data,s.id).audienceMatches(a,{oversight:false})).map(s=>s.id);
  const notices=data.notices.filter(p.canViewNotice).map(n=>{
    const recipients=n.requiresAcknowledgement?recipientIds(n.audience):[];
    const completed=new Set((n.acknowledgements??[]).filter(a=>a.version===noticeVersion(n)).map(a=>a.staffId));
    return {...n,author:staffName(n.authorStaffId),status:noticeState(n,data.asOf),week:weekStart(n.publishedDate),
      editable:p.canEditNotice(n),recipient:p.recipient(n.audience),acknowledged:p.noticeAcknowledged(n),canAcknowledge:p.canAcknowledge(n),
      acknowledgementCount:p.canEditNotice(n)&&n.requiresAcknowledgement?{done:recipients.filter(id=>completed.has(id)).length,total:recipients.length}:null};
  }).sort((a,b)=>Number(b.pinned===true)-Number(a.pinned===true)||PRIORITIES.indexOf(b.priority??'normal')-PRIORITIES.indexOf(a.priority??'normal')||b.publishedDate.localeCompare(a.publishedDate)||a.id.localeCompare(b.id));
  const deadlines=data.deadlines.filter(p.canViewDeadline).map(d=>({...d,event:d.event??'Other',
    editable:p.canManageDeadline(),recipient:p.recipient(d.audience),completed:p.deadlineCompleted(d),
    status:d.archived?'archived':p.deadlineCompleted(d)?'completed':d.dueDate<data.asOf?'overdue':d.dueDate===data.asOf?'today':'upcoming'}))
    .sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.id.localeCompare(b.id));
  return {notices,deadlines,activeNotices:notices.filter(n=>n.status==='active'),pendingAcknowledgements:notices.filter(n=>n.canAcknowledge),
    openDeadlines:deadlines.filter(d=>d.recipient&&!d.archived&&!d.completed),
    publishAudiences:p.publishAudiences,deadlineAudiences:p.canManageDeadline()?p.audiences:[],canManageDeadline:p.canManageDeadline()};
}
export function noticeFields(input){
  if(!isText(input.title)||input.title.trim().length>160||!isText(input.body)||input.body.trim().length>8000)throw Error('Enter a title (up to 160 characters) and notice text (up to 8000).');
  if(!['notice','briefing'].includes(input.kind)||!PRIORITIES.includes(input.priority))throw Error('Invalid notice type or priority.');
  if(!isDate(input.publishedDate)||input.expiryDate!==null&&(!isDate(input.expiryDate)||input.expiryDate<input.publishedDate))throw Error('Expiry must be on or after publication.');
  if(typeof input.pinned!=='boolean'||typeof input.requiresAcknowledgement!=='boolean')throw Error('Invalid notice options.');
  const links=input.links??[];
  if(!Array.isArray(links)||links.length>5||links.some(l=>typeof l!=='string'||l.length>500||!safeLink(l)))throw Error('Enter up to five valid HTTPS resource links.');
  return {title:input.title.trim(),body:input.body.trim(),kind:input.kind,priority:input.priority,
    audience:{type:input.audience.type,id:input.audience.id},publishedDate:input.publishedDate,expiryDate:input.expiryDate,
    pinned:input.pinned,requiresAcknowledgement:input.requiresAcknowledgement,links:[...links]};
}
export function deadlineFields(input){
  if(!isText(input.title)||input.title.trim().length>160||!isDate(input.dueDate)||!EVENTS.includes(input.event))throw Error('Enter a deadline title, event and valid date.');
  if(typeof input.details!=='string'||input.details.length>4000)throw Error('Deadline instructions must be text (up to 4000 characters).');
  return {title:input.title.trim(),event:input.event,dueDate:input.dueDate,details:input.details.trim(),audience:{type:input.audience.type,id:input.audience.id}};
}
