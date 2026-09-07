/* ESI Quiz Studio Share Engine V22.2 — public publishing contract */
(()=>{'use strict';
const KEY='esi.quiz2.share.v22';
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const clean=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'quiz';
const rand=n=>{const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<n;i++)s+=a[Math.floor(Math.random()*a.length)];return s};
const origin=()=>{try{return location.origin&&location.origin!=='null'?location.origin:'https://elitescholarinstitute.pages.dev'}catch{return'https://elitescholarinstitute.pages.dev'}};
const publicPage=()=>`${origin()}/quiz2-public-v24.html`;
function makeSlug(title){return `${clean(title)}-${rand(7)}`}
function current(){return clone(window.state&&typeof window.state==='object'?window.state:read('esi.quiz2.draft',{title:'Untitled Quiz',description:'',questions:[],sections:[]}));}
function record(){return read(KEY,[])}
function create(meta={}){const q=current(),slug=String(meta.slug||makeSlug(q.title));const rec={id:`esiq_${Date.now().toString(36)}_${rand(5)}`,slug,title:String(meta.title||q.title||'Untitled Quiz'),description:String(meta.description??q.description??''),createdAt:Date.now(),updatedAt:Date.now(),visibility:meta.visibility||'public',mode:meta.mode||'self-paced',status:'published',responses:0,quiz:clone(q)};const list=[...record().filter(x=>x.slug!==slug),rec].slice(-100);write(KEY,list);return build(rec)}
function build(rec){const base=origin(),path=`${publicPage()}?quiz=${encodeURIComponent(rec.slug)}`;return{...clone(rec),canonical:path,production:`${base}/q/${encodeURIComponent(rec.slug)}`,fallback:path,responseUrl:path,qrValue:path,shareText:`${rec.title}\n${path}`}}
function get(slug){const x=record().find(r=>r.slug===slug||r.id===slug);return x?build(x):null}
function list(){return record().map(build)}
function resolve(){try{const p=new URLSearchParams(location.search);return get(p.get('quiz')||p.get('q')||'')}catch{return null}}
async function copy(slug){const x=get(slug);if(!x)return{ok:false,url:''};try{await navigator.clipboard.writeText(x.responseUrl);return{ok:true,url:x.responseUrl}}catch{return{ok:false,url:x.responseUrl}}}
function qr(slug){const x=get(slug);return x?`https://quickchart.io/qr?text=${encodeURIComponent(x.qrValue)}&size=300`:''}
function unpublish(slug){const x=record();write(KEY,x.map(r=>r.slug===slug?{...r,status:'unpublished'}:r));return get(slug)}
window.ESIQuizShareV22={create,build,get,list,resolve,copy,qr,unpublish,makeSlug,publicPage};
window.ESIQuizPublicLink=window.ESIQuizShareV22;
})();