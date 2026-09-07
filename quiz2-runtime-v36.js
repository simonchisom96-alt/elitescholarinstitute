/* ESI Quiz Studio Runtime V36 — public ecosystem orchestrator */
(function(){'use strict';
const KEY='esi.quiz2.runtime.v36';
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
const s={version:36,loaded:[],failed:[],started:Date.now()};
function save(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}return true}
function loaded(globalName){try{return !!window[globalName]}catch(e){return false}}
function load(src,globalName){return new Promise(resolve=>{if(loaded(globalName)){s.loaded.push(src);return resolve(true)}const tag=document.createElement('script');tag.src=src;tag.async=false;tag.onload=()=>{s.loaded.push(src);save();resolve(true)};tag.onerror=()=>{s.failed.push(src);save();resolve(false)};(document.head||document.documentElement).appendChild(tag)})}
async function boot(){if(window.__ESI_RUNTIME_V36)return true;window.__ESI_RUNTIME_V36=true;for(const [src,g] of MODULES){if(document.querySelector('script[src$="/'+src+'"],script[src="'+src+'"]')){s.loaded.push(src);continue}await load(src,g)}save();try{window.dispatchEvent(new CustomEvent('esi:runtime-ready',{detail:{version:36,state:s}}))}catch(e){}return s.failed.length===0}
function audit(){return{version:36,loaded:[...s.loaded],failed:[...s.failed],ready:s.failed.length===0,started:s.started,at:Date.now()}}
function health(){return{ok:s.failed.length===0,version:36,modules:s.loaded.length,total:MODULES.length,failed:[...s.failed]}}
function configure(base){try{if(window.ESIQuizAPIContractV25?.configure)window.ESIQuizAPIContractV25.configure(base);if(window.ESIBackendV30?.configure)window.ESIBackendV30.configure(base);return true}catch(e){return false}}
window.ESIQuizRuntimeV36={version:36,modules:MODULES.map(x=>x[0]),state:s,boot,audit,health,configure};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();