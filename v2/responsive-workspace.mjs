// Display-only preferences. They never participate in data transactions or routes.
export const WORKSPACE_PREFS_KEY='jis-hub-v2-workspace-display-1';
export const MOBILE_MAX=760;
export const COMPACT_WIDTH=1280;
export const COMPACT_HEIGHT=800;
export const DEFAULT_WORKSPACE_PREFS=Object.freeze({density:'auto',navigation:'auto'});
export function normalizeWorkspacePrefs(input){
 const p=input&&typeof input==='object'?input:{};
 return {density:['auto','standard','compact'].includes(p.density)?p.density:'auto',
  navigation:['auto','full','rail'].includes(p.navigation)?p.navigation:'auto'};
}
export const workspacePrefsKey=staffId=>WORKSPACE_PREFS_KEY+':'+String(staffId);
export function loadWorkspacePrefs(storage,staffId){
 try{return normalizeWorkspacePrefs(JSON.parse(storage?.getItem(workspacePrefsKey(staffId))??'null'));}catch{return normalizeWorkspacePrefs();}
}
export function saveWorkspacePrefs(storage,staffId,value){
 try{if(!storage)return false;storage.setItem(workspacePrefsKey(staffId),JSON.stringify(normalizeWorkspacePrefs(value)));return true;}catch{return false;}
}
export function workspaceLayout(prefs,width,height){
 const p=normalizeWorkspacePrefs(prefs),mobile=width<=MOBILE_MAX;
 const density=p.density==='auto'?(width<=COMPACT_WIDTH||height<=COMPACT_HEIGHT?'compact':'standard'):p.density;
 return {density,navigation:mobile?'overlay':p.navigation==='auto'?(density==='compact'?'rail':'full'):p.navigation};
}

// Mode changes and viewport changes only adjust DOM presentation. In particular,
// they never replace the spreadsheet, its selected range, undo stack or drafts.
export function createWorkspaceDisplay({app,main,sidebar,topbar,backdrop,getStaff,notify}){
 const prefs=new Map(),content=app.querySelector('.app-main'),win=app.ownerDocument.defaultView,doc=app.ownerDocument;
 let mobileOpen=false,staff=null,layout=null;
 const storage=()=>{try{return win.localStorage;}catch{return null;}};
 const current=()=>{const id=getStaff();if(!prefs.has(id))prefs.set(id,loadWorkspacePrefs(storage(),id));return prefs.get(id);};
 const menu=()=>topbar.querySelector('[data-action="mobile-menu"]');
 const desktopToggle=()=>topbar.querySelector('[data-action="toggle-workspace-navigation"]');
 const toggleText=()=>layout?.navigation==='rail'?'Expand navigation':'Collapse navigation';
 function sync(){
  const id=getStaff(),previous=layout,active=doc.activeElement;
  if(id!==staff){mobileOpen=false;staff=id;}
  const p=current();layout=workspaceLayout(p,win.innerWidth,win.innerHeight);
  if(layout.navigation!=='overlay')mobileOpen=false;
  app.dataset.workspaceDensity=layout.density;
  app.dataset.workspaceNavigation=layout.navigation;
  sidebar.dataset.open=String(mobileOpen);
  const overlay=layout.navigation==='overlay'&&mobileOpen;
  content.inert=overlay;
  sidebar.inert=layout.navigation==='overlay'&&!overlay;
  backdrop.hidden=!overlay;
  const m=menu();if(m){m.setAttribute('aria-expanded',String(overlay));m.setAttribute('aria-label',overlay?'Close navigation':'Open navigation');}
  const t=desktopToggle();if(t){t.setAttribute('aria-expanded',String(layout.navigation!=='rail'));t.setAttribute('aria-label',toggleText());t.title=toggleText();}
  const select=topbar.querySelector('#workspace-density');if(select)select.value=p.density;
  // Recover focus if resizing makes the previously focused navigation control invisible.
  if(previous?.navigation!==layout.navigation){
   if(layout.navigation==='overlay'&&sidebar.contains(active)&&!overlay)m?.focus({preventScroll:true});
   else if(layout.navigation!=='overlay'&&(active===m||active?.matches('[data-action="close-menu"]')))t?.focus({preventScroll:true});
   else if(layout.navigation==='overlay'&&active===t)m?.focus({preventScroll:true});
  }
  return layout;
 }
 function update(patch){
  const p=normalizeWorkspacePrefs({...current(),...patch}),id=getStaff();
  prefs.set(id,p);
  if(!saveWorkspacePrefs(storage(),id,p))notify('Display preference saved for this session only.');
  sync();
 }
 function openMenu(){
  if(layout?.navigation!=='overlay')return;
  mobileOpen=true;sync();sidebar.querySelector('[data-action="close-menu"]')?.focus({preventScroll:true});
 }
 function closeMenu({restore=true}={}){
  const was=mobileOpen;mobileOpen=false;sync();
  if(was&&restore)menu()?.focus({preventScroll:true});
 }
 function toggleMenu(){if(mobileOpen)closeMenu();else openMenu();}
 function toggleNavigation(){
  if(layout?.navigation==='overlay'){toggleMenu();return;}
  update({navigation:layout?.navigation==='rail'?'full':'rail'});
 }
 function keyboard(event){
  if(!mobileOpen)return false;
  if(event.key==='Escape'){event.preventDefault();closeMenu();return true;}
  if(event.key==='Tab'){
   const items=[...sidebar.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);
   if(!items.length)return false;
   const first=items[0],last=items.at(-1);
   if(event.shiftKey&&(doc.activeElement===first||!sidebar.contains(doc.activeElement))){event.preventDefault();last.focus();return true;}
   if(!event.shiftKey&&(doc.activeElement===last||!sidebar.contains(doc.activeElement))){event.preventDefault();first.focus();return true;}
  }
  // Prevent global search from opening behind the mobile navigation overlay.
  if(event.key==='/'||((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k')){event.preventDefault();return true;}
  return false;
 }
 return {sync,closeMenu,toggleMenu,toggleNavigation,keyboard,setDensity:value=>update({density:value}),
  reset:()=>update(DEFAULT_WORKSPACE_PREFS),isMenuOpen:()=>mobileOpen};
}
