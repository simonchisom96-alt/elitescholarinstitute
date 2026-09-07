/* ESI Quiz Studio Runtime V38 — resilient public/runtime bridge */
(function(){
'use strict';
const KEY='esi.quiz2.runtime.v38';
const s={version:38,booted:false,online:true,modules:[],errors:[],started:Date.now(),last:0};
function save(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}return true}
function has(name){try{return !!window[name]}catch(e){return false}}
function online(){s.online=navigator.onLine!==false;return s.online}
function note(type,data){s.last=Date.now();try{window.dispatchEvent(new CustomEvent('esi:v38',{detail:{type,...(data||{})}}))}catch(e){}save();return true}
function audit(){return{version:38,booted:s.booted,online:online(),modules:[...s.modules],errors:[...s.errors],last:s.last,at:Date.now()}}
function health(){return{ok:s.booted&&s.errors.length===0,version:38,online:online(),modules:s.modules.length,errors:s.errors.length}}
function register(name){if(name&&!s.modules.includes(name))s.modules.push(name);return true}
function bridge(){
 const names=['ESIQuizEcosystemV24','ESIQuizAPIContractV25','ESIQuizPublishUIV26','ESIQuizResultsV27','ESIQuizSocialV28','ESICommunicationV29','ESIBackendV30','ESIQuizLearningV31','ESIQuizCreatorV32','ESIQuizMediaV33','ESIQuizTypesV34','ESIQuizArrangementV35','ESIQuizRuntimeV36','ESIQuizRuntimeV37','ESIQuizAIBridgeV39','ESIQuizImportExportV40','ESIQuizIntegrityAnalyticsV41'];
 names.forEach(register);
 return names.filter(n=>has(n));
}
function configure(base){
 try{
  if(window.ESIQuizAPIContractV25?.configure)window.ESIQuizAPIContractV25.configure(base);
  if(window.ESIBackendV30?.configure)window.ESIBackendV30.configure(base);
  if(window.ESIQuizAIBridgeV39?.configure)window.ESIQuizAIBridgeV39.configure(base);
  note('configure',{configured:!!base});return true;
 }catch(e){s.errors.push(String(e?.message||e));save();return false}
}
function queue(key,value){try{const k='esi.quiz2.offline.v38';const q=JSON.parse(localStorage.getItem(k)||'[]');q.push({id:Date.now().toString(36),key,value,time:Date.now()});localStorage.setItem(k,JSON.stringify(q.slice(-500)));note('queue',{key});return true}catch(e){return false}}
function pending(){try{return JSON.parse(localStorage.getItem('esi.quiz2.offline.v38')||'[]')}catch(e){return[]}}
function clearQueue(){try{localStorage.removeItem('esi.quiz2.offline.v38')}catch(e){}note('queue-clear');return true}
function boot(){if(s.booted)return audit();s.booted=true;online();const found=bridge();s.modules=found;note('ready',{modules:found.length});return audit()}
window.ESIQuizRuntimeV38={version:38,state:s,boot,audit,health,register,bridge,configure,queue,pending,clearQueue};
window.ESIQuizRuntimeV38.boot();
})();
