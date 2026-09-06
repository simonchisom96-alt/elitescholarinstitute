/* ESI Quiz Studio Notification & Automation Engine V18 — local-first */
(()=>{'use strict';
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};const id=()=>`ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
let s=read('esi.quiz2.notifications.v18',{items:[],rules:[],quiet:false});
function save(){s.items=s.items.slice(0,200);write('esi.quiz2.notifications.v18',s);try{window.dispatchEvent(new CustomEvent('esi:notification-change',{detail:s}))}catch{};return JSON.parse(JSON.stringify(s))}
function push(title,body,type='info',meta={}){const n={id:id(),title:String(title||'ESI'),body:String(body||''),type,read:false,createdAt:Date.now(),meta};s.items.unshift(n);return save()}
function readOne(nid){const n=s.items.find(x=>x.id===nid);if(n)n.read=true;return save()}
function markAll(){s.items.forEach(x=>x.read=true);return save()}
function remove(nid){s.items=s.items.filter(x=>x.id!==nid);return save()}
function unread(){return s.items.filter(x=>!x.read).length}
function rule(event,action,enabled=true){const r={id:id(),event:String(event||''),action:String(action||''),enabled:!!enabled};s.rules.push(r);return save()}
function trigger(event,payload={}){if(s.quiet)return[];return s.rules.filter(r=>r.enabled&&r.event===event).map(r=>push('ESI Automation',r.action,'automation',payload))}
function quiet(value){s.quiet=!!value;return save()}
window.ESINotificationsV18={push,read:readOne,markAll,remove,unread,rule,trigger,quiet,get state(){return JSON.parse(JSON.stringify(s))}};
})();