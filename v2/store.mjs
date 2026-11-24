import {assertData,clone,SCHEMA_VERSION,resultKey,isText,isDate} from './model.mjs';
import {createAccess} from './access.mjs';
import {createAnalytics} from './analytics.mjs';
import {createDemoData} from './demo-data.mjs';

export const STORAGE_KEY='jis-hub-v2-synthetic-schema-'+SCHEMA_VERSION;

/** A fresh permission-filtered read model, intended for all V2 screens. */
export function createReadModel(data,staffId){
  const access=createAccess(data,staffId),analytics=createAnalytics(data);
  const byId=(table,id)=>data[table].find(r=>r.id===id);
  const visibleCaseIds=data.interventions.filter(c=>access.canViewCase(c.id)).map(c=>c.id);
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  function cohort(scope='accessible',options={}){
    const enrolmentIds=access.scopeEnrolments(scope);
    const es=new Set(enrolmentIds);
    const cases=data.interventions.filter(c=>es.has(c.enrolmentId)&&access.canViewCase(c.id)).map(c=>c.id);
    return {...analytics.cohortSummary(enrolmentIds,options),interventions:analytics.interventionSummary(cases)};
  }
  function home(scope='accessible',options={}){
    const es=new Set(access.scopeEnrolments(scope));
    const cases=data.interventions.filter(c=>es.has(c.enrolmentId)&&access.canViewCase(c.id));
    const actions=cases.flatMap(c=>{
      const acts=access.caseActions(c.id),action=[];
      if(c.state==='wave2_requested'&&acts.includes('activateWave2'))action.push('activateWave2');
      if(c.state==='wave2'&&c.houseRequest&&!c.houseResponse?.complete&&acts.includes('respondHouse'))action.push('respondHouse');
      if(c.state==='wave3_requested'&&acts.includes('respondLeadership'))action.push('respondLeadership');
      if(c.reviewDate<=data.asOf&&acts.includes('review'))action.push('review');
      return action.map(type=>({caseId:c.id,type,reviewDate:c.reviewDate}));
    });
    return {scope,cohort:cohort(scope,options),actions,
      notices:data.notices.filter(n=>access.audienceMatches(n.audience)&&n.publishedDate<=data.asOf&&(!n.expiryDate||n.expiryDate>=data.asOf)),
      deadlines:data.deadlines.filter(d=>access.audienceMatches(d.audience)&&d.dueDate>=data.asOf).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))};
  }
  function student(studentId,options={}){
    assert(access.canViewStudent(studentId),'Student outside current demo scope');
    const enrolmentIds=access.scopeEnrolments();
    return {student:byId('students',studentId),
      subjects:analytics.studentOverview(studentId,{...options,enrolmentIds}),
      cases:data.interventions.filter(c=>access.canViewCase(c.id)&&byId('enrolments',c.enrolmentId)?.studentId===studentId),
      notes:data.notes.filter(n=>access.canViewNote(n.id)&&byId('enrolments',n.enrolmentId)?.studentId===studentId)};
  }
  function classSummary(classId,options={}){
    assert(access.canViewClass(classId),'Class outside current demo scope');
    return analytics.classSummary(classId,options);
  }
  // A tutor/House scope can see a subset of a teaching class without gaining
  // access to its entire register. Always intersect requested IDs with permissions.
  function classSlice(classId,scope='accessible',options={}){
    const permitted=new Set(access.scopeEnrolments(scope));
    const requested=options.enrolmentIds?new Set(options.enrolmentIds):null;
    const enrolmentIds=data.enrolments.filter(e=>e.classId===classId&&permitted.has(e.id)&&
      (!requested||requested.has(e.id))).map(e=>e.id);
    assert(enrolmentIds.length||access.canViewClass(classId),'Class outside current demo scope');
    return analytics.classSummary(classId,{...options,enrolmentIds});
  }
  function assessment(assessmentId,options={}){
    const a=byId('assessments',assessmentId);
    assert(a,'Unknown assessment');
    const permitted=a.classIds.filter(id=>access.canViewClass(id)&&(a.status==='published'||access.teaches(id)||access.leads(id)));
    const classIds=options.classIds??permitted;
    assert(classIds.length&&classIds.every(id=>permitted.includes(id)),'Assessment outside current demo class scope');
    return analytics.assessmentAnalysis(assessmentId,{...options,classIds});
  }
  return {access,cohort,home,student,classSummary,classSlice,assessment,
    interventionSummary:()=>analytics.interventionSummary(visibleCaseIds),
    cases:()=>data.interventions.filter(c=>access.canViewCase(c.id))};
}

/**
 * In-memory, transactional demo store. Optional Storage-compatible persistence.
 * No stored data may be real student data. No security claim is made.
 */
export function createStore({initialData=createDemoData(),storage=null,storageKey=STORAGE_KEY,clock=()=>new Date().toISOString()}={}){
  const baseline=assertData(clone(initialData));
  let current=clone(baseline),revision=0;
  const persisted=storage?.getItem(storageKey);
  if(persisted!==null&&persisted!==undefined){
    const parsed=JSON.parse(persisted);
    current=assertData(parsed);
  }
  const listeners=new Set();
  const snapshot=()=>clone(current);
  const lookup=(data,t,id)=>data[t].find(r=>r.id===id);
  const must=(condition,message)=>{if(!condition)throw new Error(message);};
  function transaction(staffId,action,recordId,mutate){
    const draft=snapshot(),access=createAccess(draft,staffId);
    const {before,after,reason}=mutate(draft,access);
    if(JSON.stringify(before)===JSON.stringify(after))return {changed:false,revision};
    let id='AUD-'+(draft.audit.length+1),n=draft.audit.length+1;
    while(draft.audit.some(a=>a.id===id))id='AUD-'+(++n);
    draft.audit.push({id,actorStaffId:staffId,action,recordId,timestamp:clock(),before:clone(before),after:clone(after),reason:reason??null});
    assertData(draft);
    // Storage failure must not silently commit a partial edit.
    if(storage)storage.setItem(storageKey,JSON.stringify(draft));
    current=draft;revision++;
    for(const listener of listeners)try{listener(snapshot(),revision);}catch(error){console.error('Demo store subscriber error',error);}
    return {changed:true,revision};
  }
  function resultRecord(d,a,e){
    return d.results.find(r=>r.assessmentId===a&&r.enrolmentId===e)??null;
  }
  function ensureResult(d,assessmentId,enrolmentId){
    let r=resultRecord(d,assessmentId,enrolmentId);
    if(!r){r={id:'R-'+resultKey(assessmentId,enrolmentId),assessmentId,enrolmentId,status:'missing',marks:{},exclusionReason:null};d.results.push(r);}
    return r;
  }
  function saveResult(staffId,assessmentId,enrolmentId,{status,marks,confirmClear=false}){
    return transaction(staffId,'saveResult',resultKey(assessmentId,enrolmentId),(d,a)=>{
      must(a.canEditResult(assessmentId,enrolmentId),'Only the teaching staff of this class can edit marks');
      const old=resultRecord(d,assessmentId,enrolmentId),before=old?clone(old):null;
      must(['present','absent','missing'].includes(status),'Invalid result status');
      must(marks&&typeof marks==='object'&&!Array.isArray(marks),'Marks must be an object');
      if(status!=='present'&&old&&Object.keys(old.marks).length)must(confirmClear===true,'Confirm before clearing entered marks');
      const r=ensureResult(d,assessmentId,enrolmentId);
      must(Object.values(marks).every(v=>typeof v==='number'&&Number.isFinite(v)),'Marks must be finite numbers');
      r.status=status;r.marks=clone(marks); // Exclusion setting is preserved; separate guarded operation.
      return {before,after:r};
    });
  }
  function setStudentExclusion(staffId,assessmentId,enrolmentId,{excluded,reason,confirmed}){
    return transaction(staffId,'setStudentExclusion',resultKey(assessmentId,enrolmentId),(d,a)=>{
      must(a.canEditResult(assessmentId,enrolmentId),'Only the assigned teacher can change student exclusion');
      must(typeof excluded==='boolean'&&confirmed===true&&isText(reason),'Written reason and explicit confirmation required');
      const old=resultRecord(d,assessmentId,enrolmentId),before=old?clone(old):null;
      const r=ensureResult(d,assessmentId,enrolmentId);
      r.exclusionReason=excluded?reason.trim():null;
      return {before,after:r,reason:reason.trim()};
    });
  }
  function setAssessmentInclusion(staffId,assessmentId,{included,reason,confirmed,phrase}){
    return transaction(staffId,'setAssessmentInclusion',assessmentId,(d,a)=>{
      must(a.canManageAssessment(assessmentId),'Only authorised assessment owner/faculty lead can change summary inclusion');
      must(typeof included==='boolean'&&confirmed===true&&isText(reason),'Written reason and explicit confirmation required');
      if(!included)must(phrase==='EXCLUDE','Type EXCLUDE to confirm the whole-assessment exclusion');
      const r=lookup(d,'assessments',assessmentId),before=clone(r);
      r.includeInSummary=included;r.exclusionReason=included?null:reason.trim();
      return {before,after:r,reason:reason.trim()};
    });
  }
  function setPrediction(staffId,enrolmentId,predictedGrade){
    return transaction(staffId,'setPrediction',enrolmentId,(d,a)=>{
      must(a.canEditPrediction(enrolmentId),'Only the assigned teacher can edit predictions');
      const r=d.targets.find(t=>t.enrolmentId===enrolmentId);
      must(r,'No target record for enrolment');const before=clone(r);
      r.predictedGrade=predictedGrade;return {before,after:r};
    });
  }
  function setMinimumTarget(staffId,enrolmentId,minimumGrade){
    return transaction(staffId,'setMinimumTarget',enrolmentId,(d,a)=>{
      must(a.canEditMinimumTarget(enrolmentId),'Only relevant faculty leadership can edit demo target');
      const r=d.targets.find(t=>t.enrolmentId===enrolmentId);
      must(r,'No target record for enrolment');const before=clone(r);
      r.minimumGrade=minimumGrade;return {before,after:r};
    });
  }
  function setDemoDate(staffId,date){
    must(isDate(date),'Invalid demo date');
    // Date is a shared preview setting, not a pupil record.
    return transaction(staffId,'setDemoDate','demo-clock',(d,a)=>{
      must(a.has('leadership'),'Only demo leadership can change the reference date');
      const before=d.asOf;d.asOf=date;return {before,after:date};
    });
  }
  function reset({confirmed=false}={}){
    must(confirmed===true,'Confirm reset of fictional demo data');
    const next=clone(baseline);
    if(storage)storage.setItem(storageKey,JSON.stringify(next));
    current=next;revision++;
    for(const listener of listeners)try{listener(snapshot(),revision);}catch(error){console.error('Demo store subscriber error',error);}
  }
  return {snapshot,revision:()=>revision,analytics:()=>createAnalytics(snapshot()),read:staffId=>createReadModel(snapshot(),staffId),
    subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
    saveResult,setStudentExclusion,setAssessmentInclusion,setPrediction,setMinimumTarget,setDemoDate,reset};
}
