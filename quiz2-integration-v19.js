/* ESI Quiz Studio Integration Bridge V19.1 — coordinated runtime registry */
(()=>{'use strict';
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
function draft(){try{return JSON.parse(localStorage.getItem('esi.quiz2.draft')||'null')}catch{return null}}
function getState(){
 if(window.state&&typeof window.state==='object')return window.state;
 const d=draft();if(d?.quiz&&typeof d.quiz==='object')return d.quiz;
 if(d&&typeof d==='object'&&(Array.isArray(d.questions)||Array.isArray(d.sections)))return d;
 const qs=typeof window.ESIQuizStudioV3?.getQuestions==='function'?window.ESIQuizStudioV3.getQuestions():[];
 const ss=typeof window.ESIQuizStudioV3?.getSections==='function'?window.ESIQuizStudioV3.getSections():[];
 if(qs.length||ss.length)return{title:'Untitled Quiz',questions:qs,sections:ss,media:[]};
 return null;
}
function engines(){return{v5:!!window.ESIOutcomeNexusEngine,v7:!!window.ESIQuizEnginesV7,v8:!!window.ESIQuizLogicV8,v9:!!window.ESIQuizIntelligenceV9,v10:!!window.ESIResultsV10,v11:!!window.ESIMediaV11,v12:!!window.ESILiveV12,v13:!!window.ESIPublishV13,v14:!!window.ESISyncV14,v15:!!window.ESISecurityV15,v16:!!window.ESICollaborationV16,v17:!!window.ESIAccessibilityV17,v18:!!window.ESINotificationsV18,v19:true,v20:!!window.ESIQuizDiagnosticsV20}}
function sync(){const s=getState();const r={state:s?clone(s):null,engines:engines(),at:Date.now()};window.ESIQuizRuntime=r;return r}
function audit(){const r=sync(),s=r.state;const checks={state:!!s,questions:Array.isArray(s?.questions),sections:Array.isArray(s?.sections),engines:Object.values(r.engines).every(Boolean)};return{ok:Object.values(checks).every(Boolean),checks,engineCount:Object.values(r.engines).filter(Boolean).length,at:r.at}}
function emit(name,detail){try{window.dispatchEvent(new CustomEvent('esi:runtime:'+name,{detail}))}catch{}}
function boot(){const r=sync();emit('ready',r);return r}
window.ESIQuizIntegrationV19={getState,sync,audit,boot,engines};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();