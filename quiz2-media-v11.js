/* ESI Quiz Studio Media Engine V11
 * Media registry, validation, metadata, lazy-load hints, offline readiness,
 * duplicate detection and broken-asset diagnostics. API-free.
 */
(()=>{'use strict';
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const arr=x=>Array.isArray(x)?x:[];const text=x=>String(x??'').trim();
const state=()=>window.state&&typeof window.state==='object'?window.state:read('esi.quiz2.draft',{media:[],questions:[]});
const media=()=>arr(state().media);
function kind(url=''){const s=text(url).toLowerCase().split('?')[0];if(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/.test(s))return'image';if(/\.(mp3|wav|ogg|m4a|aac)$/.test(s))return'audio';if(/\.(mp4|webm|mov|m4v)$/.test(s))return'video';if(/\.pdf$/.test(s))return'pdf';return'other';}
function registry(){return media().map((m,i)=>({id:m.id||'media_'+i,url:m.url||m.src||'',name:m.name||m.filename||'Untitled asset',type:m.type||kind(m.url||m.src),alt:m.alt||'',size:Number(m.size)||0,offline:m.offline===true,usedBy:[],index:i}));}
function audit(){const r=registry(), qs=arr(state().questions);r.forEach(m=>{m.usedBy=qs.filter(q=>JSON.stringify(q).includes(m.url)).map(q=>q.id).filter(Boolean);m.issue=!m.url?'missing-url':m.url.startsWith('data:')?'inline-data':'ok';m.lazy=!m.usedBy.length;});const seen=new Map(),dupes=[];r.forEach(m=>{const k=m.url;if(k){if(seen.has(k))dupes.push([seen.get(k),m.id]);else seen.set(k,m.id)}});const out={total:r.length,images:r.filter(x=>x.type==='image').length,audio:r.filter(x=>x.type==='audio').length,video:r.filter(x=>x.type==='video').length,pdf:r.filter(x=>x.type==='pdf').length,broken:r.filter(x=>x.issue!=='ok'),unused:r.filter(x=>!x.usedBy.length),duplicates:dupes,registry:r,generatedAt:Date.now()};write('esi.quiz2.media.v11',out);window.ESIMediaV11=out;try{window.dispatchEvent(new CustomEvent('esi:media-audit',{detail:out}))}catch{};return out;}
function add(asset){const s=state();s.media=arr(s.media);const x={id:asset?.id||'media_'+Date.now().toString(36),url:text(asset?.url||asset?.src),name:text(asset?.name||asset?.filename)||'Untitled asset',type:asset?.type||kind(asset?.url||asset?.src),alt:text(asset?.alt),size:Number(asset?.size)||0,offline:!!asset?.offline};s.media.push(x);write('esi.quiz2.draft',s);return x;}
function remove(id){const s=state();s.media=arr(s.media).filter(x=>x.id!==id);write('esi.quiz2.draft',s);return audit();}
function prepareOffline(id){const s=state();const m=arr(s.media).find(x=>x.id===id);if(!m)return null;m.offline=true;m.offlineQueued=true;write('esi.quiz2.draft',s);return m;}
function diagnostics(){const a=audit();return {ok:a.broken.length===0,broken:a.broken.length,duplicates:a.duplicates.length,unused:a.unused.length,total:a.total};}
window.ESIMediaV11={registry,audit,add,remove,prepareOffline,diagnostics,kind};
})();
