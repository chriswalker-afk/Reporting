// Work only with records already authorised by communicationView.
export const priorityNotice=n=>n.status==='active'&&(n.priority==='urgent'||n.canAcknowledge);
export const noticePriority=(a,b)=>Number(b.priority==='urgent')-Number(a.priority==='urgent')||Number(Boolean(b.canAcknowledge))-Number(Boolean(a.canAcknowledge))||Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||b.publishedDate.localeCompare(a.publishedDate)||a.id.localeCompare(b.id);
export function partitionNoticeboard(notices){
 const priority=notices.filter(priorityNotice).sort(noticePriority),ids=new Set(priority.map(n=>n.id));
 const other=notices.filter(n=>!ids.has(n.id));
 return {priority,board:other.filter(n=>n.kind==='notice'),briefings:other.filter(n=>n.kind==='briefing')};
}
export function communicationHighlights(comm){
 const priority=comm.activeNotices.filter(priorityNotice).sort(noticePriority);
 const open=comm.deadlines.filter(d=>!d.archived&&!d.completed&&(d.recipient||comm.canManageDeadline));
 return {priority,urgent:priority.filter(n=>n.priority==='urgent').length,pending:comm.pendingAcknowledgements.length,
  open,overdue:open.filter(d=>d.status==='overdue').length,today:open.filter(d=>d.status==='today').length};
}
