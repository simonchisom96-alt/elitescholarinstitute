/* ESI Quiz Studio Backend Config V30
   The browser stores no API keys or service-role secrets.
   Only public endpoint URLs belong here later.
*/
(function(){'use strict';
const CONFIG={
  apiBase:'',
  realtimeUrl:'',
  storageUrl:'',
  aiUrl:'',
  mediaUrl:'',
  analyticsUrl:'',
  notificationUrl:'',
  quizUrl:'',
  leaderboardUrl:'',
  chatUrl:'',
  statusUrl:'',
  authUrl:'',
  configured:false
};
function normalize(v){return String(v||'').trim().replace(/\\/$/,'')}
function configure(values={}){Object.keys(CONFIG).forEach(k=>{if(k!=='configured'&&values[k]!=null)CONFIG[k]=normalize(values[k])});CONFIG.configured=!!(CONFIG.apiBase||CONFIG.quizUrl||CONFIG.chatUrl||CONFIG.realtimeUrl);try{localStorage.setItem('esi.quiz2.backend.v30',JSON.stringify(CONFIG))}catch(e){}return {...CONFIG}}
function load(){try{const x=JSON.parse(localStorage.getItem('esi.quiz2.backend.v30')||'{}');Object.assign(CONFIG,x)}catch(e){}CONFIG.configured=!!(CONFIG.apiBase||CONFIG.quizUrl||CONFIG.chatUrl||CONFIG.realtimeUrl);return {...CONFIG}}
function endpoint(name,path=''){const base=CONFIG[name]||CONFIG.apiBase;return base?base+('/'+String(path).replace(/^\\//,'')) : ''}
function ready(){return CONFIG.configured}
function publicConfig(){return {configured:ready(),apiBase:CONFIG.apiBase,realtimeUrl:CONFIG.realtimeUrl,storageUrl:CONFIG.storageUrl,aiUrl:CONFIG.aiUrl,mediaUrl:CONFIG.mediaUrl,analyticsUrl:CONFIG.analyticsUrl,notificationUrl:CONFIG.notificationUrl,quizUrl:CONFIG.quizUrl,leaderboardUrl:CONFIG.leaderboardUrl,chatUrl:CONFIG.chatUrl,statusUrl:CONFIG.statusUrl,authUrl:CONFIG.authUrl}}
window.ESIBackendV30={CONFIG,configure,load,endpoint,ready,publicConfig};
load();
})();