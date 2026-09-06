/* Elite Scholar Institute — Unified Communication V4
 * Product-complete communication layer for Quiz Studio + Multiplayer + Notifications.
 * Storage/realtime adapters remain intentionally injectable; no secrets or credentials.
 */
(()=>{'use strict';
const KEY='esi.communication.v4';
const OLD=['esi.quiz2.chat.v3','esi.quiz2.chat.v2','esi.communication.hub.v1'];
const defaults={version:4,activeChat:null,activeSurface:'all',chats:[],groups:[],rooms:[],archived:[],mutedChats:[],starred:[],pinned:[],notifications:[],drafts:{},typing:{},presence:{},pending:[],blocked:[],reported:[],polls:[],settings:{readReceipts:true,typingIndicators:true,notifications:true,mentionAlerts:true,sound:true,vibrate:true,mediaAutoLoad:false},profile:{name:'ESI Learner',status:'Available'},adapter:{connected:false,kind:'none'}};
const copy=x=>{try{return structuredClone(x)}catch{return JSON.parse(JSON.stringify(x))}};
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
let state=Object.assign(copy(defaults),read(KEY)||{});
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function id(p){return p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9)}
function emit(name,data={}){try{window.dispatchEvent(new CustomEvent('esi:comms:'+name,{detail:data}))}catch(e){}}
function mergeLegacy(){OLD.forEach(k=>{const old=read(k);if(!old)return;if(Array.isArray(old.chats))old.chats.forEach(c=>{if(!state.chats.some(x=>x.id===c.id))state.chats.push(copy(c))});if(Array.isArray(old.notifications))old.notifications.forEach(n=>state.notifications.push(copy(n)));if(old.settings)state.settings=Object.assign(state.settings,old.settings)});state.chats.forEach(c=>{c.messages=Array.isArray(c.messages)?c.messages:[];c.members=Array.isArray(c.members)?c.members:[];c.unread=Number(c.unread||0);c.kind=c.kind||'direct'});state.notifications=state.notifications.slice(0,200);save()}
function ensureChat(data={}){let c=data.id&&state.chats.find(x=>x.id===data.id);if(!c){c=Object.assign({id:id('chat'),kind:'direct',name:'New chat',avatar:'ESI',members:[],messages:[],unread:0,muted:false,pinned:false,archived:false,role:'member',createdAt:Date.now()},data);state.chats.push(c)}else Object.assign(c,data);save();emit('chat-updated',c);return c}
function getChat(cid){return state.chats.find(c=>c.id===cid)}
function normalizeMessage(m={}){return Object.assign({id:id('msg'),text:'',sender:'me',createdAt:Date.now(),editedAt:null,deletedAt:null,status:'sent',replyTo:null,forwarded:false,starred:false,pinned:false,reactions:{},mentions:[],attachment:null,quote:null},m)}
function send(cid,text,meta={}){const c=getChat(cid||state.activeChat);if(!c)return null;const body=String(text||'').trim();if(!body&& !meta.attachment)return null;const m=normalizeMessage(Object.assign({text:body},meta));c.messages.push(m);state.activeChat=c.id;state.drafts[c.id]='';save();emit('message-sent',{chat:c,message:m});return m}
function receive(cid,text,meta={}){const c=getChat(cid);if(!c)return null;const m=normalizeMessage(Object.assign({text:String(text||''),sender:meta.sender||'member',status:'received'},meta));c.messages.push(m);if(state.activeChat!==cid&&!c.muted)c.unread=(c.unread||0)+1;save();emit('message-received',{chat:c,message:m});return m}
function edit(cid,mid,text){const c=getChat(cid),m=c?.messages.find(x=>x.id===mid);if(!m||m.deletedAt)return null;m.text=String(text||'').trim();m.editedAt=Date.now();save();emit('message-edited',{chat:c,message:m});return m}
function remove(cid,mid,forEveryone=false){const c=getChat(cid),m=c?.messages.find(x=>x.id===mid);if(!m)return false;if(forEveryone){m.deletedAt=Date.now();m.text='';m.attachment=null}else c.messages=c.messages.filter(x=>x.id!==mid);save();emit('message-removed',{chatId:cid,messageId:mid,forEveryone});return true}
function react(cid,mid,emoji){const m=getChat(cid)?.messages.find(x=>x.id===mid);if(!m)return null;m.reactions=m.reactions||{};m.reactions[emoji]=(m.reactions[emoji]||0)+1;save();emit('reaction',{chatId:cid,messageId:mid,emoji});return m.reactions}
function toggleStar(cid,mid,on){const m=getChat(cid)?.messages.find(x=>x.id===mid);if(!m)return false;m.starred=on!==undefined?!!on:!m.starred;if(m.starred&&!state.starred.includes(mid))state.starred.push(mid);if(!m.starred)state.starred=state.starred.filter(x=>x!==mid);save();emit('star',{chatId:cid,messageId:mid,on:m.starred});return m.starred}
function togglePin(cid,mid,on){const m=getChat(cid)?.messages.find(x=>x.id===mid);if(!m)return false;m.pinned=on!==undefined?!!on:!m.pinned;if(m.pinned&&!state.pinned.includes(mid))state.pinned.push(mid);if(!m.pinned)state.pinned=state.pinned.filter(x=>x!==mid);save();emit('pin',{chatId:cid,messageId:mid,on:m.pinned});return m.pinned}
function reply(cid,mid){const c=getChat(cid);const m=c?.messages.find(x=>x.id===mid);if(!m)return null;state.replyTo={chatId:cid,messageId:mid};save();emit('reply-target',state.replyTo);return m}
function clearReply(){state.replyTo=null;save();emit('reply-cleared')}
function forward(sourceCid,mid,targetCid){const s=getChat(sourceCid),t=getChat(targetCid),m=s?.messages.find(x=>x.id===mid);if(!m||!t)return null;return send(t.id,m.text,{forwarded:true,forwardedFrom:s.name,attachment:m.attachment})}
function select(cid){const c=getChat(cid);if(!c)return null;state.activeChat=cid;c.unread=0;save();emit('chat-selected',c);emit('read',{chatId:cid,at:Date.now()});return c}
function draft(cid,text){state.drafts[cid]=String(text||'');save();emit('draft',{chatId:cid,text:state.drafts[cid]})}
function setTyping(cid,names,on=true){if(on){const arr=Array.isArray(names)?names:[names||'Someone'];state.typing[cid]=arr.filter(Boolean).slice(0,5)}else delete state.typing[cid];save();emit('typing',{chatId:cid,names:state.typing[cid]||[],on})}
function setPresence(uid,status){state.presence[uid]={status,at:Date.now()};save();emit('presence',{uid,status})}
function mute(cid,on=true){const c=getChat(cid);if(!c)return false;c.muted=on;if(on&&!state.mutedChats.includes(cid))state.mutedChats.push(cid);if(!on)state.mutedChats=state.mutedChats.filter(x=>x!==cid);save();emit('mute',{chatId:cid,on});return on}
function archive(cid,on=true){const c=getChat(cid);if(!c)return false;c.archived=on;if(on&&!state.archived.includes(cid))state.archived.push(cid);if(!on)state.archived=state.archived.filter(x=>x!==cid);save();emit('archive',{chatId:cid,on});return on}
function notify(title,body,type='message',meta={}){const n={id:id('note'),title:String(title||''),body:String(body||''),type,meta,read:false,createdAt:Date.now()};state.notifications.unshift(n);state.notifications=state.notifications.slice(0,200);save();emit('notification',n);return n}
function markNotification(idv,read=true){const n=state.notifications.find(x=>x.id===idv);if(!n)return false;n.read=read;save();emit('notification-read',n);return true}
function markNotificationsRead(){state.notifications.forEach(n=>n.read=true);save();emit('notifications-read')}
function search(q,{chatId=null,from=null,starredOnly=false,pinnedOnly=false}={}){const term=String(q||'').toLowerCase();const out=[];state.chats.filter(c=>!chatId||c.id===chatId).forEach(c=>c.messages.forEach(m=>{if(from&&m.sender!==from)return;if(starredOnly&&!m.starred)return;if(pinnedOnly&&!m.pinned)return;const hay=(m.text+' '+(m.forwardedFrom||'')).toLowerCase();if(term&&hay.includes(term))out.push({chat:c,message:m})}));return out}
function createGroup(name,members=[],meta={}){const g=ensureChat({kind:'group',name:String(name||'Study Group'),members:[...members],admins:meta.admins||[],description:meta.description||'',avatar:meta.avatar||'ESI',role:'admin'});state.groups.push(g.id);save();emit('group-created',g);return g}
function setRole(cid,member,role){const c=getChat(cid);if(!c)return false;c.roles=c.roles||{};c.roles[member]=role;save();emit('role',{chatId:cid,member,role});return true}
function moderate(cid,member,action){const c=getChat(cid);if(!c)return false;c.moderation=c.moderation||[];c.moderation.push({member,action,at:Date.now()});save();emit('moderation',{chatId:cid,member,action});return true}
function createPoll(cid,question,options=[],settings={}){const p={id:id('poll'),chatId:cid,question:String(question||''),options:options.slice(0,10).map(x=>({id:id('opt'),label:String(x),votes:0})),multi:!!settings.multi,closed:false,voters:{},createdAt:Date.now()};state.polls.unshift(p);save();emit('poll-created',p);return p}
function votePoll(pid,optId,user='me'){const p=state.polls.find(x=>x.id===pid);if(!p||p.closed)return false;if(!p.multi&&p.voters[user])return false;const opt=p.options.find(x=>x.id===optId);if(!opt)return false;if(p.voters[user]&&p.multi){const old=p.voters[user];if(old.includes(optId))return false}opt.votes++;p.voters[user]=p.multi?[...(p.voters[user]||[]),optId]:[optId];save();emit('poll-vote',p);return true}
function closePoll(pid){const p=state.polls.find(x=>x.id===pid);if(!p)return false;p.closed=true;p.closedAt=Date.now();save();emit('poll-closed',p);return true}
function queue(kind,payload){state.pending.push({id:id('job'),kind,payload,createdAt:Date.now(),attempts:0,status:'queued'});save();emit('queue',state.pending[state.pending.length-1]);return state.pending[state.pending.length-1]}
function attachAdapter(adapter){state.adapter={connected:true,kind:String(adapter?.kind||'custom')};window.ESICommunicationAdapter=adapter;save();emit('adapter-connected',state.adapter);return state.adapter}
function disconnectAdapter(){state.adapter={connected:false,kind:'none'};save();emit('adapter-disconnected')}
function exportData(){return copy({schema:'ESI-Communication',version:4,exportedAt:new Date().toISOString(),state})}
function importData(payload){if(!payload||payload.schema!=='ESI-Communication')throw Error('Invalid communication export');state=Object.assign(copy(defaults),payload.state||{});save();emit('imported',state);return true}
function unread(){return state.chats.reduce((n,c)=>n+(c.unread||0),0)+state.notifications.filter(n=>!n.read).length}
function api(){return {state,save,ensureChat,getChat,send,receive,edit,remove,react,toggleStar,togglePin,reply,clearReply,forward,select,draft,setTyping,setPresence,mute,archive,notify,markNotification,markNotificationsRead,search,createGroup,setRole,moderate,createPoll,votePoll,closePoll,queue,attachAdapter,disconnectAdapter,exportData,importData,unread}}
function boot(){mergeLegacy();window.ESICommunicationV4=api();window.ESICommunicationHub=Object.assign(window.ESICommunicationHub||{},api());window.dispatchEvent(new CustomEvent('esi:comms:ready',{detail:{version:4,state}}))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
