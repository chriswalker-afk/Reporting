/**
 * JIS Hub V2: normalized, fictional-data-only model.
 * These browser-compatible modules do not authenticate users.
 */
export const SCHEMA_VERSION = 1;
export const TABLES = [
  'staff','faculties','houses','tutorGroups','students','subjects','gradeSchemes',
  'courses','classes','enrolments','units','assessments','results','targets',
  'notes','interventions','studyPlans','notices','deadlines','audit'
];
export const ROLES = ['teacher','tutor','faculty','house','leadership'];
export const RESULT_STATES = ['present','absent','missing'];
export const MODES = ['total','topics','questions'];
export const key = (...parts) => JSON.stringify(parts);
export const resultKey = (assessmentId,enrolmentId) => key(assessmentId,enrolmentId);
export const clone = value => JSON.parse(JSON.stringify(value));
export const isText = x => typeof x === 'string' && x.trim().length > 0;
export const finite = x => typeof x === 'number' && Number.isFinite(x);
export const isDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0,10) === x;

export function indexData(data) {
  const index = Object.fromEntries(TABLES.map(t => [t,new Map(data[t].map(r=>[r.id,r]))]));
  const group = (rows,field) => {
    const m = new Map();
    for(const row of rows) {
      if(!m.has(row[field])) m.set(row[field],[]);
      m.get(row[field]).push(row);
    }
    return m;
  };
  return {
    ...index,
    enrolmentsByClass:group(data.enrolments,'classId'),
    enrolmentsByStudent:group(data.enrolments,'studentId'),
    classesByCourse:group(data.classes,'courseId'),
    targetsByEnrolment:new Map(data.targets.map(t=>[t.enrolmentId,t])),
    resultsByPair:new Map(data.results.map(r=>[resultKey(r.assessmentId,r.enrolmentId),r])),
    assessmentsByClass:group(data.assessments.flatMap(a=>a.classIds.map(classId=>({...a,classId}))),'classId')
  };
}

export function validateData(data) {
  const errors=[];
  const err=(where,message)=>errors.push(where+': '+message);
  if(!data||data.schemaVersion!==SCHEMA_VERSION||data.synthetic!==true)
    return ['Only schema version '+SCHEMA_VERSION+' explicitly synthetic demo data is supported.'];
  if(!isDate(data.asOf)||!isText(data.academicYear))return ['Invalid demo reference date or academic year.'];
  for(const table of TABLES) {
    if(!Array.isArray(data[table])) err(table,'expected array');
    else {
      const ids=new Set();
      for(const r of data[table]) {
        if(!r||!isText(r.id))err(table,'missing record ID');
        else if(ids.has(r.id))err(table,'duplicate ID '+r.id);
        else ids.add(r.id);
      }
    }
  }
  if(errors.length)return errors;
  const maps=Object.fromEntries(TABLES.map(t=>[t,new Map(data[t].map(r=>[r.id,r]))]));
  const ref=(where,t,id)=>{if(!maps[t].has(id)){err(where,'unknown '+t+' ID '+id);return false;}return true;};
  const refs=(where,t,ids,{nonempty=false}={})=>{
    if(!Array.isArray(ids)||(nonempty&&!ids.length)){err(where,'invalid '+t+' list');return false;}
    if(new Set(ids).size!==ids.length)err(where,'duplicate '+t+' reference');
    ids.forEach(id=>ref(where,t,id));return true;
  };
  const roleRefs=(where,ids,role)=>{
    if(refs(where,'staff',ids)) for(const id of ids)if(!maps.staff.get(id)?.roles?.includes(role))err(where,id+' lacks '+role+' role');
  };
  for(const s of data.staff) {
    if(!isText(s.name)||!Array.isArray(s.roles)||!s.roles.length||new Set(s.roles).size!==s.roles.length||
      s.roles.some(r=>!ROLES.includes(r)))err(s.id,'invalid staff identity or roles');
  }
  for(const f of data.faculties)roleRefs(f.id,f.headIds,'faculty');
  for(const h of data.houses)roleRefs(h.id,h.headIds,'house');
  for(const g of data.tutorGroups) {
    roleRefs(g.id,g.tutorIds,'tutor');ref(g.id,'houses',g.houseId);
    if(!Number.isInteger(g.year)||g.year<7||g.year>13)err(g.id,'invalid year');
  }
  for(const s of data.students) {
    ref(s.id,'houses',s.houseId);ref(s.id,'tutorGroups',s.tutorGroupId);
    const g=maps.tutorGroups.get(s.tutorGroupId);
    if(g&&(g.year!==s.year||g.houseId!==s.houseId))err(s.id,'tutor group must match year and House');
    if(!isText(s.name)||!Array.isArray(s.tags)||new Set(s.tags).size!==s.tags.length||
      s.tags.some(t=>!['EAL','SEN','HLP','Access arrangements'].includes(t)))err(s.id,'invalid student tags or identity');
  }
  for(const s of data.subjects)ref(s.id,'faculties',s.facultyId);
  for(const g of data.gradeSchemes) {
    const bands=g.bands;
    if(!Array.isArray(bands)||!bands.length||bands[0]?.min!==0||
       bands.some((b,i)=>!b||!isText(b.grade)||!finite(b.min)||b.min<0||b.min>100||(i&&b.min<=bands[i-1].min))||
       new Set(bands.map(b=>b?.grade)).size!==bands.length)err(g.id,'bands must start at zero, increase and use unique grade labels');
  }
  const schemeLabels=id=>maps.gradeSchemes.get(id)?.bands?.map(b=>b.grade)||[];
  for(const c of data.courses){
    ref(c.id,'subjects',c.subjectId);ref(c.id,'gradeSchemes',c.gradeSchemeId);
    if(!Number.isInteger(c.year)||c.year<7||c.year>13||!isText(c.academicYear))err(c.id,'invalid course year');
    if(!finite(c.defaultWeight)||c.defaultWeight<=0)err(c.id,'invalid default assessment weight');
  }
  for(const c of data.classes) {
    ref(c.id,'courses',c.courseId);roleRefs(c.id,c.teacherIds,'teacher');
    if(!c.teacherIds?.length)err(c.id,'class must have a teacher');
  }
  const memberships=new Set(),subjectMemberships=new Set();
  for(const e of data.enrolments){
    ref(e.id,'students',e.studentId);ref(e.id,'classes',e.classId);
    const k=key(e.studentId,e.classId);
    if(memberships.has(k))err(e.id,'duplicate student/class enrolment');memberships.add(k);
    const c=maps.courses.get(maps.classes.get(e.classId)?.courseId);
    const s=maps.students.get(e.studentId);
    if(c&&s){
      if(c.year!==s.year)err(e.id,'course and student year mismatch');
      const k2=key(e.studentId,c.subjectId,c.academicYear);
      if(subjectMemberships.has(k2))err(e.id,'student already enrolled in this subject this academic year');
      subjectMemberships.add(k2);
    }
  }
  for(const u of data.units)ref(u.id,'courses',u.courseId);
  for(const a of data.assessments) {
    ref(a.id,'courses',a.courseId);ref(a.id,'units',a.unitId);ref(a.id,'gradeSchemes',a.gradeSchemeId);
    if(maps.units.get(a.unitId)?.courseId!==a.courseId)err(a.id,'unit belongs to a different course');
    if(refs(a.id,'classes',a.classIds,{nonempty:true}))
      for(const id of a.classIds)if(maps.classes.get(id)?.courseId!==a.courseId)err(a.id,'class belongs to different course');
    if(!isText(a.title)||!isDate(a.date)||!MODES.includes(a.mode)||!['draft','published'].includes(a.status)||
      !finite(a.weight)||a.weight<=0||typeof a.includeInSummary!=='boolean')err(a.id,'invalid assessment metadata');
    if(!a.includeInSummary&&!isText(a.exclusionReason))err(a.id,'summary exclusion needs a reason');
    if(a.includeInSummary&&a.exclusionReason!==null)err(a.id,'included assessment cannot have an active exclusion reason');
    const tracker=maps.courses.get(a.courseId)?.gradeSchemeId;
    if(JSON.stringify(schemeLabels(tracker))!==JSON.stringify(schemeLabels(a.gradeSchemeId)))err(a.id,'assessment grade scale must match course grade labels');
    if(!Array.isArray(a.items)||!a.items.length){err(a.id,'assessment needs items');continue;}
    if(a.mode==='total'&&a.items.length!==1)err(a.id,'total-only assessment needs one item');
    const itemIds=new Set();
    for(const item of a.items){
      if(!item||!isText(item.id)||itemIds.has(item.id)||!isText(item.label)||!finite(item.maxMarks)||item.maxMarks<=0)err(a.id,'invalid/duplicate assessment item');
      else itemIds.add(item.id);
      if(a.mode!=='total'&&!isText(item?.topic))err(a.id,'topic/question items need a topic');
      if(item?.ao!=null&&!['AO1','AO2','AO3'].includes(item.ao))err(a.id,'invalid assessment objective');
    }
  }
  const resultPairs=new Set();
  for(const r of data.results) {
    ref(r.id,'assessments',r.assessmentId);ref(r.id,'enrolments',r.enrolmentId);
    const pair=resultKey(r.assessmentId,r.enrolmentId);
    if(resultPairs.has(pair))err(r.id,'duplicate result');resultPairs.add(pair);
    const a=maps.assessments.get(r.assessmentId),e=maps.enrolments.get(r.enrolmentId);
    if(a&&e&&!a.classIds.includes(e.classId))err(r.id,'assessment is not assigned to enrolment class');
    if(!RESULT_STATES.includes(r.status)||!r.marks||typeof r.marks!=='object'||Array.isArray(r.marks)) {
      err(r.id,'invalid result status/marks');continue;
    }
    if(r.exclusionReason!==null&&!isText(r.exclusionReason))err(r.id,'exclusion requires a written reason');
    for(const [itemId,value] of Object.entries(r.marks)) {
      const item=a?.items?.find(i=>i.id===itemId);
      if(!item||!finite(value)||value<0||value>item.maxMarks)err(r.id,'invalid mark for '+itemId);
    }
    if(r.status!=='present'&&Object.keys(r.marks).length)err(r.id,'absent/missing result cannot contain marks');
  }
  const targetKeys=new Set();
  for(const t of data.targets) {
    ref(t.id,'enrolments',t.enrolmentId);
    if(targetKeys.has(t.enrolmentId))err(t.id,'duplicate target');targetKeys.add(t.enrolmentId);
    const c=maps.courses.get(maps.classes.get(maps.enrolments.get(t.enrolmentId)?.classId)?.courseId);
    const labels=schemeLabels(c?.gradeSchemeId);
    if(!labels.includes(t.minimumGrade)||(t.predictedGrade!==null&&!labels.includes(t.predictedGrade)))err(t.id,'target/prediction outside course grade scale');
  }
  for(const n of data.notes){
    ref(n.id,'enrolments',n.enrolmentId);ref(n.id,'staff',n.authorStaffId);
    if(!isText(n.text)||n.text.length>2000||!isDate(n.date)||!['subject','pastoral'].includes(n.visibility)||n.updatedDate!==undefined&&!isDate(n.updatedDate))err(n.id,'invalid note');
  }
  const activeCases=new Set();
  for(const c of data.interventions) {
    ref(c.id,'enrolments',c.enrolmentId);ref(c.id,'staff',c.ownerStaffId);
    if(!['wave1','wave2_requested','wave2','wave3_requested','wave3','closed'].includes(c.state)||
       ![1,2,3].includes(c.wave)||!isDate(c.openedDate)||!isDate(c.reviewDate)||
       !isDate(c.updatedDate)||!isText(c.reason)||!Array.isArray(c.history))err(c.id,'invalid intervention');
    const waveByState={wave1:1,wave2_requested:2,wave2:2,wave3_requested:3,wave3:3};
    if(c.state!=='closed'&&waveByState[c.state]!==c.wave)err(c.id,'wave/state mismatch');
    if(c.state!=='closed'){
      if(activeCases.has(c.enrolmentId))err(c.id,'duplicate active subject intervention');
      activeCases.add(c.enrolmentId);
    }
    if(c.state==='closed'&&!isText(c.evaluation))err(c.id,'closed intervention requires evaluation');
    for(const f of ['wave1Plan','facultyPlan','houseRequest','leadershipPlan','evaluation'])if(c[f]!=null&&!isText(c[f]))err(c.id,'invalid '+f);
    if(c.strategies!==undefined&&(!Array.isArray(c.strategies)||c.strategies.some(s=>!isText(s))))err(c.id,'invalid classroom strategies');
    for(const f of ['wave2Referral','wave3Referral']){
      const r=c[f];if(r!==undefined&&r!==null){
        if(!isText(r.trigger)||!isText(r.reason)||!isDate(r.date))err(c.id,'invalid '+f);
        ref(c.id,'staff',r.requestedBy);ref(c.id,'staff',r.ownerStaffId);
      }
    }
    if(c.houseOwnerStaffId!==undefined)ref(c.id,'staff',c.houseOwnerStaffId);
    if(c.houseResponse!=null){
      const r=c.houseResponse;if(!isText(r.response)||typeof r.complete!=='boolean')err(c.id,'invalid House response');
      if(r.actorStaffId!==undefined)ref(c.id,'staff',r.actorStaffId);
      if(r.date!==undefined&&!isDate(r.date))err(c.id,'invalid House response date');
    }
    if(c.closedDate!==undefined&&!isDate(c.closedDate))err(c.id,'invalid close date');
    if(c.closedBy!==undefined)ref(c.id,'staff',c.closedBy);
    for(const h of c.history||[]){ref(c.id,'staff',h.actorStaffId);if(!isDate(h.date)||!isText(h.text))err(c.id,'invalid case history');}
  }
  const plannedCases=new Set();
  for(const p of data.studyPlans){
    ref(p.id,'interventions',p.interventionId);ref(p.id,'staff',p.ownerStaffId);
    if(plannedCases.has(p.interventionId))err(p.id,'duplicate study plan for case');
    plannedCases.add(p.interventionId);
    if(!isDate(p.reviewDate)||!Array.isArray(p.actions)||!p.actions.length||p.actions.some(a=>!isText(a))||!isText(p.target))err(p.id,'invalid study plan');
    for(const f of ['createdDate','updatedDate','completedDate'])if(p[f]!=null&&!isDate(p[f]))err(p.id,'invalid '+f);
    if(p.evaluation!=null&&!isText(p.evaluation))err(p.id,'invalid study plan evaluation');
    if(p.history!==undefined){
      if(!Array.isArray(p.history))err(p.id,'invalid study plan history');
      else for(const h of p.history){ref(p.id,'staff',h.actorStaffId);if(!isDate(h.date)||!isText(h.text)||!['continue','revise','achieved'].includes(h.outcome))err(p.id,'invalid study plan review');}
    }
  }
  const audience=(r)=>{
    if(!r.audience||!['all','faculty','house','tutorGroup','year'].includes(r.audience.type)){err(r.id,'invalid audience');return;}
    const {type,id}=r.audience;
    if(type==='all'&&id!==null)err(r.id,'all-staff audience must use null ID');
    if(type==='faculty')ref(r.id,'faculties',id);
    if(type==='house')ref(r.id,'houses',id);
    if(type==='tutorGroup')ref(r.id,'tutorGroups',id);
    if(type==='year'&&(!Number.isInteger(id)||id<7||id>13))err(r.id,'invalid audience year');
  };
  function staffResponses(r,rows,versioned=false){
    if(rows===undefined)return;
    if(!Array.isArray(rows)){err(r.id,'invalid staff responses');return;}
    const seen=new Set();
    for(const a of rows){
      if(!a||typeof a!=='object'){err(r.id,'invalid staff response');continue;}
      ref(r.id,'staff',a.staffId);
      if(!isDate(a.date)||versioned&&a.version!==(r.version??1))err(r.id,'invalid response date/version');
      if(seen.has(a.staffId))err(r.id,'duplicate staff response');
      seen.add(a.staffId);
    }
  }
  const safeResource=value=>{try{const u=new URL(value);return typeof value==='string'&&value.length<=500&&u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
  for(const n of data.notices){
    ref(n.id,'staff',n.authorStaffId);audience(n);
    if(!isText(n.title)||!isText(n.body)||!isDate(n.publishedDate)||
      (n.expiryDate!==null&&(!isDate(n.expiryDate)||n.expiryDate<n.publishedDate))||
      !['notice','briefing'].includes(n.kind))err(n.id,'invalid notice');
    if(n.priority!==undefined&&!['normal','important','urgent'].includes(n.priority))err(n.id,'invalid notice priority');
    for(const field of ['archived','pinned','requiresAcknowledgement'])if(n[field]!==undefined&&typeof n[field]!=='boolean')err(n.id,'invalid '+field);
    if(n.version!==undefined&&(!Number.isInteger(n.version)||n.version<1))err(n.id,'invalid notice version');
    if(n.links!==undefined&&(!Array.isArray(n.links)||n.links.length>5||n.links.some(l=>!safeResource(l))))err(n.id,'invalid resource links');
    staffResponses(n,n.acknowledgements,true);
    if(!n.requiresAcknowledgement&&n.acknowledgements?.length)err(n.id,'acknowledgement not required');
  }
  for(const d of data.deadlines){
    audience(d);if(!isText(d.title)||!isDate(d.dueDate))err(d.id,'invalid deadline');
    if(d.event!==undefined&&!['Reports','SIMS grades','PTM','PTE','Moderation','Other'].includes(d.event))err(d.id,'invalid deadline event');
    if(d.details!==undefined&&typeof d.details!=='string')err(d.id,'invalid instructions');
    if(d.archived!==undefined&&typeof d.archived!=='boolean')err(d.id,'invalid archived state');
    staffResponses(d,d.completions);
  }
  for(const a of data.audit){ref(a.id,'staff',a.actorStaffId);if(!isText(a.action)||!isText(a.recordId)||!isText(a.timestamp)||!Number.isFinite(Date.parse(a.timestamp)))err(a.id,'invalid audit event');}
  return errors;
}
export function assertData(data){
  const errors=validateData(data);
  if(errors.length)throw new Error('Invalid demo dataset: '+errors.slice(0,8).join('; '));
  return data;
}
