/* ESI Quiz Studio Integration Bridge V19 — connects the modular engines safely */
(()=>{'use strict';
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
function getState(){if(window.state&&typeof window.state==='object')return window.state;try{const x=JSON.parse(localStorage.getItem('esi.quiz2.draft')||'null');return x&&typeof x==='object'?x:null}catch{return null}}
function sync(){const s=getState();if(!s)return null;window.ESIQuizRuntime={state:s,engines:{intelligence:!!window.ESIQuizIntelligenceV9,results:!!window.ESIResultsV10,media:!!window.ESIMediaV11,live:!!window.ESILiveV12,publish:!!window.ESIPublishV13,sync:!!window.ESISyncV14,security:!!window.ESISecurityV15,collaboration:!!window.ESICollaborationV16,accessibility:!!window.ESIAccessibilityV17,notifications:!!window.ESINotificationsV18}};return window.ESIQuizRuntime}
function audit(){const s=getState()||{};const checks={state:!!s,questions:Array.isArray(s.questions),sections:Array.isArray(s.sections),media:Array.isArray(s.media),publish:!!window.ESIPublishV13,security:!!window.ESISecurityV15};return{ok:Object.values(checks).every(Boolean),checks,at:Date.now()}}
function emit(name,detail){try{window.dispatchEvent(new CustomEvent('esi:runtime:'+name,{detail}))}catch{}}
function boot(){const r=sync();emit('ready',r);return r}
window.ESIQuizIntegrationV19={getState,sync,audit,boot};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();