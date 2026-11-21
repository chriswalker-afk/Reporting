/* Assessment calculations are independent of the UI for testing and later server-side reuse.
   This prototype contains fictional data and is NOT an authorisation boundary. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SchoolHubAssessmentCore = api;
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';

  const round = n => Math.round(n * 10) / 10;
  const isBlank = v => v === '' || v === null || v === undefined;
  const maxTotal = assessment => assessment.items.reduce((sum, item) => sum + Number(item.maxMarks || 0), 0);
  const clone = value => JSON.parse(JSON.stringify(value));

  function resultFor(assessment, studentId) {
    if (Object.prototype.hasOwnProperty.call(assessment.excludedStudents || {}, studentId)) {
      return { status:'excluded', total:null, percent:null };
    }
    const scores = assessment.scores?.[studentId] || {};
    const values = assessment.items.map(item => scores[item.id]);
    if (values.every(isBlank)) return { status:'unmarked', total:null, percent:null };
    if (values.some(isBlank)) return { status:'incomplete', total:null, percent:null };
    const invalid = assessment.items.some((item, index) => {
      const n = Number(values[index]);
      return !Number.isFinite(n) || n < 0 || n > Number(item.maxMarks);
    });
    if (invalid) return { status:'invalid', total:null, percent:null };
    const total = values.reduce((sum, value) => sum + Number(value), 0);
    const max = maxTotal(assessment);
    return { status:'scored', total:round(total), max, percent:max > 0 ? round(100 * total / max) : null };
  }

  function assessmentStats(assessment, pupils) {
    let excluded=0, incomplete=0, unmarked=0;
    const percents=[];
    for (const pupil of pupils) {
      const result = resultFor(assessment,pupil.id);
      if (result.status==='excluded') excluded++;
      else if (result.status==='incomplete'||result.status==='invalid') incomplete++;
      else if (result.status==='unmarked') unmarked++;
      else if (result.percent!==null) percents.push(result.percent);
    }
    return {
      mean:percents.length?round(percents.reduce((s,v)=>s+v,0)/percents.length):null,
      scored:percents.length, excluded, incomplete, unmarked, eligible:pupils.length-excluded
    };
  }

  function summaryStats(assessments,pupils) {
    const included = assessments.filter(a=>a.includeInSummary!==false && a.status==='Published');
    const means=included.map(a=>assessmentStats(a,pupils).mean).filter(v=>v!==null);
    return {mean:means.length?round(means.reduce((s,v)=>s+v,0)/means.length):null,
      usedAssessments:means.length, ignoredAssessments:assessments.length-included.length,
      includedAssessments:included.length };
  }

  function itemStats(assessment,pupils) {
    return assessment.items.map(item=>{
      const scores=[];
      for(const pupil of pupils) {
        if(resultFor(assessment,pupil.id).status!=='scored') continue;
        const value=assessment.scores[pupil.id][item.id];
        scores.push(Number(value));
      }
      const total=scores.reduce((s,v)=>s+v,0);
      const average=scores.length?round(total/scores.length):null;
      return {id:item.id,label:item.label,topic:item.topic || item.label,ao:item.ao||'',
        maxMarks:Number(item.maxMarks),meanMarks:average,
        percent:scores.length?round(total/(Number(item.maxMarks)*scores.length)*100):null,
        included:scores.length,belowHalf:scores.filter(x=>x/Number(item.maxMarks)<.5).length};
    });
  }

  function topicStats(assessment,pupils) {
    const map = new Map();
    for(const item of assessment.items) {
      const key=(assessment.mode==='questions'?item.topic:item.label).trim() || 'Uncategorised';
      if(!map.has(key))map.set(key,{topic:key,maxMarks:0,totalMarks:0,entries:0});
      const row=map.get(key);
      row.maxMarks+=Number(item.maxMarks);
    }
    for(const pupil of pupils) {
      if(resultFor(assessment,pupil.id).status!=='scored')continue;
      for(const item of assessment.items) {
        const key=(assessment.mode==='questions'?item.topic:item.label).trim() || 'Uncategorised';
        const row=map.get(key);
        row.totalMarks+=Number(assessment.scores[pupil.id][item.id]);
        row.entries++;
      }
    }
    // Each item can have a different maximum; build denominators by item, not entry count.
    const output=[];
    for(const [key,row] of map) {
      let possible=0;
      for(const pupil of pupils) {
        if(resultFor(assessment,pupil.id).status!=='scored')continue;
        for(const item of assessment.items) {
          const t=(assessment.mode==='questions'?item.topic:item.label).trim()||'Uncategorised';
          if(t===key)possible+=Number(item.maxMarks);
        }
      }
      output.push({topic:key,maxMarks:row.maxMarks,percent:possible?round(row.totalMarks/possible*100):null});
    }
    return output;
  }

  function cloneStructure(source, classId, id) {
    return {
      id, classId, title:source.title+' (new)',date:'2026-11-22',type:source.type,
      mode:source.mode,items:clone(source.items).map((item,index)=>({...item,id:'I'+(index+1)})),
      scores:{},excludedStudents:{},includeInSummary:true,exclusionReason:'',
      status:'Draft',version:0,history:[]
    };
  }

  function exclusionChanged(previous,next) {
    const prior=previous||{excludedStudents:{},includeInSummary:true};
    const x=Object.entries(prior.excludedStudents||{}).sort((a,b)=>a[0].localeCompare(b[0]));
    const y=Object.entries(next.excludedStudents||{}).sort((a,b)=>a[0].localeCompare(b[0]));
    return prior.includeInSummary!==next.includeInSummary || JSON.stringify(x)!==JSON.stringify(y);
  }

  function validate(assessment, pupils) {
    const errors=[];
    if(!String(assessment.title||'').trim())errors.push('Enter an assessment title.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(assessment.date||'')))errors.push('Enter a valid assessment date.');
    if(!['topics','questions'].includes(assessment.mode))errors.push('Choose topic or question analysis.');
    if(!['Quiz','Topic test','End-of-unit','Mock examination','Other'].includes(assessment.type))errors.push('Choose an assessment type.');
    if(!Array.isArray(assessment.items)||assessment.items.length===0)errors.push('Add at least one topic or question.');
    const ids=new Set();
    for(const item of assessment.items||[]) {
      if(!String(item.label||'').trim())errors.push('Each row needs a name or question number.');
      if(!Number.isFinite(Number(item.maxMarks))||Number(item.maxMarks)<=0)errors.push('Every row needs a positive maximum mark.');
      if(assessment.mode==='questions'&&!String(item.topic||'').trim())errors.push('Every question needs a topic.');
      if(ids.has(item.id))errors.push('Question/topic IDs must be unique.');
      ids.add(item.id);
    }
    for(const pupil of pupils) {
      const marks=assessment.scores?.[pupil.id]||{};
      for(const item of assessment.items||[]) {
        if(isBlank(marks[item.id]))continue;
        const n=Number(marks[item.id]);
        if(!Number.isFinite(n)||n<0||n>Number(item.maxMarks))errors.push('Marks for '+pupil.name+' must be between 0 and the maximum.');
      }
    }
    for(const [id,reason] of Object.entries(assessment.excludedStudents||{})) {
      if(!pupils.some(p=>p.id===id))errors.push('An excluded student is not in this class.');
      if(!String(reason||'').trim())errors.push('Enter a reason for every excluded student.');
    }
    if(assessment.includeInSummary===false&&!String(assessment.exclusionReason||'').trim())errors.push('Provide a reason for excluding the assessment from summaries.');
    return Array.from(new Set(errors));
  }

  function publishState(assessment,pupils) {
    // An unfinished markbook remains a draft, never silently contributes to summary data.
    const scored=pupils.filter(p=>resultFor(assessment,p.id).status==='scored').length;
    return scored?'Published':'Draft';
  }

  return {round,maxTotal,clone,resultFor,assessmentStats,summaryStats,itemStats,topicStats,
    cloneStructure,exclusionChanged,validate,publishState};
});
