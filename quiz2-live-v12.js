/* ESI Quiz Studio Live Engine V12
 * Host/lobby state, participant presence, synchronized timing, answer locks,
 * reconnect queues and classroom chat bridge. API-free transport layer.
 */
(()=>{'use strict';
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const arr=x=>Array.isArray(x)?x:[];const id=()=>`live_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const base=()=>read('esi.quiz2.live.v12',{id:id(),status:'idle',code:'',host:null,phase:'lobby',question:0,total:0,startedAt:0,endsAt:0,locked:false,participants:[],chat:[],pending:[],updatedAt:0});
let live=base();
function persist(){live.updatedAt=Date.now();write('esi.quiz2.live.v12',live);try{window.dispatchEvent(new CustomEvent('esi:live-change',{detail:live}))}catch{};return live;}
function code(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function create(opts={}){live={...base(),id:id(),status:'ready',code:opts.code||code(),host:opts.host||'Host',phase:'lobby',question:0,total:Number(opts.total)||arr(window.state?.questions).length,participants:[],chat:[],pending:[],startedAt:0,endsAt:0,locked:false};return persist();}
function join(name,device){const n=String(name||'Guest').trim().slice(0,40)||'Guest';let p=live.participants.find(x=>x.device===device||x.name===n);if(!p){p={id:id(),name:n,device:device||id(),status:'online',joinedAt:Date.now(),score:0,answered:false,lastSeen:Date.now()};live.participants.push(p)}else{p.status='online';p.lastSeen=Date.now()}return persist();}
function leave(pid){const p=live.participants.find(x=>x.id===pid);if(p)p.status='left';return persist();}
function start(seconds=30){live.status='running';live.phase='question';live.startedAt=Date.now();live.endsAt=Date.now()+Math.max(0,Number(seconds)||30)*1000;live.locked=false;return persist();}
function next(seconds=30){live.question++;live.phase='question';live.startedAt=Date.now();live.endsAt=Date.now()+Math.max(0,Number(seconds)||30)*1000;live.locked=false;live.participants.forEach(p=>p.answered=false);return persist();}
function lock(){live.locked=true;return persist();}
function answer(pid,answer,meta={}){if(live.locked)return {ok:false,reason:'locked'};const p=live.participants.find(x=>x.id===pid);if(!p)return {ok:false,reason:'participant'};p.answered=true;p.lastSeen=Date.now();p.lastAnswer={answer,at:Date.now(),...meta};return persist();}
function tick(now=Date.now()){return {phase:live.phase,status:live.status,locked:live.locked,remaining:Math.max(0,(live.endsAt||now)-now),question:live.question,total:live.total};}
function message(pid,text){const body=String(text||'').trim();if(!body)return null;const m={id:id(),sender:pid||'host',text:body,at:Date.now(),status:'queued'};live.chat.push(m);live.pending.push(m.id);persist();return m;}
function reconnect(pid){const p=live.participants.find(x=>x.id===pid);if(!p)return null;p.status='online';p.lastSeen=Date.now();return persist();}
function snapshot(){return JSON.parse(JSON.stringify(live));}
function reset(){live={...base(),status:'idle',code:'',participants:[],chat:[],pending:[]};return persist();}
window.ESILiveV12={create,join,leave,start,next,lock,answer,tick,message,reconnect,snapshot,reset,get state(){return snapshot()}};
})();
