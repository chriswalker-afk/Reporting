// Local presentation only: a page's scale is independent of browser zoom,
// workspace density, sidebar state, school records and gradebook layouts.
export const PAGE_ZOOM_MIN=70;
export const PAGE_ZOOM_MAX=150;
export const PAGE_ZOOM_STEP=10;
export const PAGE_ZOOM_DEFAULT=100;
const TABS=['information','markbook','report-grades','student-analysis','class-analysis','faculty-analysis'];
const VIEWS=['home','notices','classes','students','intervention',...TABS.map(tab=>'classes:'+tab)];
export const pageZoomKey=({page,classId,classTab}={})=>{
 if(page==='classes'&&classId)return 'classes:'+(TABS.includes(classTab)?classTab:'information');
 return VIEWS.includes(page)&&!page.includes(':')?page:'home';
};
export const pageZoomStorageKey=staffId=>'jis-hub-v2-page-zoom-1:'+String(staffId);
export function normalizeZoom(value){
 if(typeof value!=='number'||!Number.isFinite(value))return PAGE_ZOOM_DEFAULT;
 return Math.max(PAGE_ZOOM_MIN,Math.min(PAGE_ZOOM_MAX,Math.round(value/PAGE_ZOOM_STEP)*PAGE_ZOOM_STEP));
}
export function normalizeZoomPrefs(input){
 const value=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 return Object.fromEntries(VIEWS.filter(key=>Object.hasOwn(value,key)).map(key=>[key,normalizeZoom(value[key])]).filter(([,zoom])=>zoom!==PAGE_ZOOM_DEFAULT));
}
export function loadPageZoom(storage,staffId){
 try{return normalizeZoomPrefs(JSON.parse(storage?.getItem(pageZoomStorageKey(staffId))??'null'));}catch{return {};}
}
export function savePageZoom(storage,staffId,value){
 try{if(!storage)return false;storage.setItem(pageZoomStorageKey(staffId),JSON.stringify(normalizeZoomPrefs(value)));return true;}catch{return false;}
}
export function zoomControls({focus=false}={}){
 return '<div class="page-zoom-controls'+(focus?' page-zoom-focus':'')+'" role="group" aria-label="Page zoom" data-page-zoom-controls><span class="page-zoom-caption">Zoom</span><button type="button" class="btn page-zoom-step" data-action="page-zoom-out" aria-label="Zoom out" title="Zoom out (10%)">−</button><button type="button" class="btn page-zoom-value" data-action="page-zoom-reset" aria-label="Reset page zoom to 100%" title="Reset page zoom to 100%"><span data-page-zoom-value>100%</span></button><button type="button" class="btn page-zoom-step" data-action="page-zoom-in" aria-label="Zoom in" title="Zoom in (10%)">+</button></div>';
}
export function createPageZoom({app,main,getStaff,getView,notify=()=>{}}){
 const win=app.ownerDocument.defaultView,doc=app.ownerDocument,prefs=new Map();
 const storage=()=>{try{return win.localStorage;}catch{return null;}};
 const values=()=>{const staff=getStaff();if(!prefs.has(staff))prefs.set(staff,loadPageZoom(storage(),staff));return prefs.get(staff);};
 const current=()=>values()[pageZoomKey(getView())]??PAGE_ZOOM_DEFAULT;
 function sync(){
  const level=current(),scale=level/100;
  // zoom (unlike transform:scale) participates in layout and reflow. The
  // viewport, the shell and the normal footer controls are never scaled.
  main.dataset.pageZoom=String(level);
  main.style.setProperty('--page-zoom',String(scale));
  main.style.setProperty('--page-zoom-inverse',String(1/scale));
  for(const group of app.querySelectorAll('[data-page-zoom-controls]')){
   const reset=group.querySelector('[data-action="page-zoom-reset"]');
   group.querySelector('[data-page-zoom-value]').textContent=level+'%';
   reset.setAttribute('aria-label','Reset page zoom to 100% (currently '+level+'%)');
   for(const [action,disabled] of [['page-zoom-out',level<=PAGE_ZOOM_MIN],['page-zoom-in',level>=PAGE_ZOOM_MAX]]){
    const button=group.querySelector('[data-action="'+action+'"]');
    if(disabled&&doc.activeElement===button)reset.focus({preventScroll:true});
    button.disabled=disabled;
   }
  }
  return level;
 }
 function persist(value){
  const staff=getStaff(),normalized=normalizeZoomPrefs(value);prefs.set(staff,normalized);
  if(!savePageZoom(storage(),staff,normalized))notify('Zoom preference saved for this session only.');
 }
 function change(action){
  if(!['page-zoom-in','page-zoom-out','page-zoom-reset'].includes(action))return false;
  const before=current(),next=action==='page-zoom-reset'?PAGE_ZOOM_DEFAULT:normalizeZoom(before+(action==='page-zoom-in'?PAGE_ZOOM_STEP:-PAGE_ZOOM_STEP));
  if(next===before)return true;
  // Preserve local scroll offsets (clamped by the new layout), and do not
  // remount inputs, alter selection, or call the gradebook's save guard.
  const scrolls=[main,...main.querySelectorAll('.table-scroll,.register-cards,.gradebook-secondary-panels,.tabs')].map(node=>({node,top:node.scrollTop,left:node.scrollLeft}));
  persist({...values(),[pageZoomKey(getView())]:next});sync();
  for(const {node,top,left} of scrolls){node.scrollTop=top;node.scrollLeft=left;}
  return true;
 }
 function resetAll(){persist({});sync();}
 return {sync,change,resetAll,current};
}
