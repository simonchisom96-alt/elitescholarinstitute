/* Elite Scholar Institute — Unified Communication Hub V1
 * Combines quiz.html multiplayer, notification.html communication,
 * and Quiz Studio chat contracts. UI/API bridge; no credentials.
 */
(function(){'use strict';
const KEY='esi.communication.hub.v1';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const state=Object.assign({version:1,active:'home',unread:0,muted:false,online:false,typing:{},drafts:{},starred:[],pinned:[],notifications:[],chats:[],groups:[],rooms:[],selected:null,replyTo:null,settings:{readReceipts:true,typingIndicators:true,notifications:true,compact:false}},load());
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
const emit=(n,d)=>{try{window.dispatchEvent(new CustomEvent(n,{detail:d}))}catch{}};
function notify(type,title,body,meta={}){const n={id:'n_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),type,title,body,meta,read:false,createdAt:Date.now()};state.notifications.unshift(n);if(!state.muted)state.unread++;save();emit('esi:notification',n);return n}
function upsertChat(chat){const c=Object.assign({id:'chat_'+Date.now(),kind:'direct',name:'Chat',messages:[],unread:0,muted:false,pinned:false},chat);const i=state.chats.findIndex(x=>x.id===c.id);if(i<0)state.chats.push(c);else state.chats[i]=Object.assign(state.chats[i],c);save();emit('esi:chat-updated',c);return c}
function message(chatId,text,meta={}){const c=state.chats.find(x=>x.id===chatId);if(!c)return null;const m=Object.assign({id:'m_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),text:String(text||''),sender:'me',createdAt:Date.now(),status:'sent',reactions:{},replyTo:null,starred:false,pinned:false},meta);if(!m.text&&!m.attachment)return null;c.messages.push(m);save();emit('esi:message',m);return m}
function markRead(chatId){const c=state.chats.find(x=>x.id===chatId);if(c){c.unread=0;c.lastRead=Date.now()}state.unread=state.chats.reduce((a,x)=>a+(x.unread||0),0);save();emit('esi:read',{chatId})}
function typing(chatId,name,on=true){if(on)state.typing[chatId]=name||'Someone';else delete state.typing[chatId];save();emit('esi:typing',{chatId,name,on})}
function draft(chatId,text){state.drafts[chatId]=String(text||'');save();emit('esi:draft',{chatId,text:state.drafts[chatId]})}
function star(messageId,on=true){if(on&&!state.starred.includes(messageId))state.starred.push(messageId);if(!on)state.starred=state.starred.filter(x=>x!==messageId);save();emit('esi:star',{messageId,on})}
function pin(messageId,on=true){if(on&&!state.pinned.includes(messageId))state.pinned.push(messageId);if(!on)state.pinned=state.pinned.filter(x=>x!==messageId);save();emit('esi:pin',{messageId,on})}
function search(q){q=String(q||'').toLowerCase().trim();if(!q)return[];const out=[];state.chats.forEach(c=>c.messages.forEach(m=>{if(String(m.text||'').toLowerCase().includes(q))out.push({chatId:c.id,chat:c.name,message:m})}));return out}
function bridge(){window.ESICommunicationHub={state,notify,upsertChat,message,markRead,typing,draft,star,pin,search,save};window.esiChatOpen=()=>emit('esi:open',{source:'hub'});window.esiChatClose=()=>emit('esi:close',{source:'hub'});window.esiChatToggle=()=>emit('esi:toggle',{source:'hub'});window.esiChatMute=()=>{state.muted=!state.muted;save();emit('esi:mute',{muted:state.muted})};window.esiChatAnnounce=(title,body)=>notify('announcement',title,body);window.esiNotify=(title,body,meta)=>notify('general',title,body,meta)}
function boot(){bridge();emit('esi:hub-ready',{state})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
