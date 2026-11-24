import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionNoticeboard,priorityNotice,communicationHighlights} from '../v2/communication-layout.mjs';
import {createStore} from '../v2/store.mjs';
import {createWorkspace} from '../v2/workspace.mjs';
import {renderPage} from '../v2/views.mjs';
import {homeDashboard} from '../v2/home-dashboard.mjs';
const state={page:'notices',query:'',sorts:{},noticeFilter:'active',deadlineFilter:'open'};
const w=(s,id='sam',scope='faculty')=>createWorkspace(s,id,scope);
const notice=(title,extra={})=>({title,body:'Fictional staff communication',kind:'notice',priority:'normal',audience:{type:'faculty',id:'mathematics'},publishedDate:'2026-11-24',expiryDate:null,pinned:false,requiresAcknowledgement:false,links:[],...extra});
test('priority partition is exclusive, keeps archived records out of the action section and sorts urgency first',()=>{
 const list=[{id:'pinned',pinned:true},{id:'pending',canAcknowledge:true,kind:'briefing'},{id:'urgent',priority:'urgent'},{id:'archive',priority:'urgent',status:'archived'},{id:'normal-brief',kind:'briefing'}].map(n=>({status:'active',publishedDate:'2026-11-24',kind:'notice',priority:'normal',...n}));
 const p=partitionNoticeboard(list);
 assert.deepEqual(p.priority.map(n=>n.id),['urgent','pending']);
 assert.deepEqual(p.board.map(n=>n.id),['pinned','archive']);
 assert.deepEqual(p.briefings.map(n=>n.id),['normal-brief']);
 assert.equal(new Set([...p.priority,...p.board,...p.briefings].map(n=>n.id)).size,list.length);
 assert.equal(priorityNotice(list[3]),false);
});
test('priority board and Home retain authorised urgent information and pending acknowledgements',()=>{
 const s=createStore();
 s.saveNotice('sam',null,notice('Urgent information',{priority:'urgent'}));
 s.saveNotice('sam',null,notice('Required weekly briefing',{kind:'briefing',requiresAcknowledgement:true}));
 const a=w(s),comm=a.communications(),highlights=communicationHighlights(comm),n=comm.notices.find(n=>n.title==='Required weekly briefing');
 assert.ok(n.canAcknowledge);
 assert.ok(highlights.priority.some(n=>n.title==='Urgent information'));
 const board=renderPage(a,state),ids=[...board.matchAll(/data-notice-id="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,comm.activeNotices.length);assert.equal(new Set(ids).size,ids.length);
 assert.match(board,/Priority notices/);assert.match(board,/Briefing week/);
 const filtered=renderPage(a,{...state,noticeFilter:'priority'});
 assert.equal((filtered.match(/data-notice-id="/g)||[]).length,highlights.priority.length);
 assert.match(filtered,/Urgent information/);
 const home=renderPage(a,{...state,page:'home'});
 assert.match(home,/Urgent information/);assert.match(home,/Required weekly briefing/);
 assert.ok(home.indexOf('id="attention-panel"')<home.indexOf('data-workspace-disclosure="home-academic-summary"'));
 assert.ok(home.indexOf('class="home-reporting"')<home.indexOf('data-workspace-disclosure="home-cohort"'));
 assert.match(home,/reporting-priority-summary/);
 const outsider=s.snapshot().staff.find(p=>!createWorkspace(s,p.id).communications().notices.some(x=>x.id===n.id));
 assert.ok(outsider);assert.doesNotMatch(renderPage(createWorkspace(s,outsider.id),state),/Required weekly briefing/);
 s.acknowledgeNotice('sam',n.id);
 const after=w(s).communications();assert.equal(communicationHighlights(after).pending,highlights.pending-1);
 assert.ok(!partitionNoticeboard(after.activeNotices).priority.some(x=>x.id===n.id));
 assert.ok(partitionNoticeboard(after.activeNotices).briefings.some(x=>x.id===n.id));
});
test('deadline highlights and reporting labels agree with accessible personal and leadership records',()=>{
 const s=createStore(),a=w(s),d=homeDashboard(a),highlights=communicationHighlights(a.communications());
 assert.equal(highlights.overdue,a.communications().openDeadlines.filter(x=>x.status==='overdue').length);
 assert.equal(d.reportingOverdue,highlights.overdue);
 assert.equal(d.reportingToday,highlights.today);
 const school=w(s,'avery','school'),all=communicationHighlights(school.communications());
 assert.ok(all.open.length>=school.communications().openDeadlines.length);
 const html=renderPage(school,state);
 assert.match(html,/reporting-responsive-table/);
 assert.match(html,/schedule-mobile-label/);
 assert.match(html,/Oversight/);
 assert.match(html,/Overdue/);
 assert.match(html,/data-action="new-deadline"/);
 assert.doesNotMatch(renderPage(a,state),/data-action="new-deadline"/);
});


test('notices header presents live authorised counts and every shortcut exactly once without duplicate cards',()=>{
 const store=createStore();
 for(const staff of store.snapshot().staff){
  const workspace=createWorkspace(store,staff.id),comm=workspace.communications(),h=communicationHighlights(comm);
  const html=renderPage(workspace,state);
  const header=html.match(/<section class="surface communication-priority notices-header"[\s\S]*?<\/section>/)?.[0];
  assert.ok(header,staff.id);
  assert.match(header,/<h1>Notices<\/h1>/);
  assert.doesNotMatch(html,/data-workspace-disclosure="communication-summary"|class="metrics communication-metrics"/);
  for(const [action,value,label] of [
   ['show-active-notices',comm.activeNotices.length,'active notices'],
   ['show-priority-notices',h.urgent,'urgent'],
   ['show-pending-notices',h.pending,'awaiting acknowledgement'],
   ['focus-schedule',h.open.length,'open deadlines']
  ]){
   assert.equal((header.match(new RegExp('data-action="'+action+'"','g'))||[]).length,1);
   assert.ok(header.includes('<strong>'+value+'</strong> '+label),staff.id+': '+label);
  }
  assert.ok(header.includes('<strong>'+h.overdue+'</strong> overdue'));
  assert.ok(header.includes('<strong>'+h.today+'</strong> due today'));
  if(h.open.length!==comm.openDeadlines.length)assert.ok(header.includes('<strong>'+comm.openDeadlines.length+'</strong> yours'));
  assert.equal(header.includes('data-action="new-notice"'),Boolean(comm.publishAudiences.length));
 }
});
