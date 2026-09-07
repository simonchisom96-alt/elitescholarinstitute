/* ESI Quiz Studio Transport V41 — backend boundary, offline queue, retry and realtime events */
(function(){'use strict';
const KEY='esi.quiz2.transport.v41';const D={version:41,base:'',realtime:'',queue:[],online:true,lastSync:0,attempts:0};let s=D;try{s={...D,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){}s.queue=Array.isArray(s.queue)?s.queue:[];
function save(){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}return true}function emit(type,data){save();try{window.dispatchEvent(new CustomEvent('esi:v41',{detail:{type,...(data||{})}}))}catch(e){}return true}
function configure(cfg={}){s.base=String(cfg.base||s.base||'').replace(/\/$/,'');s.realtime=String(cfg.realtime||s.realtime||'');emit('configured',{base:!!s.base,realtime:!!s.realtime});return {base:s.base,realtime:s.realtime}}
function enqueue(method,path,body){const x={id:'tx_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),method:method||'POST',path:path||'/',body:body||null,time:Date.now(),tries:0,status:'queued'};s.queue.push(x);s.queue=s.queue.slice(-500);emit('queued',{item:x});return x}
function pending(){return s.queue.filter(x=>x.status==='queued'||x.status==='retry')}
function remove(id0){s.queue=s.queue.filter(x=>x.id!==id0);emit('queue-remove',{id:id0});return true}
async function send(item){if(!s.base)throw new Error('Backend URL not configured');const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);item.tries=(item.tries||0)+1;item.status='sending';try{const r=await fetch(s.base+item.path,{method:item.method,headers:{'Content-Type':'application/json',...(item.headers||{})},body:item.body==null?undefined:JSON.stringify(item.body),signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);item.status='sent';item.sentAt=Date.now();remove(item.id);return r}catch(e){item.status='retry';item.error=String(e.message||e);emit('send-failed',{item,error:item.error});throw e}finally{clearTimeout(t)}}
async function flush(){if(typeof navigator!=='undefined'&&!navigator.onLine){s.online=false;save();return {sent:0,pending:pending().length}}s.online=true;let sent=0;for(const item of [...pending()]){try{await send(item);sent++}catch(e){}}s.lastSync=Date.now();emit('flush',{sent,pending:pending().length});return{sent,pending:pending().length}}
function setOnline(v){s.online=!!v;emit('network',{online:s.online});if(s.online)flush().catch(()=>{});return s.online}
function event(type,payload){emit(type,payload);return true}
function audit(){return{version:41,configured:!!s.base,realtime:!!s.realtime,online:s.online,pending:pending().length,lastSync:s.lastSync}};
window.ESIQuizTransportV41={state:s,configure,enqueue,pending,remove,send,flush,setOnline,event,audit};
if(typeof window!=='undefined'){window.addEventListener('online',()=>setOnline(true));window.addEventListener('offline',()=>setOnline(false))}
})();