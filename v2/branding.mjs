// JIS identity. House logo artwork: visible crops of supplied House logos slide.
// House ring colours: sampled from the supplied colour-reference image.
const swatches=['#1a99fc','#5c7cb2','#f2603d','#fac31c','#9468f9','#1cb6dc'];
export const HOUSES=Object.freeze(['Argus','Barbet','Blackeye','Eagle','Fireback','Frogmouth','Hawk','Heron','Ibis','Kingfisher','Monarch','Osprey','Sandpiper','Skylark','Swift','Whistler'].map((name,i)=>Object.freeze({key:name.toLowerCase(),name,color:swatches[i%6]})));
const byKey=new Map(HOUSES.map(h=>[h.key,h]));
const legacy=new Map([['cedar','argus'],['willow','barbet'],['oak','blackeye']]);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const assetUrl=path=>new URL('./assets/'+path,import.meta.url).href;
export function houseIdentity(value){
 const id=typeof value==='string'?value:value?.key??value?.houseKey??value?.houseId??value?.id;
 return byKey.get(legacy.get(id)??id)??byKey.get(String(typeof value==='object'?value?.name??value?.house??'':value).toLowerCase())??null;
}
export function houseName(value){return houseIdentity(value)?.name??(typeof value==='object'?value?.name??value?.house??'—':value??'—');}
export function houseBadge(value,{large=false,label=false}={}){
 const h=houseIdentity(value);
 if(!h)return label?esc(houseName(value)):'';
 const title=h.name+' House';
 return '<span class="house-badge'+(large?' house-badge-large':'')+(label?' house-badge-labelled':'')+'" style="--house-color:'+h.color+'" title="'+esc(title)+'"><img class="house-logo" src="'+esc(assetUrl('houses/'+h.key+'.jpg'))+'" alt="'+(label?'':esc(title))+'" width="'+(large?52:24)+'" height="'+(large?52:24)+'" loading="lazy" decoding="async">'+(label?'<span>'+esc(h.name)+'</span>':'')+'</span>';
}
export function pupilIdentity(content,house){return '<span class="pupil-identity">'+houseBadge(house)+'<span class="pupil-identity-text">'+content+'</span></span>';}
// Keep old group/head assignments and record IDs stable in the demo; new/reset data
// expands all 21 tutor groups to 16 Houses. Multiple Houses per demo head are fictional.
const groupHouses=[['cedar','willow','oak'],['eagle','fireback','frogmouth'],['hawk','heron','kingfisher'],['ibis','willow','monarch'],['cedar','willow','oak'],['sandpiper','osprey','whistler'],['swift','skylark','oak']];
export const demoHouseFor=(year,g)=>groupHouses[year-7][g];
export function demoHouses(){
 const heads=['imani','morgan','robin'],out=new Map();
 for(const row of groupHouses)row.forEach((id,g)=>{if(!out.has(id))out.set(id,{id,name:houseName(id),headIds:[heads[g]]});});
 return [...out.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
