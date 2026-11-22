/* Fictional demo identity + additive role scopes.
 * UI-only permission simulation: never a substitute for server-authorised RBAC/ABAC. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SchoolHubAccess=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const profiles=[
    {id:'sam',name:'Sam Taylor',initials:'ST',roles:['teacher','faculty'],
     taughtClasses:['11MA1','12MA1'],tutorGroupIds:['11A'],faculties:['Mathematics'],houses:['Willow']},
    {id:'jordan',name:'Jordan Evans',initials:'JE',roles:['teacher'],
     taughtClasses:['10MA2'],tutorGroupIds:['10B'],faculties:['Mathematics'],houses:['Oak']},
    {id:'morgan',name:'Morgan Lee',initials:'ML',roles:['teacher','house'],
     taughtClasses:['10SC1'],tutorGroupIds:['10A'],faculties:['Science'],houses:['Willow']},
    {id:'priya',name:'Priya Nair',initials:'PN',roles:['teacher','leadership'],
     taughtClasses:['11EN1'],tutorGroupIds:['11C'],faculties:['English'],houses:['Cedar']}
  ];
  const labels={teacher:'Teacher',faculty:'Head of Faculty / Department',
    house:'Housemaster / Housemistress',leadership:'School Leadership'};
  let activeId='sam';
  let enabled=['teacher','faculty'];
  const allRoles=Object.keys(labels);
  const clone=o=>JSON.parse(JSON.stringify(o));
  function select(id){const p=profiles.find(p=>p.id===id);if(!p)return false;activeId=p.id;enabled=[...p.roles];return true;}
  function toggleRole(role){
    if(!allRoles.includes(role))return false;
    if(enabled.includes(role)){if(enabled.length===1)return false;enabled=enabled.filter(r=>r!==role);}
    else enabled.push(role);
    return true;
  }
  function viewer(){return {...clone(profiles.find(p=>p.id===activeId)),roles:[...enabled]};}
  function has(v,role){return !!v?.roles?.includes(role);}
  const classOwned=(v,c)=>has(v,'teacher')&&v.taughtClasses?.includes(c.id);
  const facultyOwned=(v,c)=>has(v,'faculty')&&v.faculties?.includes(c.faculty);
  function canViewClass(v,c){return Boolean(c&&(classOwned(v,c)||facultyOwned(v,c)||has(v,'house')||has(v,'leadership')));}
  function canEditAssessment(v,c){return Boolean(c&&classOwned(v,c));}
  function visibleClasses(v,classes){return classes.filter(c=>canViewClass(v,c));}
  function isTutorOf(v,s){
    return Boolean(s && has(v,'teacher') && v.tutorGroupIds?.includes(s.tutorGroupId));
  }
  function canViewStudent(v,s,classes){
    if(!s)return false;
    return !!(isTutorOf(v,s) || canViewClass(v,classes.find(c=>c.id===s.classId)));
  }
  function canViewCase(v,incident,student,group){
    if(!incident||!student||!group)return false;
    return has(v,'leadership')||
      classOwned(v,group)||
      facultyOwned(v,group)||
      (has(v,'house')&&v.houses?.includes(student.house))||
      (incident.wave>=2&&isTutorOf(v,student));
  }
  function canStartWave1(v,group){return classOwned(v,group);}
  function canRequestWave2(v,incident,group){return !!(incident&&incident.state==='wave1'&&classOwned(v,group));}
  function canActivateWave2(v,incident,group){return !!(incident&&incident.state==='wave2_requested'&&facultyOwned(v,group));}
  function canRespondHouse(v,incident,student){return !!(incident&&['wave2','wave3_requested','wave3'].includes(incident.state)&&
     has(v,'house')&&v.houses?.includes(student?.house));}
  function canEscalateWave3(v,incident,student,group){return !!(incident&&incident.state==='wave2'&&
    (facultyOwned(v,group)||(has(v,'house')&&v.houses?.includes(student?.house))));}
  function canRespondLeadership(v,incident){return !!(incident&&['wave3_requested','wave3'].includes(incident.state)&&has(v,'leadership'));}
  function canAddUpdate(v,incident,student,group){
    return canViewCase(v,incident,student,group)&&
      (classOwned(v,group)||facultyOwned(v,group)||has(v,'leadership')||(has(v,'house')&&v.houses?.includes(student.house)));
  }
  function roleSummary(v){return v.roles.map(r=>labels[r]).join(' + ');}
  return {profiles,labels,select,toggleRole,viewer,has,isTutorOf,classOwned,facultyOwned,canViewClass,
    canEditAssessment,visibleClasses,canViewStudent,canViewCase,canStartWave1,
    canRequestWave2,canActivateWave2,canRespondHouse,canEscalateWave3,canRespondLeadership,canAddUpdate,roleSummary};
});
