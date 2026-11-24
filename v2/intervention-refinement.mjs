import {CASE_ACTION_LABELS} from './interventions.mjs';
const rank={overdue:0,due:1,awaiting:2,scheduled:3};
export const CASE_FILTERS=[['active','Active'],['actions','My actions (all responsibilities)'],['due','Reviews due'],['referrals','Pending referrals'],['house','Outstanding House requests'],['study','Study plan reviews due'],['w1','Wave 1'],['w2','Wave 2'],['w3','Wave 3'],['closed','Closed'],['all','All cases']];
export const dateState=(date,asOf)=>date<asOf?'overdue':date===asOf?'due':'scheduled';
export const taskStatus=t=>t.status==='overdue'?'Overdue':t.status==='due'?'Due today':t.status==='awaiting'?'Awaiting response':'Scheduled';
export const taskOrder=(a,b)=>(rank[a.status]??9)-(rank[b.status]??9)||a.date.localeCompare(b.date)||a.type.localeCompare(b.type);
export function caseResponsibilities(c,plan,asOf,eligible,pending,staffId){
 if(c.state==='closed')return [];
 const tasks=[],active=['wave1','wave2','wave3'].includes(c.state);
 const add=(type,date,assignedId,role,dateLabel,immediate=false)=>{
  const reviewers=eligible(type),assigned=reviewers.find(p=>p.id===assignedId)??null;
  const dateStatus=dateState(date,asOf),status=dateStatus==='scheduled'&&immediate?'awaiting':dateStatus;
  tasks.push({type,label:CASE_ACTION_LABELS[type],date,dateLabel,status,role,assigned,reviewers,
   responsible:assigned?.name??(reviewers.length?reviewers.map(p=>p.name).join(', '):'No eligible reviewer recorded'),
   canAct:reviewers.some(p=>p.id===staffId),mine:pending.some(p=>p.type===type)});
 };
 if(c.state==='wave2_requested')add('activateWave2',c.reviewDate,c.wave2Referral?c.ownerStaffId:null,'Faculty lead','Case review date',true);
 if(c.state==='wave3_requested')add('respondLeadership',c.reviewDate,c.wave3Referral?c.ownerStaffId:null,'School leadership','Case review date',true);
 if(c.houseRequest&&!c.houseResponse?.complete)add('respondHouse',c.reviewDate,c.houseOwnerStaffId,'Head of House','Case review date',true);
 if(active)add('review',c.reviewDate,c.ownerStaffId,c.wave===1?'Class teacher':c.wave===2?'Faculty lead':'School leadership','Case review date');
 if(active&&plan&&!plan.completedDate)add('reviewStudyPlan',plan.reviewDate,plan.ownerStaffId,'Study plan owner','Study plan review date');
 return tasks.sort(taskOrder);
}
export function studyStatus(c,plan,asOf){
 if(!plan)return 'none';
 if(plan.completedDate)return 'achieved';
 if(c.state==='closed')return 'closed';
 if(c.state.endsWith('_requested'))return 'handover';
 return dateState(plan.reviewDate,asOf);
}
export const studyStatusLabel=status=>({none:'No plan',achieved:'Target achieved',closed:'Case closed',handover:'Awaiting activation',overdue:'Review overdue',due:'Review due today',scheduled:'Active plan'}[status]??'No plan');
export function matchesCaseFilter(c,filter){
 const active=c.state!=='closed';
 if(filter==='all')return true;
 if(filter==='closed')return !active;
 if(!active)return false;
 if(filter==='active')return true;
 if(filter==='due')return c.due;
 if(filter==='referrals')return c.state.endsWith('_requested');
 if(filter==='house')return c.tasks.some(t=>t.type==='respondHouse');
 if(filter==='study')return c.tasks.some(t=>t.type==='reviewStudyPlan'&&['due','overdue'].includes(t.status));
 return filter==='w'+c.wave;
}
export function caseCounts(cases,personal){
 return Object.fromEntries(CASE_FILTERS.map(([id])=>[id,id==='actions'?personal.length:cases.filter(c=>matchesCaseFilter(c,id)).length]));
}
export function casePriority(a,b){
 return Number(a.state==='closed')-Number(b.state==='closed')||
 (a.state==='closed'?b.updatedDate.localeCompare(a.updatedDate):
  (rank[a.tasks[0]?.status]??9)-(rank[b.tasks[0]?.status]??9)||
  (a.tasks[0]?.date??a.reviewDate).localeCompare(b.tasks[0]?.date??b.reviewDate))||
 a.studentName.localeCompare(b.studentName,'en',{numeric:true})||a.id.localeCompare(b.id);
}
export function actionPriority(a,b){
 return a.actionDate.localeCompare(b.actionDate)||a.studentName.localeCompare(b.studentName,'en',{numeric:true})||a.actionType.localeCompare(b.actionType);
}
export const reviewEvents=history=>[...history].reverse().filter(h=>['review','reviewStudyPlan'].includes(h.action));
export function wavePresentation(c,n){
 if(c.state==='closed')return n<=c.wave?'recorded':'not-reached';
 if(c.state==='wave'+n+'_requested')return 'requested';
 if(c.state==='wave'+n)return 'active';
 return c.wave>n?'recorded':'not-reached';
}
