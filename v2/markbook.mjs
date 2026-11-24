import {indexData,isText,isDate,finite,clone,MODES,resultKey} from './model.mjs';
import {createAnalytics,gradeFor} from './analytics.mjs';

export const maxMarks=a=>a.items.reduce((n,i)=>n+i.maxMarks,0);
const require=(ok,message)=>{if(!ok)throw Error(message);};
export function permittedAssignments(data,access,classId){
 const c=data.classes.find(c=>c.id===classId);
 if(!c)return [];
 if(access.leads(classId))return data.classes.filter(x=>x.courseId===c.courseId&&access.leads(x.id));
 return access.teaches(classId)?[c]:[];
}
export function normalizeDefinition(data,access,classId,input,old=null){
 const ix=indexData(data),c=ix.classes.get(classId),course=ix.courses.get(c?.courseId);
 require(course,'Unknown class');
 const permitted=new Set(permittedAssignments(data,access,classId).map(c=>c.id));
 require(permitted.size,'Only assigned teachers or faculty leadership can create assessments');
 require(Array.isArray(input.classIds)&&input.classIds.length&&new Set(input.classIds).size===input.classIds.length&&input.classIds.includes(classId)&&input.classIds.every(id=>permitted.has(id)),'Invalid class assignments or insufficient permission for a common assessment');
 require(input.classIds.length===1||input.classIds.every(id=>access.leads(id)),'Common assessments require faculty leadership');
 require(ix.units.get(input.unitId)?.courseId===course.id,'Choose a unit in this course');
 require(isText(input.title)&&input.title.trim().length<=160&&isDate(input.date)&&MODES.includes(input.mode),'Enter a valid title, date and assessment mode');
 require(finite(input.weight)&&input.weight>0&&input.weight<=1000,'Weight must be positive and at most 1000');
 require(Array.isArray(input.items)&&input.items.length>=1&&input.items.length<=100,'Enter 1–100 assessment items');
 require(input.mode!=='total'||input.items.length===1,'Total-only assessment needs one item');
 const items=input.items.map((i,n)=>{
  require(i&&isText(i.label)&&i.label.trim().length<=80&&finite(i.maxMarks)&&i.maxMarks>0&&i.maxMarks<=10000,'Every item needs a label and positive maximum mark');
  require(input.mode==='total'||isText(i.topic),'Each topic/question needs a topic');
  require(i.ao==null||['AO1','AO2','AO3'].includes(i.ao),'Invalid assessment objective');
  return {id:old?.items[n]?.id??'item'+(n+1),label:i.label.trim(),maxMarks:i.maxMarks,topic:isText(i.topic)?i.topic.trim():null,ao:i.ao??null};
 });
 require(new Set(items.map(i=>i.label.toLowerCase())).size===items.length,'Item labels must be unique');
 require(new Set(items.map(i=>i.id)).size===items.length,'Item identifiers must be unique');
 const locked=Boolean(old&&data.results.some(r=>r.assessmentId===old.id));
 if(locked){
  const structure=x=>x.map(({id,label,topic,ao})=>({id,label,topic,ao:ao??null}));
  require(old.mode===input.mode&&JSON.stringify(structure(old.items))===JSON.stringify(structure(items)),'Item structure is locked once results exist. Reuse as a new assessment instead.');
  if(old.items.some((i,n)=>i.maxMarks!==items[n].maxMarks)){
   require(input.confirmed===true&&isText(input.reason),'Confirm maximum mark corrections and provide a reason');
   for(const r of data.results.filter(r=>r.assessmentId===old.id)){
    for(const i of items)require(!Object.hasOwn(r.marks,i.id)||r.marks[i.id]<=i.maxMarks,'Revised maximum for '+i.label+' is below a recorded mark in an assigned class');
   }
  }
  require(old.classIds.length===input.classIds.length&&old.classIds.every(id=>input.classIds.includes(id)),'Class assignments are locked once results exist');
 }
 const tracker=ix.gradeSchemes.get(course.gradeSchemeId),bands=input.bands??tracker.bands;
 require(Array.isArray(bands)&&bands.length===tracker.bands.length&&bands.every((b,i)=>b&&b.grade===tracker.bands[i].grade&&finite(b.min)&&b.min>=0&&b.min<=100&&(i===0?b.min===0:b.min>bands[i-1].min)),'Boundaries must start at 0, increase strictly and preserve course grade labels');
 return {fields:{courseId:course.id,unitId:input.unitId,classIds:[...input.classIds],title:input.title.trim(),date:input.date,mode:input.mode,items,weight:input.weight},bands:clone(bands),tracker,locked};
}
export function resultInput(assessment,status,marks){
 require(['present','absent','missing'].includes(status),'Invalid result status');
 require(marks&&typeof marks==='object'&&!Array.isArray(marks),'Marks must be an object');
 const clean=Object.fromEntries(Object.entries(marks).map(([id,value])=>{
  const i=assessment.items.find(i=>i.id===id);
  require(i&&finite(value)&&value>=0&&value<=i.maxMarks,'Invalid mark for '+(i?.label??id));
  return [id,value];
 }));
 require(status==='present'||!Object.keys(clean).length,'Absent/missing rows cannot contain marks');
 return {status,marks:clean};
}
export function cellMark(text,item){
 const value=String(text??'').trim();
 if(value==='')return null;
 require(/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value),'Enter a number for '+item.label+' or leave it blank');
 const n=Number(value);
 require(finite(n)&&n>=0&&n<=item.maxMarks,item.label+' must be between 0 and '+item.maxMarks);
 return n;
}
export function previewRow(assessment,bands,status,marks,excluded=false){
 const complete=status==='present'&&assessment.items.every(i=>Object.hasOwn(marks,i.id));
 const total=complete?assessment.items.reduce((n,i)=>n+marks[i.id],0):null;
 const maximum=maxMarks(assessment),percent=total===null?null:total===maximum?100:Math.min(100,100*total/maximum);
 return {total,percent,grade:gradeFor(percent,{bands}),state:excluded?'excluded':status==='present'?complete?'scored':'incomplete':status};
}
/** CSV/TSV parser: RFC-style quoted fields, escaped quotes and CRLF, with strict malformed-input rejection. */
export function parseDelimited(text,delimiter){
 require(typeof text==='string'&&text.length<=500000,'Import must be text under 500 KB');
 text=text.replace(/^\uFEFF/,'');
 if(!delimiter){
  // Inspect the first logical record, ignoring delimiters and newlines inside quotes.
  let inQuotes=false,tabs=0,commas=0;
  for(let i=0;i<text.length;i++){
   const ch=text[i];
   if(ch==='"'){if(inQuotes&&text[i+1]==='"'){i++;continue;}inQuotes=!inQuotes;continue;}
   if(inQuotes)continue;
   if(ch==='\r'||ch==='\n')break;
   if(ch==='\t')tabs++;else if(ch===',')commas++;
  }
  delimiter=tabs?'\t':',';
 }
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 function push(){row.push(cell);cell='';closed=false;}
 function finish(){push();rows.push(row);row=[];}
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c===delimiter){push();continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;finish();continue;}
  require(!closed,'Unexpected character after quoted field');
  if(c==='"'){require(cell==='','Unexpected quote in unquoted field');quoted=true;}else cell+=c;
 }
 require(!quoted,'Unclosed quoted field');
 if(cell!==''||row.length||closed)finish();
 while(rows.length&&rows.at(-1).every(c=>c.trim()===''))rows.pop();
 return rows;
}
export function importPreview(text,assessment,rows){
 const grid=parseDelimited(text),header=grid.shift()?.map(v=>v.trim())??[];
 require(header[0]==='Student ID','First header must be Student ID');
 require(header.length>=2&&new Set(header).size===header.length,'Use unique headers including at least one result column');
 const columns=header.slice(1).map(h=>{
  if(h==='Status')return {status:true};
  const item=assessment.items.find(i=>i.id===h);
  require(item,'Unknown item column: '+h+' (use item IDs from the template)');return {item};
 });
 const byStudent=new Map(rows.map(r=>[r.studentId,r])),seen=new Set(),changes=[];
 for(const [i,line] of grid.entries()){
  if(line.every(v=>!v.trim()))continue;
  require(line.length===header.length,'Row '+(i+2)+' has the wrong number of columns');
  const id=line[0].trim(),r=byStudent.get(id);
  require(r&&r.editable,'Unknown or non-editable student ID: '+id);
  require(!seen.has(id),'Duplicate student ID: '+id);seen.add(id);
  let status=r.entryStatus,marks={...r.marks},changedMarks=false,explicitStatus=false;
  for(const [j,col] of columns.entries()){
   const raw=line[j+1].trim();if(!raw)continue; // Blank does not overwrite.
   if(col.status){require(['present','absent','missing'].includes(raw.toLowerCase()),'Invalid status for '+id);status=raw.toLowerCase();explicitStatus=true;continue;}
   if(raw.toUpperCase()==='CLEAR'){delete marks[col.item.id];changedMarks=true;continue;}
   marks[col.item.id]=cellMark(raw,col.item);changedMarks=true;
  }
  if(!explicitStatus&&changedMarks)status='present';
  if(status!=='present'){
   require(!columns.some((col,j)=>col.item&&line[j+1].trim()&&line[j+1].trim().toUpperCase()!=='CLEAR'),'Absent/missing row cannot include numeric marks: '+id);
   marks={};
  }
  if(status!==r.entryStatus||JSON.stringify(marks)!==JSON.stringify(r.marks))changes.push({enrolmentId:r.enrolmentId,studentId:id,name:r.name,status,marks});
 }
 require(changes.length,'No changes found in import');
 return changes;
}
export function csvTemplate(a,rows){
 const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 return [['Student ID','Status',...a.items.map(i=>i.id)],...rows.filter(r=>r.editable).map(r=>[r.studentId,r.entryStatus==='missing'?'':r.entryStatus,...a.items.map(i=>r.marks[i.id]??'')])].map(row=>row.map(quote).join(',')).join('\r\n');
}
export function createMarkbook(data,access,classId,scope){
 const ix=indexData(data),c=ix.classes.get(classId);
 require(c,'Unknown class');
 const ids=new Set(access.scopeEnrolments(scope)),enrolments=(ix.enrolmentsByClass.get(classId)??[]).filter(e=>ids.has(e.id));
 require(enrolments.length||access.canViewClass(classId),'Class outside current demo scope');
 const course=ix.courses.get(c.courseId),engine=createAnalytics(data),scheme=ix.gradeSchemes.get(course.gradeSchemeId);
 const units=data.units.filter(u=>u.courseId===course.id).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 const visible=a=>a.status==='published'||a.classIds.some(id=>access.teaches(id)||access.leads(id));
 const assessments=data.assessments.filter(a=>a.classIds.includes(classId)&&(a.status==='published'||access.teaches(classId)||access.leads(classId))).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const assignmentOptions=permittedAssignments(data,access,classId);
 const templates=data.assessments.filter(a=>a.courseId===course.id&&a.classIds.some(id=>access.canViewClass(id))&&visible(a))
  .map(a=>({id:a.id,title:a.title,date:a.date,mode:a.mode,unitId:a.unitId}));
 const rowBase=e=>({enrolmentId:e.id,studentId:e.studentId,name:ix.students.get(e.studentId).name,tutorGroupId:ix.students.get(e.studentId).tutorGroupId,houseId:ix.students.get(e.studentId).houseId});
 const ordered=[...enrolments].sort((a,b)=>ix.students.get(a.studentId).name.localeCompare(ix.students.get(b.studentId).name,'en',{numeric:true}));
 function detail(id){
  const a=assessments.find(a=>a.id===id);require(a,'Assessment outside current class/scope');
  const bands=ix.gradeSchemes.get(a.gradeSchemeId).bands;
  const rows=ordered.map(e=>{
   const result=engine.resultFor(a.id,e.id),record=ix.resultsByPair.get(resultKey(a.id,e.id));
   return {...rowBase(e),...result,entryStatus:record?.status??'missing',editable:access.canEditResult(a.id,e.id)};
  });
  const coverage=engine.assessmentAnalysis(id,{classIds:[classId],enrolmentIds:ordered.map(e=>e.id)}).coverage;
  return {assessment:a,bands,rows,coverage,maxMarks:maxMarks(a),manageable:access.canManageAssessment(id),
    editable:rows.some(r=>r.editable),locked:data.results.some(r=>r.assessmentId===id),
    affectedClasses:a.classIds.map(id=>ix.classes.get(id).code),
    affectedPupils:data.enrolments.filter(e=>a.classIds.includes(e.classId)).length};
 }
 function template(id){
  require(templates.some(t=>t.id===id),'Template outside your accessible course');
  const a=ix.assessments.get(id);return {...clone(a),bands:clone(ix.gradeSchemes.get(a.gradeSchemeId).bands)};
 }
 const overviewCache=new Map();
 function overview(unitId){
  const key=unitId||'';if(overviewCache.has(key))return overviewCache.get(key);
  const selected=assessments.filter(a=>!unitId||a.unitId===unitId);
  const value={assessments:selected.map(a=>({ ...a,maxMarks:maxMarks(a),bands:ix.gradeSchemes.get(a.gradeSchemeId).bands,manageable:access.canManageAssessment(a.id)})),
    rows:ordered.map(e=>({...rowBase(e),summary:unitId?engine.unitSummary(e.id,unitId):engine.studentSummary(e.id),
      results:Object.fromEntries(selected.map(a=>[a.id,{...engine.resultFor(a.id,e.id),entryStatus:ix.resultsByPair.get(resultKey(a.id,e.id))?.status??'missing',editable:access.canEditResult(a.id,e.id)}]))}))};
  overviewCache.set(key,value);return value;
 }
 return {classId,classCode:c.code,course,units,assessments,templates,assignmentOptions,canCreate:assignmentOptions.length>0,
   canCreateUnit:access.leads(classId),defaultBands:scheme.bands,detail,template,overview};
}
