// Dedicated real Chromium responsive/accessibility matrix for the V2 demo.
// Run with Node 22+ and Chrome/Chromium (CHROME_BIN can override detection).
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CLASS_TABS} from '../v2/workspace.mjs';

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
const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
let chromeLog='';child.stderr.on('data',chunk=>{chromeLog=(chromeLog+chunk.toString()).slice(-6000);});
let socket,serial=0,dialogs=[],errors=[],page;
const pending=new Map();
try{
 const port=await until(async()=>Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome debugging port',30000).catch(error=>{throw Error(error.message+'\n'+chromeLog);});
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
 const pages=['home','notices','classes','students','intervention'];
 const sizes=[
  [320,568,'small phone'],[390,844,'phone'],[844,390,'landscape phone'],
  [768,1024,'portrait tablet'],[1024,768,'landscape tablet'],
  [1280,720,'small laptop'],[1366,768,'school laptop'],
  [1920,1080,'desktop'],[2560,1440,'large monitor'],
  // Effective CSS viewport at 125%, 150%, and 200% browser zoom.
  // This tests reflow, not the browser's own zoom UI or pinch gesture.
  [1024,576,'125% zoom reflow'],[853,480,'150% zoom reflow'],[640,360,'200% zoom reflow']
 ];
 let visits=0,drawerVisits=0;
 const observations=new Map();
 const observe=(label,issues)=>{for(const issue of issues){const key=issue.type+': '+issue.control;if(!observations.has(key))observations.set(key,{...issue,firstSeen:label});}};
 const visibleControl=async(actionName,record=null,scope='#workspace')=>evaluate((actionName,record,scope)=>{
  const shown=el=>el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true,contentVisibilityAuto:true})&&!el.closest('[inert]')&&!([...el.getClientRects()].length===0);
  const nodes=[...document.querySelectorAll(scope+' [data-action="'+CSS.escape(actionName)+'"]')];
  return nodes.find(el=>!el.disabled&&(record===null||el.dataset.id===record)&&shown(el))?.dataset.id??null;
 },actionName,record,scope);
 const activate=async(name,record=null,scope='#workspace')=>{
  const hit=await evaluate((name,record,scope)=>{
   const nodes=[...document.querySelectorAll(scope+' [data-action="'+CSS.escape(name)+'"]')];
   const el=nodes.find(el=>!el.disabled&&(record===null||el.dataset.id===record)&&el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true,contentVisibilityAuto:true})&&!el.closest('[inert]'));
   if(!el)return false;
   el.scrollIntoView({block:'center',inline:'nearest'});el.focus({preventScroll:true});el.click();return true;
  },name,record,scope);assert.ok(hit,'Reachable action missing: '+scope+' '+name+' '+record);
 };
 const navigatePage=async page=>{
  if(await evaluate(()=>document.querySelector('#app').dataset.workspaceNavigation==='overlay'))await action('mobile-menu');
  await activate('navigate',page,'#sidebar');
  const where=await evaluate(()=>({hash:location.hash,staff:document.querySelector('#staff')?.value,scope:document.querySelector('#scope')?.value,heading:document.querySelector('#workspace h1')?.textContent,error:document.querySelector('#gradebook-error')?.textContent,toast:document.querySelector('#toast')?.textContent,menu:document.querySelector('#sidebar')?.dataset.open}));
  assert.equal(where.hash,'#'+page,'Navigation failed: '+JSON.stringify(where)+'; browser errors: '+JSON.stringify(errors));
 };
 const screen=async (width,height)=>{
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await delay(40);
 };
 const inspect=async(label,{drawer=false}={})=>{
  const result=await evaluate(drawer=>{
   const root=drawer?document.querySelector('dialog[open]'):document.querySelector('#workspace'),viewportWidth=innerWidth,viewportHeight=innerHeight;
   const shown=el=>{if(!el?.checkVisibility({checkOpacity:true,checkVisibilityCSS:true,contentVisibilityAuto:true})||el.closest('[inert]'))return false;for(let p=el.parentElement;p;p=p.parentElement){if(p.tagName==='DETAILS'&&!p.open&&!p.querySelector(':scope > summary')?.contains(el))return false;}return true;};
   const label=el=>el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>document.getElementById(id)?.textContent??'').join(' ')||[...el.labels??[]].map(l=>l.textContent).join(' ')||el.title||(['BUTTON','A','SUMMARY'].includes(el.tagName)?el.textContent:'');
   const identify=el=>el.id||el.dataset.action||el.name||el.className?.toString().slice(0,90)||el.tagName;
   const rect=root.getBoundingClientRect(),issues=[],controls=[...root.querySelectorAll('button:not(:disabled),a[href],input:not([type="hidden"]):not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')].filter(shown);
   const ids=[...document.querySelectorAll('[id]')].map(el=>el.id),duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
   // Intentionally wide data tables are allowed to scroll within their own region.
   for(const el of root.querySelectorAll('.table-scroll,.entry-table,.tabs,.profile-tabs')){
    if(!shown(el)||el.scrollWidth<=el.clientWidth+2)continue;
    if(el.tabIndex<0)issues.push({type:'keyboard-scroll',control:identify(el)});
    if(!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby'))issues.push({type:'scroll-region-name',control:identify(el)});
   }
   for(const el of controls){
    const bounds=el.getBoundingClientRect();
    if(!label(el)?.trim())issues.push({type:'control-name',control:identify(el)});
    if(bounds.width<1||bounds.height<1)issues.push({type:'zero-sized-control',control:identify(el)});
   }
   const main=drawer?root.querySelector('.drawer-body')??root:root;
   const essential=drawer?[...root.querySelectorAll('.dialog-head button,.drawer-footer button')].filter(shown):[...document.querySelectorAll('#topbar button,#topbar select,.demo-footer button')].filter(shown);
   const offscreen=essential.filter(el=>{const b=el.getBoundingClientRect();return b.left< -2||b.right>viewportWidth+2;}).map(identify);
   return {width:viewportWidth,height:viewportHeight,documentWidth:document.documentElement.scrollWidth,rect:{left:rect.left,right:rect.right,height:rect.height,width:rect.width},mainHeight:main.clientHeight,outerOverflow:Math.max(0,main.scrollWidth-main.clientWidth),controls:controls.length,duplicates,offscreen,issues,heading:root.querySelector('h1,h2')?.textContent??''};
  },drawer);
  assert.ok(result.heading.trim(),label+': missing visible page heading');
  assert.ok(result.documentWidth<=result.width+1,label+': document overflows '+JSON.stringify(result));
  assert.ok(result.rect.width>0&&result.rect.height>0&&result.mainHeight>0,label+': collapsed workspace');
  assert.ok(result.rect.left>=-2&&result.rect.right<=result.width+2,label+': workspace outside viewport '+JSON.stringify(result.rect)+' / '+result.width);
  assert.deepEqual(result.duplicates,[],label+': duplicate IDs');
  assert.deepEqual(result.offscreen,[],label+': essential controls outside viewport');
  assert.ok(result.controls>0,label+': no available controls');
  assert.deepEqual(result.issues.filter(x=>x.type==='zero-sized-control'||x.type==='keyboard-scroll'||x.type==='scroll-region-name'),[],label+': unreachable or unnamed scroll region');
  observe(label,result.issues.filter(x=>x.type==='control-name'));
  if(result.outerOverflow>3)observe(label,[{type:'outer-horizontal-scroll',control:drawer?'detail drawer':await evaluate(()=>document.querySelector('.workspace-inner')?.dataset.workspacePage+':'+document.querySelector('.workspace-inner')?.dataset.workspaceTab),pixels:result.outerOverflow}]);
  if(drawer)drawerVisits++;else visits++;
 };
 // Use a fresh document per batch: hundreds of rapid synthetic history writes
 // in one document trigger Chromium's anti-abuse navigation rate limiter.
 // The existing smoke suite and final dirty-gradebook test cover same-document resizing.
 const fresh=async()=>{await send('Page.navigate',{url:'about:blank'});await until(()=>evaluate(()=>location.href==='about:blank'),'audit batch unloaded');await open('v2/#home');};
 await screen(1440,900);await fresh();
 // Exercise every main destination and all six class tabs at every size.
 for(const [width,height,label] of sizes){
  await screen(width,height);await fresh();console.log('Audit viewport:',label);
  for(const page of pages){await navigatePage(page);await inspect(label+' / '+page);}
  await navigatePage('classes');await activate('open-class','11-maths-1');
  for(const tab of CLASS_TABS){await activate('class-tab',tab);await inspect(label+' / '+tab);}
  // Full-screen and single-assessment entry use the same viewport bounds.
  await activate('class-tab','markbook');await activate('gradebook-focus-toggle');
  await inspect(label+' / focus');
  await activate('gradebook-entry-view','single');await inspect(label+' / single assessment focus');
  await activate('gradebook-entry-view','spreadsheet');await activate('gradebook-focus-toggle');
 }
 // Role and scope matrix: every preview identity and available scope, including
 // restricted tutor/House views, with actual data and authorised links.
 await screen(390,844);
 const staff=await evaluate(()=>[...document.querySelector('#staff').options].map(o=>o.value));
 let scopeCount=0;
 for(const id of staff){
  await fresh();await fill('#staff',id);
  const scopes=await evaluate(()=>[...document.querySelector('#scope').options].map(o=>o.value));
  for(const scope of scopes){
   await fill('#scope',scope);scopeCount++;console.log('Audit scope:',id,scope);
   for(const page of pages){await navigatePage(page);await inspect(id+' / '+scope+' / '+page);}
   await navigatePage('classes');
   const record=await visibleControl('open-class');
   if(record){
    await activate('open-class',record);
    await inspect(id+' / '+scope+' / class register');
    await activate('class-tab','markbook');await inspect(id+' / '+scope+' / gradebook');
   }
  }
 }
 await fresh();await fill('#staff','sam');await fill('#scope','faculty');await screen(1366,768);
 // Check representative drawers/forms across narrow, short and zoom-reflow sizes.
 const drawerSizes=sizes.filter((_,i)=>[0,1,2,3,6,11].includes(i));
 const inspectDrawer=async name=>{
  assert.ok(await q('#detail-dialog[open]'),name+' drawer missing');
  for(const [width,height,label] of drawerSizes){await screen(width,height);await inspect(name+' / '+label,{drawer:true});}
  await activate('drawer-expand',null,'#detail-dialog');await screen(390,844);await inspect(name+' / full-screen phone',{drawer:true});
  await activate('drawer-expand',null,'#detail-dialog');await screen(1366,768);await close();
 };
 await navigatePage('classes');await activate('open-class','11-maths-1');
 await activate('edit-prediction','P121@11-maths');await inspectDrawer('prediction form');
 await activate('open-student','P121');
 for(const tab of ['overview','assessments','comments','support']){
  await activate('profile-tab',tab,'#detail-dialog');await screen(320,568);await inspect('student profile '+tab,{drawer:true});
 }
 await inspectDrawer('student profile');
 await activate('class-tab','markbook');await activate('new-assessment');await inspectDrawer('assessment form');
 await activate('class-tab','report-grades');await activate('report-grade-detail');await inspectDrawer('report grade');
 await navigatePage('notices');await activate('open-notice');await inspectDrawer('notice');
 await activate('open-deadline');await inspectDrawer('deadline');
 await activate('new-notice');await inspectDrawer('notice form');
 await navigatePage('intervention');const caseRecord=await visibleControl('open-case');if(caseRecord){await activate('open-case',caseRecord);await inspectDrawer('intervention');}
 await fill('#staff','avery');await fill('#scope','school');await navigatePage('notices');await activate('new-deadline');await inspectDrawer('deadline form');
 // Native keyboard navigation and an accessible name from Chromium's AX tree.
 await fill('#staff','sam');await fill('#scope','faculty');await screen(390,844);
 await action('mobile-menu');assert.ok(await evaluate(()=>document.querySelector('.app-main').inert));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 assert.ok(await evaluate(()=>document.activeElement.closest('#sidebar')));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 assert.equal(await evaluate(()=>document.activeElement.dataset.action),'mobile-menu');
 const oldHash=await evaluate(()=>location.hash);await click('.skip-link');
 assert.equal(await evaluate(()=>document.activeElement.id),'workspace');assert.equal(await evaluate(()=>location.hash),oldHash);
 await action('search');assert.equal(await evaluate(()=>document.activeElement.id),'global-query');
 await inspect('global search / mobile',{drawer:true});
 const ax=await send('Accessibility.getFullAXTree');
 assert.ok(ax.nodes.some(n=>!n.ignored&&n.role?.value==='searchbox'&&n.name?.value==='Search your workspace'),'Search field accessible name');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 assert.ok(!(await q('#search-dialog[open]')));
 assert.equal(await evaluate(()=>document.activeElement.dataset.action),'search');
 await screen(1366,768);await navigatePage('classes');await activate('open-class','11-maths-1');
 const keyboardCell='.gradebook-cell[data-assessment="11-maths-A1"][data-enrolment="P121@11-maths"]';
 await activate('class-tab','markbook');await fill(keyboardCell,'19');
 await activate('gradebook-focus-toggle');await activate('gradebook-entry-view','single');
 await fill('#gradebook-single-assessment','11-maths-A1');await screen(320,568);
 assert.equal(await evaluate(s=>document.querySelector(s).value,keyboardCell),'19');
 assert.match(await text('#gradebook-save-status'),/unsaved/i);
 dialogs.push({contains:'Discard',accept:true});await activate('gradebook-discard');await activate('gradebook-entry-view','spreadsheet');await activate('gradebook-focus-toggle');
 assert.equal(dialogs.length,0);assert.deepEqual(errors,[]);
 // Findings are grouped rather than silently discarded. Non-blocking diagnostic
 // checks are listed in the CI log; assertions above enforce the critical gates.
 console.log(JSON.stringify({pageAndModeVisits:visits,drawerVisits,staff:staff.length,scopes:scopeCount,viewportCases:sizes.length,reviewObservations:[...observations.values()]},null,2));
}finally{
 socket?.close();child.kill();await new Promise(r=>server.close(r));
 await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});
}
