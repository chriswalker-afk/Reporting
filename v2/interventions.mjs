import {clone,isText,isDate,indexData} from './model.mjs';

export const STRATEGIES=[
 'Targeted practice','Review of worked examples','Scaffolded tasks / faded support','Differentiated success criteria',
 'Vocabulary and visual support','Extension / challenge tasks','Seating and routines','Positive feedback and rewards',
 'Model revision and study skills','Check understanding and retrieval','Contact parent / guardian through approved process',
 'Coordinate with colleagues','Subject support CCA','Other academic support'
];
export const WAVE2_TRIGGERS=[
 'Wave 1 has been ineffective after discussion with House',
 'Three related behaviour points in a half-term and Wave 1 reviewed with House',
 'Serious concern requiring early referral'
];
export const WAVE3_TRIGGERS=[
 'Wave 2 review unsuccessful','Sustained concern beyond the faculty','Wider concern identified by House','Exceptional circumstances'
];
export const REVIEW_OUTCOMES=['continue','revise','resolved'];
export const CASE_ACTION_LABELS={
 startWave1:'Start Wave 1',requestWave2:'Request Wave 2',activateWave2:'Complete Wave 2 plan',
 respondHouse:'Respond to House request',requestWave3:'Request Wave 3',respondLeadership:'Complete Wave 3 plan',
 review:'Review intervention',update:'Add progress update',saveStudyPlan:'Create / edit study plan',reviewStudyPlan:'Review study plan'
};
const need=(ok,msg)=>{if(!ok)throw Error(msg);};
const field=(v,label,max=4000)=>{need(isText(v)&&v.trim().length<=max,'Enter '+label+' (1–'+max+' characters)');return v.trim();};
const date=(v,asOf,future=false)=>{need(isDate(v)&& (future?v>asOf:v>=asOf),future?'Choose a review date after the demo reference date':'Choose a review date on or after the demo reference date');return v;};
const confirmed=input=>need(input.confirmed===true,'Confirm the handover or review outcome');
const lines=(values,label,max=20)=>{need(Array.isArray(values)&&values.length>0&&values.length<=max,label+' requires 1–'+max+' entries');return [...new Set(values.map(v=>field(v,label,300)))];};
function roles(data,c){
 const ix=indexData(data),e=ix.enrolments.get(c.enrolmentId),cls=ix.classes.get(e.classId),student=ix.students.get(e.studentId);
 const faculty=ix.faculties.get(ix.subjects.get(ix.courses.get(cls.courseId).subjectId).facultyId);
 return {e,cls,student,teachers:cls.teacherIds,faculty:faculty.headIds,house:ix.houses.get(student.houseId).headIds,
  leadership:data.staff.filter(s=>s.roles.includes('leadership')).map(s=>s.id)};
}
const chooseOwner=(ids,id,label)=>{need(ids.length>0,'No '+label+' assigned in this demo');need(!id||ids.includes(id),'Choose an assigned '+label);return id||ids[0];};
function record(c,data,staffId,action,text,details={}){
 c.updatedDate=data.asOf;
 c.history.push({actorStaffId:staffId,date:data.asOf,action,text,...details});
}
function referral(data,c,staffId,input,wave){
 confirmed(input);
 const trigger=field(input.trigger,'referral trigger',250);
 need((wave===2?WAVE2_TRIGGERS:WAVE3_TRIGGERS).includes(trigger),'Choose a valid referral trigger');
 const reason=field(input.reason,'referral evidence and reason'),r=roles(data,c);
 const ownerStaffId=chooseOwner(wave===2?r.faculty:r.leadership,input.ownerStaffId,wave===2?'faculty lead':'leadership reviewer');
 const request={trigger,reason,requestedBy:staffId,date:data.asOf,ownerStaffId};
 c['wave'+wave+'Referral']=request;c.state='wave'+wave+'_requested';c.wave=wave;c.ownerStaffId=ownerStaffId;c.reviewDate=date(input.reviewDate,data.asOf);
 record(c,data,staffId,'requestWave'+wave,'Wave '+wave+' requested: '+trigger+' — '+reason,{referral:clone(request),reviewDate:c.reviewDate});
}
export function startCase(data,access,staffId,id,enrolmentId,input){
 need(access.canStartWave1(enrolmentId),'Only an assigned class teacher can start Wave 1');
 need(!data.interventions.some(c=>c.enrolmentId===enrolmentId&&c.state!=='closed'),'An active subject intervention already exists; open that case instead');
 const c={id,enrolmentId,ownerStaffId:staffId,state:'wave1',wave:1,reason:field(input.reason,'academic concern'),
  strategies:lines(input.strategies,'Classroom strategies'),wave1Plan:field(input.plan,'specific classroom intervention and success measure'),
  openedDate:data.asOf,updatedDate:data.asOf,reviewDate:date(input.reviewDate,data.asOf),evaluation:null,
  facultyPlan:null,houseRequest:null,houseResponse:null,leadershipPlan:null,history:[]};
 need(c.strategies.every(s=>STRATEGIES.includes(s)),'Choose valid classroom strategies');
 record(c,data,staffId,'startWave1','Wave 1 opened.',{plan:c.wave1Plan,strategies:[...c.strategies],reviewDate:c.reviewDate});
 if(input.directReferral===true){
  need(input.trigger===WAVE2_TRIGGERS[2],'Direct Wave 2 referral is reserved for a serious concern');
  referral(data,c,staffId,{...input,reason:input.referralReason},2);
 }
 data.interventions.push(c);return {before:null,after:c};
}
export function changeCase(data,access,staffId,id,action,input){
 const c=data.interventions.find(c=>c.id===id);
 need(c&&access.caseActions(id).includes(action)&&action!=='view'&&!['saveStudyPlan','reviewStudyPlan'].includes(action),'Action not permitted for your role or this case stage');
 const before=clone(c),r=roles(data,c);
 if(action==='requestWave2'||action==='requestWave3'){
  referral(data,c,staffId,input,action==='requestWave2'?2:3);
 }else if(action==='activateWave2'){
  confirmed(input);c.facultyPlan=field(input.plan,'faculty intervention plan and success measure');
  c.houseRequest=field(input.houseRequest,'specific House support request');
  c.houseOwnerStaffId=chooseOwner(r.house,input.houseOwnerStaffId,'Head of House');
  c.houseResponse=null;c.state='wave2';c.ownerStaffId=staffId;c.reviewDate=date(input.reviewDate,data.asOf);
  record(c,data,staffId,action,'Wave 2 activated. House support requested.',{plan:c.facultyPlan,houseRequest:c.houseRequest,houseOwnerStaffId:c.houseOwnerStaffId,reviewDate:c.reviewDate});
 }else if(action==='respondHouse'){
  need(isText(c.houseRequest),'No House request is outstanding');
  const response=field(input.response,'House response and agreed actions');
  need(typeof input.complete==='boolean','Choose whether the House request is complete');
  c.houseResponse={response,complete:input.complete,actorStaffId:staffId,date:data.asOf};
  record(c,data,staffId,action,'House response: '+response+(input.complete?' (request completed)':' (further action pending)'),{houseResponse:clone(c.houseResponse)});
 }else if(action==='respondLeadership'){
  confirmed(input);c.leadershipPlan=field(input.plan,'leadership intervention plan and success measure');
  c.state='wave3';c.ownerStaffId=staffId;c.reviewDate=date(input.reviewDate,data.asOf);
  record(c,data,staffId,action,'Wave 3 activated.',{plan:c.leadershipPlan,reviewDate:c.reviewDate});
 }else if(action==='review'){
  confirmed(input);const evaluation=field(input.evaluation,'review evidence and evaluation');
  need(REVIEW_OUTCOMES.includes(input.outcome),'Choose a review outcome');
  c.evaluation=evaluation;
  if(input.outcome==='resolved'){
   need(!c.houseRequest||c.houseResponse?.complete===true,'Complete the outstanding House request before closing this case');
   c.state='closed';c.closedDate=data.asOf;c.closedBy=staffId;
   record(c,data,staffId,action,'Resolved and closed: '+evaluation,{outcome:'resolved'});
  }else{
   c.reviewDate=date(input.reviewDate,data.asOf,true);
   if(input.outcome==='revise'){
    const plan=field(input.plan,'revised intervention and success measure');
    const key=c.wave===1?'wave1Plan':c.wave===2?'facultyPlan':'leadershipPlan';c[key]=plan;
   }
   record(c,data,staffId,action,(input.outcome==='revise'?'Revised plan: ':'Continue intervention: ')+evaluation,{outcome:input.outcome,reviewDate:c.reviewDate,plan:input.outcome==='revise'?input.plan.trim():null});
  }
 }else if(action==='update'){
  record(c,data,staffId,action,'Progress update: '+field(input.text,'academic progress update'));
 }else throw Error('Unknown intervention action');
 return {before,after:c};
}
export function changeStudyPlan(data,access,staffId,caseId,id,action,input){
 const c=data.interventions.find(c=>c.id===caseId);
 need(c&&['saveStudyPlan','reviewStudyPlan'].includes(action)&&access.caseActions(caseId).includes(action),'Study plan action not permitted for your role or this case stage');
 const old=data.studyPlans.find(p=>p.interventionId===caseId);
 need(action!=='reviewStudyPlan'||old,'No study plan to review');
 const before={case:clone(c),plan:old?clone(old):null};
 let plan=old;
 if(action==='saveStudyPlan'){
  const fields={target:field(input.target,'specific measurable study target',1000),actions:lines(input.actions,'Study actions',12),
   reviewDate:date(input.reviewDate,data.asOf),ownerStaffId:old?.ownerStaffId??staffId};
  if(old){Object.assign(old,fields);old.updatedDate=data.asOf;}
  else{plan={id,interventionId:caseId,...fields,createdDate:data.asOf,updatedDate:data.asOf,history:[]};data.studyPlans.push(plan);}
  record(c,data,staffId,action,old?'Individual study plan updated.':'Individual study plan created.',{studyPlan:clone(fields)});
 }else{
  confirmed(input);
  const evaluation=field(input.evaluation,'study plan evaluation');
  need(['continue','revise','achieved'].includes(input.outcome),'Choose a study plan review outcome');
  if(input.outcome==='revise'){
   plan.target=field(input.target,'revised measurable study target',1000);plan.actions=lines(input.actions,'Revised study actions',12);
  }
  if(input.outcome==='achieved'){plan.completedDate=data.asOf;}
  else{plan.reviewDate=date(input.reviewDate,data.asOf,true);plan.completedDate=null;}
  plan.evaluation=evaluation;plan.updatedDate=data.asOf;
  (plan.history??=[]).push({actorStaffId:staffId,date:data.asOf,outcome:input.outcome,text:evaluation});
  record(c,data,staffId,action,'Study plan review ('+input.outcome+'): '+evaluation,{studyPlanId:plan.id,outcome:input.outcome});
 }
 return {before,after:{case:c,plan}};
}
export function pendingCaseActions(data,access,c){
 const permitted=access.caseActions(c.id),out=[];
 const add=(type,reviewDate=c.reviewDate)=>{if(permitted.includes(type))out.push({caseId:c.id,type,reviewDate});};
 if(c.state==='wave2_requested')add('activateWave2');
 if(c.state==='wave3_requested')add('respondLeadership');
 if(c.houseRequest&&!c.houseResponse?.complete)add('respondHouse');
 if(c.reviewDate<=data.asOf)add('review');
 const plan=data.studyPlans.find(p=>p.interventionId===c.id);
 if(plan&&!plan.completedDate&&plan.reviewDate<=data.asOf)add('reviewStudyPlan',plan.reviewDate);
 return out;
}
