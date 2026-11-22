/* Fictional SOC workflow model. No persistence or real case management. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.SchoolHubData&&root.SchoolHubAccess)root.SchoolHubSupport=api.createService(root.SchoolHubData,root.SchoolHubAccess);
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const strategies={
  wave1:[
   {group:'Scaffolding',name:'Scaffolded practice with gradual removal of support'},
   {group:'Scaffolding',name:'RAG differentiated tasks and targeted practice'},
   {group:'Scaffolding',name:'Short fluency and retrieval activities'},
   {group:'EAL',name:'Mathematical vocabulary lists or dictionaries'},
   {group:'EAL',name:'Visual examples using GeoGebra or Desmos'},
   {group:'Motivation',name:'Agreed seating plan and success criteria'},
   {group:'Motivation',name:'Short self-assessing activities and feedback'},
   {group:'Study skills',name:'Retrospective revision timetable and study modelling'},
   {group:'Study skills',name:'Metacognitive review and improvement time'},
   {group:'Challenge',name:'Extension tasks with NRICH or UKMT problems'}
  ],
  wave2:[
   {group:'Faculty',name:'Maths support CCA or subject support session'},
   {group:'Faculty',name:'Focused faculty intervention with a review deadline'},
   {group:'Faculty',name:'Faculty detention where school policy permits'},
   {group:'Coordination',name:'Parent meeting after discussion with Housemaster/mistress'},
   {group:'Coordination',name:'Teacher / key-stage coordinator joint action plan'},
   {group:'Coordination',name:'Additional classroom adaptations with tracked outcomes'}
  ],
  triggers:['Wave 1 has not improved the situation','Three related SIMS behaviour points in a half term',
    'A singular more serious concern','Another documented concern']
 };
 const states={wave1:'Wave 1 · Classroom',wave2_requested:'Wave 2 · Awaiting HoF',
   wave2:'Wave 2 · Faculty & House',wave3_requested:'Wave 3 · Awaiting SLT',
   wave3:'Wave 3 · Leadership',closed:'Closed'};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const today='22 Nov 2026';
 function createService(data,access){
  const cases=[];
  let caseSerial=0,eventSerial=0;
  const findStudent=id=>data.students.find(s=>s.id===id);
  const findClass=id=>data.classes.find(c=>c.id===id);
  const findCase=id=>cases.find(x=>x.id===id);
  const activeFor=(studentId,classId)=>cases.find(c=>c.studentId===studentId&&
      (!classId||c.classId===classId)&&c.state!=='closed');
  const classCases=id=>cases.filter(c=>c.classId===id);
  const visible=(user)=>cases.filter(c=>access.canViewCase(user,c,findStudent(c.studentId),findClass(c.classId)));
  function history(c,actor,type,text){
    c.history.push({id:'H'+(++eventSerial),date:today,actor:actor.name,roles:actor.roles.join(' + '),
       type,text});
    c.updatedAt=today;
  }
  function make(seed){
    const id='SOC-'+(++caseSerial).toString().padStart(3,'0');
    const c={id,studentId:seed.studentId,classId:seed.classId,wave:seed.wave||1,
      state:seed.state||'wave1',openedAt:'18 Nov 2026',updatedAt:'18 Nov 2026',
      wave1:{focus:seed.focus||'',strategies:seed.strategies||[],description:seed.description||'',
        reviewDate:seed.reviewDate||'2026-12-02'},
      wave2:seed.wave2||null,wave3:seed.wave3||null,
      requestReason:seed.requestReason||'',requestTrigger:seed.requestTrigger||'',
      houseResponse:seed.houseResponse||null,
      reviews:seed.reviews||[],history:[]};
    cases.push(c);
    history(c,{name:'Demo teacher',roles:['teacher']},'wave1','Class teacher recorded Wave 1: '+c.wave1.focus);
    if(c.wave>=2)history(c,{name:'Demo teacher',roles:['teacher']},'requested','Wave 2 requested for faculty review.');
    if(c.state==='wave2'||c.wave===3)history(c,{name:'Demo Head of Faculty',roles:['faculty']},'wave2','Faculty and House intervention plan recorded.');
    if(c.wave>=3)history(c,{name:'Demo Head of Faculty',roles:['faculty']},'requested','Wave 3 escalated to School Leadership.');
    return c;
  }
  make({studentId:'S002',classId:'11MA1',focus:'Accuracy in algebraic manipulation',description:'Weekly short algebra questions and immediate feedback.',
    strategies:['Scaffolded practice with gradual removal of support','Short fluency and retrieval activities'],
    reviewDate:'2026-12-01'});
  make({studentId:'S004',classId:'11MA1',state:'wave2_requested',wave:2,focus:'Multi-step problem solving and class engagement',
    strategies:['RAG differentiated tasks and targeted practice','Agreed seating plan and success criteria'],
    description:'Focused class support with a check after two weeks.',reviewDate:'2026-11-22',
    requestReason:'Wave 1 approaches have not produced sustained improvement.',
    requestTrigger:'Wave 1 has not improved the situation'});
  make({studentId:'S011',classId:'10MA2',state:'wave2',wave:2,focus:'Incomplete tasks and patchy revision',
    strategies:['Retrospective revision timetable and study modelling'],
    description:'Review task completion and model study planning.',reviewDate:'2026-11-20',
    requestReason:'Repeated difficulty completing follow-up tasks.',
    wave2:{plan:'Weekly progress check with key-stage coordinator.',
      strategies:['Maths support CCA or subject support session'],
      houseRequest:'Please contact the tutor, agree a supported homework routine and record any relevant house-level information.',
      reviewDate:'2026-12-04'},houseResponse:null});
  make({studentId:'S008',classId:'12MA1',state:'wave3_requested',wave:3,focus:'Continuing gaps in prerequisite algebra',
    strategies:['Scaffolded practice with gradual removal of support'],
    description:'Short targeted practice and revision planning.',reviewDate:'2026-11-10',
    requestReason:'No sustained improvement after Wave 1.',
    wave2:{plan:'Subject support CCA, faculty review and a progress check.',
      strategies:['Maths support CCA or subject support session'],
      houseRequest:'Discuss wider barriers to study and agree coordination with the tutor.',
      reviewDate:'2026-11-19'},
    houseResponse:{response:'House support routine agreed with tutor.',complete:true,at:'18 Nov 2026'},
    wave3:{reason:'Faculty and house interventions have not yet resulted in sustained improvement.',
      plan:'',reviewDate:''}});
  make({studentId:'S018',classId:'10SC1',state:'wave1',wave:1,
    focus:'Confidence with scientific vocabulary',description:'Use visual glossaries and small practice tasks.',
    strategies:['Mathematical vocabulary lists or dictionaries'],reviewDate:'2026-12-02'});

  function failure(message){return {ok:false,error:message};}
  function success(c,message){return {ok:true,case:c,message};}
  function required(x){return String(x||'').trim();}
  function validateDate(x){return /^\d{4}-\d\d-\d\d$/.test(x)&&!Number.isNaN(new Date(x+'T00:00:00').getTime());}
  function assertCase(id,user){
    const c=findCase(id),s=c&&findStudent(c.studentId),group=c&&findClass(c.classId);
    if(!c||!s||!group)return {error:'Intervention not found.'};
    if(!access.canViewCase(user,c,s,group))return {error:'This intervention is not in your authorised demo scope.'};
    return {c,s,group};
  }
  function startWave1(user,studentId,classId,details){
    const s=findStudent(studentId),group=findClass(classId);
    if(!s||!group||s.classId!==classId)return failure('Choose a student in the selected class.');
    if(!access.canStartWave1(user,group))return failure('Only the class teacher can start Wave 1 for this class.');
    if(activeFor(studentId,classId))return failure('An active intervention already exists for this student and subject.');
    if(!required(details.focus)||!required(details.description)||!validateDate(details.reviewDate))
      return failure('Complete the specific concern, planned support and review date.');
    const c=make({studentId,classId,focus:required(details.focus),description:required(details.description),
      strategies:clone(details.strategies||[]),reviewDate:details.reviewDate});
    c.history=[];history(c,user,'wave1','Wave 1 started: '+c.wave1.focus+'. Plan: '+c.wave1.description);
    return success(c,'Wave 1 intervention recorded');
  }
  function requestWave2(user,id,details){
    const {c,group,error}=assertCase(id,user);if(error)return failure(error);
    if(!access.canRequestWave2(user,c,group))return failure('Only the relevant class teacher can request Wave 2 from Wave 1.');
    if(!required(details.reason)||!strategies.triggers.includes(details.trigger))return failure('Choose a reason and explain why Wave 2 is needed.');
    c.requestReason=required(details.reason);c.requestTrigger=details.trigger;c.state='wave2_requested';c.wave=2;
    history(c,user,'requested','Wave 2 requested: '+details.trigger+'. '+c.requestReason);
    return success(c,'Wave 2 request sent to the relevant Head of Faculty (demo)');
  }
  function activateWave2(user,id,details){
    const {c,group,error}=assertCase(id,user);if(error)return failure(error);
    if(!access.canActivateWave2(user,c,group))return failure('Only the relevant Head of Faculty can activate Wave 2.');
    if(!required(details.plan)||!required(details.houseRequest)||!validateDate(details.reviewDate))
      return failure('Record the faculty intervention, a specific House action request and a review date.');
    c.wave2={plan:required(details.plan),strategies:clone(details.strategies||[]),
      houseRequest:required(details.houseRequest),reviewDate:details.reviewDate};
    c.houseResponse=null;c.state='wave2';c.wave=2;
    history(c,user,'wave2','Wave 2 activated. Faculty plan: '+c.wave2.plan+' House request: '+c.wave2.houseRequest);
    return success(c,'Faculty and House actions recorded (demo)');
  }
  function respondHouse(user,id,details){
    const {c,s,error}=assertCase(id,user);if(error)return failure(error);
    if(!access.canRespondHouse(user,c,s))return failure('Only the assigned Housemaster or Housemistress can update house actions.');
    if(!required(details.response))return failure('Record the House response or actions taken.');
    c.houseResponse={response:required(details.response),complete:Boolean(details.complete),at:today};
    history(c,user,'house','House response: '+c.houseResponse.response);
    return success(c,'House action updated');
  }
  function requestWave3(user,id,details){
    const {c,s,group,error}=assertCase(id,user);if(error)return failure(error);
    if(!access.canEscalateWave3(user,c,s,group))return failure('Wave 3 can be requested by the relevant Head of Faculty or Housemaster/mistress from an active Wave 2 case.');
    if(!required(details.reason))return failure('A reason for escalation is required.');
    c.wave3={reason:required(details.reason),plan:'',reviewDate:''};
    c.state='wave3_requested';c.wave=3;
    history(c,user,'requested','Escalated to School Leadership: '+c.wave3.reason);
    return success(c,'Wave 3 escalation sent to School Leadership (demo)');
  }
  function respondLeadership(user,id,details){
    const {c,error}=assertCase(id,user);if(error)return failure(error);
    if(!access.canRespondLeadership(user,c))return failure('Only a School Leadership role can record the Wave 3 plan.');
    if(!required(details.plan)||!validateDate(details.reviewDate))return failure('Record a leadership intervention and review date.');
    c.wave3={...c.wave3,plan:required(details.plan),reviewDate:details.reviewDate};
    c.state='wave3';c.wave=3;
    history(c,user,'wave3','Leadership plan recorded: '+c.wave3.plan);
    return success(c,'Leadership plan recorded');
  }
  function review(user,id,details){
    const {c,s,group,error}=assertCase(id,user);if(error)return failure(error);
    if(!access.canAddUpdate(user,c,s,group))return failure('You cannot update this case.');
    if(!required(details.note)||!['Improving','No improvement','Further monitoring','Resolved'].includes(details.outcome))
      return failure('Add a factual update and select a review outcome.');
    c.reviews.push({actor:user.name,date:today,outcome:details.outcome,note:required(details.note)});
    history(c,user,'review','Review: '+details.outcome+'. '+required(details.note));
    if(details.outcome==='Resolved'&&details.close===true){c.state='closed';history(c,user,'closed','Intervention closed after review.');}
    return success(c,'Review recorded');
  }
  function queues(user){
    return visible(user).flatMap(c=>{
      const s=findStudent(c.studentId),g=findClass(c.classId);let title='',action='';
      if(c.state==='wave2_requested'&&access.canActivateWave2(user,c,g)){
        title='Wave 2 faculty plan required';action='activateWave2';
      }else if(c.state==='wave2'&&(!c.houseResponse||!c.houseResponse.complete)&&access.canRespondHouse(user,c,s)){
        title='House action requested';action='respondHouse';
      }else if(c.state==='wave3_requested'&&access.canRespondLeadership(user,c)){
        title='Wave 3 leadership decision required';action='respondLeadership';
      }else if(c.state==='wave1'&&access.canRequestWave2(user,c,g)){
        title='Wave 1 review';action='review';
      }else if(c.state==='wave2'&&access.canEscalateWave3(user,c,s,g)){
        title='Wave 2 progress review';action='review';
      }
      return title?[{caseId:c.id,title,studentId:s.id,student:s.name,classId:g.id,action,stage:c.state}]:[];
    });
  }
  return {states,strategies,cases,findCase,activeFor,classCases,visible,queues,
    startWave1,requestWave2,activateWave2,respondHouse,requestWave3,respondLeadership,review};
 }
 return {createService,strategies,states};
});
