import {assertData,clone,SCHEMA_VERSION,resultKey,isText,isDate} from './model.mjs';
import {createAccess} from './access.mjs';
import {createAnalytics} from './analytics.mjs';
import {createDemoData} from './demo-data.mjs';
import {communicationPolicy,communicationView,noticeFields,deadlineFields,noticeVersion} from './communications.mjs';

export const STORAGE_KEY='jis-hub-v2-synthetic-schema-'+SCHEMA_VERSION;

/** A fresh permission-filtered read model, intended for all V2 screens. */
export function createReadModel(data,staffId){
  const access=createAccess(data,staffId),analytics=createAnalytics(data);
  const byId=(table,id)=>data[table].find(r=>r.id===id);
  const visibleCaseIds=data.interventions.filter(c=>access.canViewCase(c.id)).map(c=>c.id);
  let communicationsCache;
  const communications=()=>communicationsCache??=communicationView(data,staffId);
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
    actions.sort((a,b)=>a.reviewDate.localeCompare(b.reviewDate)||a.caseId.localeCompare(b.caseId)||a.type.localeCompare(b.type));
    const comm=communications();
    return {scope,cohort:cohort(scope,options),actions,
      notices:comm.activeNotices,deadlines:comm.deadlines.filter(d=>!d.archived&&d.dueDate>=data.asOf),
      pendingAcknowledgements:comm.pendingAcknowledgements,openDeadlines:comm.openDeadlines};
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
  return {access,cohort,home,student,classSummary,classSlice,assessment,communications,
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
  function saveSubjectNote(staffId,enrolmentId,id,text){
    const recordId=id??nextId('notes','N');
    return transaction(staffId,id?'editSubjectNote':'addSubjectNote',recordId,(d,a)=>{
      must(a.canAddSubjectNote(enrolmentId),'Only the assigned teacher can add subject comments');
      must(isText(text)&&text.trim().length<=2000,'Enter a comment of 1–2000 characters');
      const old=id?lookup(d,'notes',id):null;
      must(!id||old&&old.enrolmentId===enrolmentId&&a.canEditSubjectNote(id),'Only the assigned author can edit this subject comment');
      if(old){
        const before=clone(old);if(old.text===text.trim())return {before,after:old};
        old.text=text.trim();old.updatedDate=d.asOf;return {before,after:old};
      }
      const record={id:recordId,enrolmentId,authorStaffId:staffId,date:d.asOf,visibility:'subject',text:text.trim()};
      d.notes.push(record);return {before:null,after:record};
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
  function nextId(table,prefix){
    let n=1;while(current[table].some(r=>r.id===prefix+n))n++;return prefix+n;
  }
  function saveNotice(staffId,id,input){
    const recordId=id??nextId('notices','NO');
    return transaction(staffId,id?'editNotice':'publishNotice',recordId,(d)=>{
      const p=communicationPolicy(d,staffId),old=id?lookup(d,'notices',id):null;
      must(!id||p.canEditNotice(old)&&!old.archived,'Only authorised publishers can edit an active or scheduled notice');
      must(p.canPublish(input.audience),'You cannot publish to this audience');
      const fields=noticeFields(input),before=old?clone(old):null;
      if(old){
        const same=Object.keys(fields).every(k=>JSON.stringify(fields[k])===JSON.stringify(old[k]));
        if(same)return {before,after:old};
        must(input.confirmed===true,'Confirm that publishing changes resets acknowledgements');
        Object.assign(old,fields,{version:noticeVersion(old)+1,acknowledgements:[]});
        return {before,after:old,reason:'Notice revised; previous acknowledgements retained in audit history'};
      }
      const record={id:recordId,authorStaffId:staffId,...fields,version:1,archived:false,acknowledgements:[]};
      d.notices.push(record);return {before:null,after:record};
    });
  }
  function archiveNotice(staffId,id,{confirmed=false}={}){
    return transaction(staffId,'archiveNotice',id,d=>{
      const p=communicationPolicy(d,staffId),n=lookup(d,'notices',id);
      must(p.canEditNotice(n),'You cannot archive this notice');
      must(confirmed===true,'Confirm archiving the notice');
      const before=clone(n);n.archived=true;return {before,after:n};
    });
  }
  function acknowledgeNotice(staffId,id){
    return transaction(staffId,'acknowledgeNotice',id,d=>{
      const p=communicationPolicy(d,staffId),n=lookup(d,'notices',id);
      must(p.canAcknowledge(n),'No pending acknowledgement for this staff member');
      const before=clone(n);(n.acknowledgements??=[]).push({staffId,date:d.asOf,version:noticeVersion(n)});
      return {before,after:n};
    });
  }
  function saveDeadline(staffId,id,input){
    const recordId=id??nextId('deadlines','D');
    return transaction(staffId,id?'editDeadline':'createDeadline',recordId,d=>{
      const p=communicationPolicy(d,staffId),old=id?lookup(d,'deadlines',id):null;
      must(p.canManageDeadline(),'Only school leadership can manage the reporting schedule');
      must(!id||old&&!old.archived,'Unknown or archived deadline');
      must(p.canPublish(input.audience),'Invalid deadline audience');
      const fields=deadlineFields(input),before=old?clone(old):null;
      if(old){
        if(Object.keys(fields).every(k=>JSON.stringify(fields[k])===JSON.stringify(old[k])))return {before,after:old};
        must(input.confirmed===true,'Confirm the revised deadline and reset of personal completion markers');
        Object.assign(old,fields,{completions:[]});
        return {before,after:old,reason:'Schedule revised; previous completion markers retained in audit'};
      }
      const record={id:recordId,...fields,archived:false,completions:[]};
      d.deadlines.push(record);return {before:null,after:record};
    });
  }
  function archiveDeadline(staffId,id,{confirmed=false}={}){
    return transaction(staffId,'archiveDeadline',id,d=>{
      const p=communicationPolicy(d,staffId),r=lookup(d,'deadlines',id);
      must(p.canManageDeadline()&&r,'Only school leadership can archive this deadline');
      must(confirmed===true,'Confirm archiving the deadline');
      const before=clone(r);r.archived=true;return {before,after:r};
    });
  }
  function setDeadlineCompletion(staffId,id,completed){
    return transaction(staffId,'setDeadlineCompletion',id,d=>{
      const p=communicationPolicy(d,staffId),r=lookup(d,'deadlines',id);
      must(r&&!r.archived&&p.recipient(r.audience),'Deadline is not assigned to this staff member');
      must(typeof completed==='boolean','Invalid completion status');
      const before=clone(r),rows=r.completions??[];
      if(p.deadlineCompleted(r)===completed)return {before,after:r};
      r.completions=rows.filter(c=>c.staffId!==staffId);
      if(completed)r.completions.push({staffId,date:d.asOf});
      return {before,after:r};
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
    saveResult,setStudentExclusion,setAssessmentInclusion,setPrediction,setMinimumTarget,saveSubjectNote,setDemoDate,
    saveNotice,archiveNotice,acknowledgeNotice,saveDeadline,archiveDeadline,setDeadlineCompletion,reset};
}
