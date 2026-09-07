/* ESI Quiz Studio Nexus Engine V2 — safe standalone physics + scoring layer */
(()=>{'use strict';
const KEY='esi.quiz2.nexus.v2';
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
const defaults={speed:78,accuracy:86,difficulty:70,consistency:82,mastery:74};
let state=Object.assign({},defaults,(()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}})());
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function set(values={}){Object.keys(defaults).forEach(k=>{if(k in values)state[k]=clamp(values[k])});save();return get()}
function get(){return Object.assign({},state)}
function score(v=state){const a=Object.values(defaults).map(k=>clamp(v[k]));return Math.round(a.reduce((x,y)=>x+y,0)/a.length)}
function balance(v=state){const a=Object.values(defaults).map(k=>clamp(v[k]));const mean=a.reduce((x,y)=>x+y,0)/a.length;const variance=a.reduce((x,y)=>x+(y-mean)**2,0)/a.length;return Math.round(clamp(100-Math.sqrt(variance)*1.6))}
function analysis(v=state){const s=score(v),b=balance(v);const weak=Object.keys(defaults).sort((a,c)=>clamp(v[a])-clamp(v[c])).slice(0,2);return{score:s,balance:b,weak,level:s>=90?'elite':s>=75?'strong':s>=60?'developing':'needs-work',summary:s>=85?'Strong overall quiz profile.':s>=70?'Balanced profile with room for targeted improvement.':'Use the weakest factors to guide the next quiz.'}}
function recommend(v=state){const a=analysis(v);return a.weak.map(k=>({factor:k,target:Math.min(100,clamp(v[k])+10),reason:'Raise this factor gradually while preserving accuracy and consistency.'}))}
function applyPreset(name){const p={balanced:{speed:80,accuracy:85,difficulty:70,consistency:85,mastery:78},exam:{speed:88,accuracy:94,difficulty:82,consistency:90,mastery:86},learning:{speed:65,accuracy:88,difficulty:62,consistency:86,mastery:82},challenge:{speed:92,accuracy:90,difficulty:94,consistency:82,mastery:88}}[name];return p?set(p):get()}
function bind(root=document){root.querySelectorAll('[data-nexus-factor]').forEach(el=>{const k=el.dataset.nexusFactor;if(!(k in defaults))return;el.value=state[k];el.addEventListener('input',()=>set({[k]:el.value}))})}
window.ESINexusEngineV2={get,set,score,balance,analysis,recommend,applyPreset,bind,defaults:Object.assign({},defaults)};
window.ESINexusEngine=window.ESINexusEngineV2;
})();