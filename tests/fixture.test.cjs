const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const sandbox = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','data.js'),'utf8'),sandbox);
const {students,classes,tasks,resources,events} = sandbox.window.SchoolHubData;

test('demo has a unique, complete student roster',()=>{
  assert.ok(students.length>=12);
  assert.equal(new Set(students.map(s=>s.id)).size,students.length);
  assert.equal(new Set(students.map(s=>s.name)).size,students.length);
  for(const s of students){
    assert.ok(s.name && s.initials && s.form);
    assert.ok(Number.isInteger(s.year));
    assert.ok(s.score>=0 && s.score<=100);
    assert.ok(s.previous>=0 && s.previous<=100);
    assert.ok(Array.isArray(s.subjects) && s.subjects.length>0);
    assert.ok(Array.isArray(s.assessments) && s.assessments.length>0);
    assert.ok(classes.some(c=>c.id===s.classId),s.id+' unknown class');
  }
});
test('sample tasks refer only to existing demo students and classes',()=>{
  assert.ok(tasks.length>=3);
  for(const t of tasks){
    assert.ok(t.title && t.roles.length>0);
    if(t.studentId) assert.ok(students.some(s=>s.id===t.studentId));
    if(t.classId) assert.ok(classes.some(c=>c.id===t.classId));
  }
});
test('all sample classes have demo students',()=>{
  for(const c of classes)assert.ok(students.some(s=>s.classId===c.id),c.id);
});
test('information and event concepts are populated',()=>{
  assert.ok(resources.length>0);
  assert.ok(events.length>0);
});
test('HTML loads fixture before UI logic',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.ok(html.indexOf('./data.js')<html.indexOf('./app.js'));
  assert.match(html,/noindex,\s*nofollow/);
});
