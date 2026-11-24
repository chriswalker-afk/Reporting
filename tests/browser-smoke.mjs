// Dependency-free real Chromium smoke test for the hosted demo.
// Run with Node 22+ and Chrome/Chromium (CHROME_BIN can override detection).
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const chrome=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>x&&existsSync(x));
assert.ok(chrome,'Chrome not found. Install Chromium or set CHROME_BIN.');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  let path=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(path!==resolve(root)&&!path.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
  if((await stat(path)).isDirectory())path=join(path,'index.html');
  res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(path));
 }catch{res.writeHead(404).end();}
});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=10000){
 const end=Date.now()+timeout;
 let last;
 while(Date.now()<end){
  try{const v=await fn();if(v)return v;}catch(error){last=error;}
  await delay(70);
 }
 throw Error('Timed out: '+label+(last?' ('+last.message+')':''));
}
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const profile=await mkdtemp(join(tmpdir(),'jis-hub-browser-'));
const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','ignore']});
let socket,serial=0,dialogs=[],errors=[],page;
const pending=new Map();
try{
 const port=await until(async()=>Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome debugging port');
 const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 page=targets.find(t=>t.type==='page');assert.ok(page);
 socket=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((res,rej)=>{socket.addEventListener('open',res,{once:true});socket.addEventListener('error',rej,{once:true});});
 function send(method,params={}){
  return new Promise((resolve,reject)=>{
   const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);
   pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
  });
 }
 socket.addEventListener('message',event=>{
  const msg=JSON.parse(event.data);
  if(msg.id){const p=pending.get(msg.id);if(p){clearTimeout(p.timer);pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);}return;}
  if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description??msg.params.exceptionDetails.text);
  if(msg.method==='Page.javascriptDialogOpening'){
   const planned=dialogs.shift();if(!planned)errors.push('Unexpected browser dialog: '+msg.params.message);
   else if(!msg.params.message.includes(planned.contains))errors.push('Unexpected confirmation: '+msg.params.message);
   send('Page.handleJavaScriptDialog',{accept:planned?.accept??false}).catch(error=>errors.push(error.message));
  }
 });
 await send('Page.enable');await send('Runtime.enable');
 const evaluate=async(fn,...args)=>{
  const expression='('+fn.toString()+')('+args.map(v=>JSON.stringify(v)).join(',')+')';
  const res=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(res.exceptionDetails)throw Error(res.exceptionDetails.exception?.description??res.exceptionDetails.text);
  return res.result.value;
 };
 const q=selector=>evaluate(sel=>Boolean(document.querySelector(sel)),selector);
 const click=async(selector)=>{
  await evaluate(sel=>{const el=document.querySelector(sel);if(!el)throw Error('Missing control: '+sel);if(el.disabled)throw Error('Disabled control: '+sel);el.focus();el.click();},selector);
 };
 const action=(name,id,within='')=>click(within+'[data-action="'+name+'"]'+(id===undefined?'':'[data-id='+JSON.stringify(id)+']'));
 const fill=async(selector,value)=>evaluate((sel,val)=>{const el=document.querySelector(sel);if(!el)throw Error('Missing input: '+sel);el.focus();if(el.type==='checkbox')el.checked=Boolean(val);else el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},selector,value);
 const text=sel=>evaluate(s=>document.querySelector(s)?.textContent??'',sel);
 const heading=()=>text('#workspace h1');
 const detail=()=>text('#detail-title');
 const close=()=>action('close-detail',undefined,'#detail-dialog ');
 const open=async(path='')=>{await send('Page.navigate',{url:origin+'/'+path});await until(()=>evaluate(url=>location.href===url&&document.readyState==='complete'&&Boolean(document.querySelector('#workspace h1')),origin+'/'+path),'workspace ready');};
 const viewport=async(width,height)=>{
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await delay(80);
  const dimensions=await evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth,main:document.querySelector('#workspace').getBoundingClientRect().width}));
  assert.ok(dimensions.body<=dimensions.viewport+1,'Page overflows viewport: '+JSON.stringify(dimensions));
  assert.ok(dimensions.main>0);
 };
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await open();
 assert.match(await heading(),/Welcome, Sam/);
 assert.ok(await q('.jis-crest'));assert.ok(await q('.jis-welcome-photo img'));
 assert.ok(await q('.home-dashboard[data-home-scope="faculty"]'));
 assert.match(await text('.home-role-context'),/Faculty dashboard.*Mathematics/);
 assert.ok(await q('.home-cohort [data-action="home-markbook"]'));
 await action('home-markbook',undefined,'.home-cohort ');
 assert.ok(await q('[data-action="class-tab"][data-id="markbook"][aria-pressed="true"]'));
 await action('navigate','home');
 await until(()=>evaluate(()=>[...document.querySelectorAll('.jis-crest,.jis-welcome-photo img')].every(img=>img.complete&&img.naturalWidth>0)),'JIS crest and campus photo loaded');
 for(const page of ['notices','classes','students','intervention','home']){
  await action('navigate',page);assert.ok(await heading());assert.equal(await evaluate(()=>location.hash),'#'+page);
 }
 // Notice acknowledgement is visible immediately and stays committed across navigation.
 await action('open-notice','NO1','#workspace ');
 assert.match(await detail(),/Demo staff notice/);
 if(await q('#detail-dialog [data-action="ack-notice"]'))await action('ack-notice','NO1','#detail-dialog ');
 assert.ok(!(await q('#detail-dialog [data-action="ack-notice"]')));
 await close();
 // Quick role guide opens exact course and active tab.
 await action('demo-guide');
 assert.equal(await evaluate(()=>document.querySelectorAll('#detail-dialog .house-directory .house-logo').length),16);
 await evaluate(()=>document.querySelectorAll('#detail-dialog .house-directory img').forEach(img=>img.loading='eager'));
 await until(()=>evaluate(()=>[...document.querySelectorAll('#detail-dialog .house-directory img')].every(img=>img.complete&&img.naturalWidth>0)),'all sixteen local House logos loaded');
 await action('demo-scenario','faculty','#detail-dialog ');
 assert.equal(await evaluate(()=>location.hash),'#classes/11-maths-1/markbook');
 assert.ok(await q('[data-action="class-tab"][data-id="markbook"][aria-pressed="true"]'));
 const markbookId=JSON.stringify(['11-maths-1','11-maths-A3','']);
 assert.ok(await q('.tracker-coverage'));
 const pupilMarkId=JSON.stringify(['11-maths-1','11-maths-A3','P121@11-maths']);
 const clickRecord=async(action,id)=>evaluate((name,key)=>{const el=[...document.querySelectorAll('[data-action="'+name+'"]')].find(e=>e.dataset.id===key);if(!el)throw Error('Missing record link '+name);el.click();},action,id);
 await clickRecord('open-markbook',pupilMarkId);
 assert.ok(await q('[data-mark-row="P121@11-maths"].requested-mark-row'));
 assert.equal(await evaluate(()=>document.activeElement.closest('tr')?.dataset.markRow),'P121@11-maths');
 assert.match(await text('#mark-focus'),/Demo Student 121/);
 const press=async(key,mods={})=>evaluate((key,mods)=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...mods})),key,mods);
 await evaluate(()=>document.querySelector('[data-mark-row="P121@11-maths"] [data-item="q1"]').focus());
 await press('Tab');assert.equal(await evaluate(()=>document.activeElement.dataset.item),'q2');
 await press('Tab',{shiftKey:true});assert.equal(await evaluate(()=>document.activeElement.dataset.item),'q1');
 await press('ArrowDown');assert.equal(await evaluate(()=>document.activeElement.dataset.row),'1');
 await press('Enter',{shiftKey:true});assert.equal(await evaluate(()=>document.activeElement.dataset.row),'0');
 assert.ok(await evaluate(()=>document.activeElement.matches('.mark-cell')&&document.activeElement.closest('tr').classList.contains('mark-row-focus')));
 assert.match(await text('#mark-focus'),/Demo Student 121/);
 await close();
 // data-id contains quotes, so use matching via dataset rather than CSS escaping.
 await evaluate(id=>{const el=[...document.querySelectorAll('[data-action="open-markbook"]')].find(e=>e.dataset.id===id);if(!el)throw Error('Missing assessment');el.click();},markbookId);
 assert.ok(await q('#mark-grid-form'));
 assert.ok(await q('[data-mark-row="P121@11-maths"] .house-logo[src$="/argus.jpg"]'));
 const mark='[data-mark-row="P121@11-maths"] [data-item="q1"]';
 const original=await evaluate(sel=>document.querySelector(sel).value,mark);
 const pendingButton=await evaluate(()=>!document.querySelector('[data-action="next-unfinished-mark"]').disabled);
 if(pendingButton){
  await action('next-unfinished-mark',undefined,'#detail-dialog ');
  assert.ok(await evaluate(()=>['missing','incomplete','invalid'].includes(document.activeElement.closest('tr').dataset.entryState)));
 }
 await fill(mark,'9999');assert.equal(await text('#entry-stat-invalid'),'1');
 assert.ok(await q(mark+'[aria-invalid=true]'));
 assert.match(await text('#mark-dirty'),/Unsaved changes/);
 assert.ok(await q('[data-mark-row="P121@11-maths"].changed-mark-row'));
 await fill(mark,original==='6'?'5':'6');
 assert.equal(await text('#entry-stat-invalid'),'0');
 dialogs.push({contains:'Discard unsaved marks',accept:false});await close();
 assert.ok(await q('#detail-dialog[open]'));
 await evaluate(sel=>{
  const cell=document.querySelector(sel),data=new DataTransfer();data.setData('text/plain','6\t10\t14');
  cell.focus();cell.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
 },mark);
 assert.equal(await text('[data-mark-row="P121@11-maths"] [data-preview="percent"]'),'100.0%');
 await press('s',{ctrlKey:true});
 assert.equal(await text('[data-mark-row="P121@11-maths"] [data-preview="percent"]'),'100.0%');
 assert.match(await text('#mark-dirty'),/No unsaved changes/);
 await close();
 await clickRecord('markbook-analysis',markbookId);
 assert.equal(await evaluate(()=>location.hash),'#classes/11-maths-1/class-analysis');
 assert.equal(await evaluate(()=>document.querySelector('#analysis-assessment').value),'11-maths-A3');
 assert.match(await text('.analysis-focus'),/Follow up assessment evidence/);
 assert.ok(await q('.teaching-evidence'));
 await click('.teaching-evidence');
 assert.match(await text('#detail-dialog'),/contributing pupil records/);
 assert.ok(await q('#detail-dialog [data-action="open-markbook"]'));
 await close();
 assert.ok(await q('.frequency-bin'));
 await evaluate(()=>{const bins=[...document.querySelectorAll('.frequency-bin')];bins.at(-1).click();});
 assert.match(await text('#detail-dialog'),/Demo Student 121/);await close();
 await evaluate(()=>history.back());await until(()=>q('[data-action="class-tab"][data-id="markbook"][aria-pressed="true"]'),'Back returns to markbook');
 await action('class-tab','information');
 assert.ok(await q('.class-register[data-register-layout="daily"]'));
 const dailyColumns=await evaluate(()=>document.querySelectorAll('.roster-table thead th').length);
 await action('register-preset','full');
 assert.ok(await q('.class-register[data-register-layout="full"]'));
 assert.ok(await evaluate(n=>document.querySelectorAll('.roster-table thead th').length>n,dailyColumns));
 await action('register-preset','daily');
 await action('toggle-register-filters');
 assert.ok(await evaluate(()=>!document.querySelector('#register-extra-filters').hidden));
 await action('toggle-register-filters');
 assert.ok(await evaluate(()=>document.querySelector('#register-extra-filters').hidden));
 await action('register-focus','below');
 assert.ok(await q('[data-action="register-focus"][data-id="below"][aria-pressed="true"]'));
 const belowCount=await evaluate(()=>Number(document.querySelector('[data-action="register-focus"][data-id="below"] strong').textContent));
 assert.equal(await evaluate(()=>document.querySelectorAll('.roster-table tbody tr').length),belowCount);
 await action('register-focus','all');
 await action('sort','roster:name');
 await action('sort','roster:name');
 const peerOrder=await evaluate(()=>[...document.querySelectorAll('.roster-table [data-action="open-student"]')].map(e=>e.dataset.id));
 assert.ok(peerOrder.length>1);
 await action('open-student',peerOrder[0],'.roster-table ');
 assert.deepEqual(await evaluate(()=>[...document.querySelectorAll('#profile-pupil option')].map(e=>e.value)),peerOrder);
 await action('profile-tab','assessments','#detail-dialog ');
 assert.match(await evaluate(()=>document.querySelector('#profile-subject').value),/@11-maths$/);
 await action('profile-switch',peerOrder[1],'#detail-dialog ');
 assert.equal(await evaluate(()=>document.querySelector('#profile-pupil').value),peerOrder[1]);
 assert.equal(await evaluate(()=>document.querySelector('#profile-subject').value),peerOrder[1]+'@11-maths');
 await close();
 await action('open-pupil-history','P121@11-maths','.roster-table ');
 assert.ok(await q('#detail-dialog [data-action="profile-tab"][data-id="assessments"][aria-pressed="true"]'));
 assert.equal(await evaluate(()=>document.querySelector('#profile-subject').value),'P121@11-maths');
 await action('profile-tab','overview','#detail-dialog ');
 await click('#profile-filter-below');
 assert.ok(await q('#profile-filter-below[aria-pressed="true"]'));
 await click('#profile-filter-all');
 assert.ok(await q('#profile-filter-all[aria-pressed="true"]'));
 await close();
 await action('open-markbook',undefined,'.register-mark-shortcut ');
 assert.ok(await q('#mark-grid-form'));await close();
 await action('edit-prediction','P121@11-maths');
 await fill('#prediction','8');
 dialogs.push({contains:'Discard unsaved form',accept:false});await close();
 assert.ok(await q('#prediction-form'));
 await click('#prediction-form button[type=submit]');
 assert.ok(!(await q('#detail-dialog[open]')));
 await action('open-student','P121');
 assert.ok(await q('#detail-dialog .house-badge-large img[src$="/argus.jpg"]'));
 await action('profile-tab','assessments','#detail-dialog ');
 assert.match(await text('#detail-dialog'),/Published assessment history/);
 await action('profile-tab','support','#detail-dialog ');
 assert.match(await text('#detail-dialog'),/Active interventions/);
 await close();
 // A direct queue action is editable; cancellation protects unsaved case input.
 await action('navigate','intervention');
 assert.equal(await evaluate(()=>document.querySelectorAll('.case-stage-card').length),3);
 await action('case-focus','w1');
 assert.equal(await evaluate(()=>document.querySelector('#case-filter').value),'w1');
 assert.ok(await q('.case-stage-card[data-id="w1"][aria-pressed="true"]'));
 await action('case-focus','study');
 assert.equal(await evaluate(()=>document.querySelector('#case-filter').value),'study');
 await action('open-case-plan','I001');
 assert.ok(await q('#detail-dialog.wide-case #case-study-plan'));
 assert.equal(await evaluate(()=>document.activeElement.id),'case-study-plan');
 assert.match(await text('#case-study-plan'),/Measurable target/);
 await viewport(390,844);
 assert.ok(await evaluate(()=>document.querySelector('#detail-dialog').getBoundingClientRect().width<=innerWidth));
 await viewport(1440,900);
 await close();
 await action('case-focus','actions');
 assert.match(await text('.intervention-register'),/My outstanding actions/);
 assert.equal(await evaluate(()=>document.querySelector('#case-filter').value),'actions');
 await action('case-focus','active');
 await action('open-case','I001');
 assert.ok(await q('[data-case-task="review"]'));
 assert.ok(await q('[data-case-task="reviewStudyPlan"]'));
 assert.ok(await q('.case-step[data-wave-state="active"]'));
 assert.match(await text('#detail-dialog'),/Next responsibilities/);
 await evaluate(()=>{const el=[...document.querySelectorAll('#detail-dialog [data-action="case-action"]')].find(b=>JSON.parse(b.dataset.id)[1]==='update');if(!el)throw Error('Missing progress update');el.click();});
 await fill('#case-text','Demo browser smoke academic observation');
 dialogs.push({contains:'Discard unsaved form',accept:false});await action('detail-back',undefined,'#detail-dialog ');
 assert.ok(await q('#intervention-form'));
 await click('#intervention-form button[type=submit]');
 assert.match(await text('#detail-dialog'),/Demo browser smoke academic observation/);
 await close();
 // Reload validates local persistence, not just a hash change in the same document.
 await send('Page.navigate',{url:'about:blank'});await until(()=>evaluate(()=>location.href==='about:blank'),'unloaded previous document');
 await open('#classes/11-maths-1/markbook');
 assert.ok(await q('[data-action="class-tab"][data-id="markbook"][aria-pressed="true"]'));
 await evaluate(id=>[...document.querySelectorAll('[data-action="open-markbook"]')].find(e=>e.dataset.id===id).click(),markbookId);
 assert.equal(await text('[data-mark-row="P121@11-maths"] [data-preview="percent"]'),'100.0%');
 // Explicitly verify the new assessment surfaces at phone width, not just the Home shell.
 await viewport(390,844);
 assert.ok(await evaluate(()=>{const d=document.querySelector('#detail-dialog'),t=d.querySelector('.entry-table');return d.getBoundingClientRect().width<=innerWidth&&t.scrollWidth>=t.clientWidth&&t.getBoundingClientRect().width<=innerWidth;}));
 await close();
 await clickRecord('markbook-analysis',markbookId);await viewport(390,844);
 await viewport(1440,900);
 await action('demo-guide');await action('demo-scenario','tutor','#detail-dialog ');
 assert.equal(await evaluate(()=>document.querySelector('#scope').value),'tutor');
 assert.match(await heading(),/Students/);
 await action('navigate','home');
 assert.ok(await q('.home-dashboard[data-home-scope="tutor"]'));
 assert.match(await text('.home-cohort'),/Tutees to review/);
 assert.ok(await q('.home-cohort .house-logo'));
 await action('go-students-below');
 assert.equal(await evaluate(()=>document.querySelector('#student-attainment').value),'below');
 await action('demo-guide');await action('demo-scenario','house','#detail-dialog ');
 assert.equal(await evaluate(()=>document.querySelector('#scope').value),'house');
 assert.match(await heading(),/Intervention/);
 await action('navigate','home');
 assert.ok(await q('.home-dashboard[data-home-scope="house"]'));
 assert.match(await text('.home-cohort'),/House academic overview/);
 const group=await evaluate(()=>JSON.parse(document.querySelector('.home-cohort [data-action="home-group"]').dataset.id));
 await action('home-group',undefined,'.home-cohort ');
 assert.equal(await evaluate(()=>document.querySelector('#house-filter').value),group[1]);
 await action('demo-guide');await action('demo-scenario','leadership','#detail-dialog ');
 assert.equal(await evaluate(()=>document.querySelector('#scope').value),'school');
 assert.match(await heading(),/Welcome, Avery/);
 assert.ok(await q('.home-dashboard[data-home-scope="school"]'));
 assert.match(await text('.home-cohort'),/Year-group overview/);
 assert.equal(await evaluate(()=>document.querySelectorAll('.home-cohort tbody tr').length),7);
 await action('home-group',undefined,'.home-cohort ');
 assert.equal(await evaluate(()=>document.querySelector('#student-year').value),'7');
 await action('navigate','home');
 for(const [width,height] of [[1280,720],[768,1024],[390,844],[360,800]]){
  await viewport(width,height);
  if(width<=760)await action('mobile-menu');
  await action('navigate','classes');await viewport(width,height);
  if(width<=760)await action('mobile-menu');
  await action('navigate','students');await viewport(width,height);
  if(width<=760)await action('mobile-menu');
  await action('navigate','home');await viewport(width,height);
 }
 await open('v2/#classes/11-maths-1/class-analysis');
 assert.ok(await q('[data-action="class-tab"][data-id="class-analysis"][aria-pressed="true"]'));
 await until(()=>evaluate(()=>{const img=document.querySelector('.jis-crest');return img?.complete&&img.naturalWidth>0;}),'alternate entrypoint crest loaded');
 assert.equal(dialogs.length,0,'Expected discard confirmations were not shown');
 assert.deepEqual(errors,[],'Unhandled browser exceptions or unexpected dialogs');
 console.log('Browser smoke passed: all destinations, role shortcuts, mark edit/save/reload, analysis drilldown, back navigation, unsaved guards, profile, case update, alternate entrypoint and four viewport sizes.');
}finally{
 socket?.close();child.kill();await new Promise(r=>server.close(r));
 await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});
}
