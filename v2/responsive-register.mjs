// Render the same scoped rows as table and narrow-screen cards. The CSS
// displays exactly one representation; no record or filtering logic is duplicated.
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const REGISTER_VIEWS=['auto','table','cards'];
export const registerView=value=>REGISTER_VIEWS.includes(value)?value:'auto';
const primaryKeys={
 classes:['students','mean','below','cases','tracker'],
 roster:['average','grade','minimumGrade','gapToTarget','wave'],
 students:['year','tutorGroupId','directoryFlags','below','cases','due'],
 cases:['status','reviewDate','actionDate','actionType','nextActions'],
 reports:['reportGrade','status','action','calculated']
};
export const REGISTER_NAMES=Object.keys(primaryKeys);
export function splitRegisterColumns(name,columns,identity){
 const fields=columns.filter(c=>c[0]!==identity),primary=new Set(primaryKeys[name]??[]);
 return {primary:fields.filter(c=>primary.has(c[0])),secondary:fields.filter(c=>!primary.has(c[0]))};
}
export function renderResponsiveRegister(name,columns,rows,cell,table,state,{identity=columns[0][0],identityCell=null,sortable=true}={}){
 if(!REGISTER_NAMES.includes(name))return table;
 const view=registerView(state.registerPresentation?.[name]),{primary,secondary}=splitRegisterColumns(name,columns,identity);
 const field=(row,[key,label])=>'<div class="register-card-field"><dt>'+e(label)+'</dt><dd>'+cell(row,key)+'</dd></div>';
 const sort=state.sorts?.[name],sortOptions=sortable?columns.filter(c=>c[3]!==false):[];
 const sortControls=sortOptions.length?'<details class="register-card-sort"'+(sort?' open':'')+'><summary>Sort'+(sort?' · '+e(sortOptions.find(c=>c[0]===sort.key)?.[1]??'')+(sort.direction==='desc'?' ↓':' ↑'):'')+'</summary><div class="register-card-sort-options">'+sortOptions.map(([key,label])=>'<button type="button" class="btn btn-quiet" data-action="sort" data-id="'+e(name+':'+key)+'" aria-pressed="'+(sort?.key===key)+'">'+e(label)+(sort?.key===key?(sort.direction==='desc'?' ↓':' ↑'):'')+'</button>').join('')+'</div></details>':'';
 const cards='<div class="register-cards" aria-label="'+e(name==='roster'?'Class register':name==='reports'?'Reporting grades':name)+' cards">'+sortControls+
 rows.map(row=>'<article class="register-card"><div class="register-card-identity">'+(identityCell?identityCell(row):cell(row,identity))+'</div>'+
 '<dl class="register-card-primary">'+primary.map(c=>field(row,c)).join('')+'</dl>'+
 (secondary.length?'<details class="register-card-details"><summary>More details</summary><dl>'+secondary.map(c=>field(row,c)).join('')+'</dl></details>':'')+'</article>').join('')+'</div>';
 const controls='<div class="register-presentation-bar"><span class="small muted">Register view</span><div role="group" aria-label="Register view">'+REGISTER_VIEWS.map(v=>'<button type="button" class="btn btn-quiet" data-action="register-display" data-id="'+e(name+':'+v)+'" aria-pressed="'+(view===v)+'">'+({auto:'Auto',table:'Table',cards:'Cards'})[v]+'</button>').join('')+'</div></div>';
 return '<div class="responsive-register" data-register-name="'+e(name)+'" data-register-view="'+view+'">'+controls+table+cards+'</div>';
}
