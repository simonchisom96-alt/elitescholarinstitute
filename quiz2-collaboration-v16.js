/* ESI Quiz Studio Collaboration Engine V16 — API-free collaboration model */
(()=>{'use strict';
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch{return d}};const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const clone=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};const id=()=>`col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
let s=read('esi.quiz2.collab.v16',{docId:id(),members:[],locks:{},comments:[],activity:[]});
function save(){write('esi.quiz2.collab.v16',s);try{window.dispatchEvent(new CustomEvent('esi:collab-change',{detail:clone(s)}))}catch{};return clone(s)}
function member(name,role='editor'){const m={id:id(),name:String(name||'Member').slice(0,50),role:['owner','editor','reviewer','viewer'].includes(role)?role:'editor',online:true,lastSeen:Date.now()};s.members=s.members.filter(x=>x.name!==m.name);s.members.push(m);return save()}
function presence(idOrName,online=true){const m=s.members.find(x=>x.id===idOrName||x.name===idOrName);if(m){m.online=!!online;m.lastSeen=Date.now()}return save()}
function can(role,action){const map={owner:['edit','review','publish','manage'],editor:['edit','review'],reviewer:['review'],viewer:[]};return !!map[role]?.includes(action)}
function lock(resource,user,ttl=60000){const now=Date.now(),old=s.locks[resource];if(old&&old.expires>now&&old.user!==user)return{ok:false,lockedBy:old.user};s.locks[resource]={user,expires:now+Math.max(1000,Number(ttl)||60000)};return save()}
function unlock(resource,user){if(s.locks[resource]&&s.locks[resource].user===user)delete s.locks[resource];return save()}
function comment(resource,text,user){const body=String(text||'').trim();if(!body)return null;const c={id:id(),resource,text:body,user:user||'Member',resolved:false,createdAt:Date.now()};s.comments.push(c);return save()}
function resolveComment(cid){const c=s.comments.find(x=>x.id===cid);if(c)c.resolved=true;return save()}
function activity(action,resource,user){s.activity.unshift({id:id(),action,resource:resource||'',user:user||'Member',at:Date.now()});s.activity=s.activity.slice(0,100);return save()}
window.ESICollaborationV16={member,presence,can,lock,unlock,comment,resolveComment,activity,get state(){return clone(s)}};
})();