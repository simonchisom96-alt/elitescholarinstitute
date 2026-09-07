/* ESI Quiz Studio Runtime V37 — resilient public ecosystem orchestrator */
(function(){
'use strict';
const KEY='esi.quiz2.runtime.v37';
const MODULES=[
 ['quiz2-ecosystem-v24.js','ESIQuizEcosystemV24'],
 ['quiz2-api-contract-v25.js','ESIQuizAPIContractV25'],
 ['quiz2-publish-ui-v26.js','ESIQuizPublishUIV26'],
 ['quiz2-results-v27.js','ESIQuizResultsV27'],
 ['quiz2-social-v28.js','ESIQuizSocialV28'],
 ['quiz2-communication-v29.js','ESICommunicationV29'],
 ['quiz2-backend-config-v30.js','ESIBackendV30'],
 ['quiz2-learning-v31.js','ESIQuizLearningV31'],
 ['quiz2-creator-admin-v32.js','ESIQuizCreatorV32'],
 ['quiz2-media-v33.js','ESIQuizMediaV33'],
 ['quiz2-types-v34.js','ESIQuizTypesV34'],
 ['quiz2-arrangement-v35.js','ESIQuizArrangementV35']
];
const s={version:37,loaded:[],failed:[],retries:{},started:Date.now(),online:typeof navigator==='undefined'?true:navigator.onLine!==false};
function save(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}return true}
function hasGlobal(name){try{return !!window[name]}catch(e){return false}}
function hasScript(src){return !!document.querySelector('script[src$="/'+src+'"],script[src="'+src+'"]')}
function load(src,globalName,attempt=0){return new Promise(resolve=>{if(hasGlobal(globalName)){if(!s.loaded.includes(src))s.loaded.push(src);return resolve(true)}if(hasScript(src)){setTimeout(()=>resolve(hasGlobal(globalName)),50);return}const tag=document.createElement('script');tag.src=src+'?v=37';tag.async=false;tag.onload=()=>{if(!s.loaded.includes(src))s.loaded.push(src);save();resolve(true)};tag.onerror=()=>{s.retries[src]=(s.retries[src]||0)+1;if(attempt<2){setTimeout(()=>resolve(load(src,globalName,attempt+1)),250*(attempt+1))}else{if(!s.failed.includes(src))s.failed.push(src);save();resolve(false)}};(document.head||document.documentElement).appendChild(tag)})}
async function boot(){if(window.__ESI_RUNTIME_V37)return true;window.__ESI_RUNTIME_V37=true;for(const [src,g] of MODULES){if(!hasGlobal(g)&&s.failed.includes(src))s.failed=s.failed.filter(x=>x!==src);await load(src,g)}s.online=typeof navigator==='undefined'?true:navigator.onLine!==false;save();try{window.dispatchEvent(new CustomEvent('esi:runtime-ready',{detail:{version:37,state:s}}))}catch(e){}return s.failed.length===0}
function health(){return{ok:s.failed.length===0,version:37,loaded:s.loaded.length,total:MODULES.length,failed:[...s.failed],online:s.online,retries:{...s.retries}}}
function audit(){return{...health(),started:s.started,at:Date.now()}}
function configure(base){try{if(window.ESIQuizAPIContractV25?.configure)window.ESIQuizAPIContractV25.configure(base);if(window.ESIBackendV30?.configure)window.ESIBackendV30.configure(base);return true}catch(e){return false}}
function refresh(){return boot()}
window.ESIQuizRuntimeV37={version:37,modules:MODULES.map(x=>x[0]),state:s,boot,audit,health,configure,refresh};
try{window.addEventListener('online',()=>{s.online=true;save();boot()});window.addEventListener('offline',()=>{s.online=false;save()})}catch(e){}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();