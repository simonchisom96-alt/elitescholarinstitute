/* ESI Communication V10 — production-ready chat UX layer, backend-ready transport */
(()=>{'use strict';
const wait=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
function boot(){
 const api=window.ESICommunicationV9||window.ESICommunicationV4||window.ESICommunicationHub;
 if(!api)return setTimeout(boot,150);
 const S=api.state;
 S.settings=Object.assign({readReceipts:true,typing:true,notifications:true,mentions:true,sound:true,vibrate:true,mediaAutoLoad:false},S.settings||{});
 S.threads=Array.isArray(S.threads)?S.threads:[];S.contacts=Array.isArray(S.contacts)?S.contacts:[];S.failed=Array.isArray(S.failed)?S.failed:[];S.calls=Array.isArray(S.calls)?S.calls:[];S.presence=S.presence||{};
 const save=()=>api.save?.();
 const emit=(n,d={})=>window.dispatchEvent(new CustomEvent('esi:comms:v10:'+n,{detail:d}));
 const normalize=c=>{if(!c)return null;c.messages=Array.isArray(c.messages)?c.messages:[];c.members=Array.isArray(c.members)?c.members:[];c.unread=+c.unread||0;c.kind=c.kind||'direct';c.archived=!!c.archived;c.muted=!!c.muted;c.pinned=!!c.pinned;c.lastSeen=c.lastSeen||0;return c};
 const ensureRoom=(name='Live Room')=>normalize(api.chat?.({kind:'room',name,members:[],messages:[],unread:0}));
 const setRead=cid=>{const c=api.getChat?.(cid);if(!c)return;c.unread=0;c.lastSeen=Date.now();api.select?.(cid);save();emit('read',{chatId:cid,at:c.lastSeen})};
 const retry=(mid,cid)=>{const c=api.getChat?.(cid),m=c?.messages.find(x=>x.id===mid);if(!m)return null;m.status='sending';save();setTimeout(()=>{m.status='sent';m.failed=false;save();emit('retry',{chatId:cid,message:m})},250);return m};
 const delivery=(cid,mid,status)=>{const m=api.getChat?.(cid)?.messages.find(x=>x.id===mid);if(!m)return false;m.status=status;m.statusAt=Date.now();save();emit('delivery',{chatId:cid,message:m,status});return true};
 const createContact=(name,meta={})=>{const c={id:'contact_'+Date.now().toString(36),name:String(name||'ESI Learner'),status:'offline',lastSeen:0,...meta};S.contacts.push(c);save();emit('contact-created',c);return c};
 const block=uid=>{if(!uid)return false;if(!S.blocked.includes(uid))S.blocked.push(uid);save();emit('blocked',{uid});return true};
 const unblock=uid=>{S.blocked=S.blocked.filter(x=>x!==uid);save();emit('unblocked',{uid});return true};
 const markMentioned=(cid,mid)=>{const m=api.getChat?.(cid)?.messages.find(x=>x.id===mid);if(!m)return false;m.mentioned=true;save();return true};
 const room=(name,members=[])=>{const c=ensureRoom(name);if(!c)return null;c.members=[...new Set(members)];c.role='host';save();emit('room-created',c);return c};
 const callLog=(cid,type='voice',status='planned')=>{const x={id:'call_'+Date.now().toString(36),chatId:cid,type,status,startedAt:Date.now(),endedAt:null,duration:0};S.calls.unshift(x);S.calls=S.calls.slice(0,100);save();emit('call-log',x);return x};
 const searchMessages=(q,opts={})=>{const text=String(q||'').trim().toLowerCase(),out=[];(S.chats||[]).forEach(c=>normalize(c).messages.forEach(m=>{const hay=String(m.text||'').toLowerCase();if((!text||hay.includes(text))&&(!opts.chatId||opts.chatId===c.id)&&(!opts.sender||opts.sender===m.sender)&&(!opts.starred||m.starred))out.push({chat:c,message:m})}));return out.sort((a,b)=>b.message.createdAt-a.message.createdAt)};
 const pinChat=(cid,on=true)=>{const c=api.getChat?.(cid);if(!c)return false;c.pinned=!!on;save();emit('chat-pin',{chatId:cid,on});return true};
 const setThemeSettings=(patch={})=>{S.settings=Object.assign(S.settings,patch);save();emit('settings',S.settings);return S.settings};
 const backendAdapter=(transport)=>{S.transport=S.transport||{mode:'local',connected:false,lastSync:0};if(transport){S.transport=Object.assign(S.transport,transport);save()}return S.transport};
 window.ESICommunicationV10={state:S,save,normalize,ensureRoom,setRead,retry,delivery,createContact,block,unblock,markMentioned,room,callLog,searchMessages,pinChat,setThemeSettings,backendAdapter,events:{emit}};
 window.ESICommunicationHub=Object.assign(window.ESICommunicationHub||{},window.ESICommunicationV10);
 function css(){if(document.getElementById('esiC10CSS'))return;const s=document.createElement('style');s.id='esiC10CSS';s.textContent='.esi10-actions{display:flex;gap:4px;padding:5px 7px;border-top:1px solid #ffffff10;overflow:auto}.esi10-actions button,.esi10-tools button{flex:0 0 auto;border:1px solid #244a79;background:#0c2749;color:#bcd3ef;border-radius:8px;padding:6px 8px;font-size:7px;font-weight:800}.esi10-tools{display:flex;gap:5px;padding:5px 7px;overflow:auto}.esi10-menu{position:absolute;right:8px;bottom:56px;background:#081d36;border:1px solid #315a88;border-radius:11px;padding:5px;display:none;z-index:5}.esi10-menu.open{display:grid}.esi10-menu button{border:0;background:transparent;color:#dcecff;text-align:left;padding:8px 10px;font-size:7px;border-radius:7px}.esi10-menu button:hover{background:#10294d}.esi10-badge{display:inline-block;min-width:14px;padding:2px 4px;border-radius:99px;background:#1684e8;color:#fff;text-align:center;font-size:6px;margin-left:3px}';document.head.appendChild(s)}
 function enhanceExistingHub(){const hub=document.getElementById('esi9Hub');if(!hub||hub.dataset.v10==='1')return false;hub.dataset.v10='1';css();const head=hub.querySelector('.esi9head');if(head){const tools=document.createElement('div');tools.className='esi10-tools';tools.innerHTML='<button data-cmd="new">＋ New</button><button data-cmd="room">Live room</button><button data-cmd="search">Search</button><button data-cmd="settings">Settings</button>';head.after(tools);tools.onclick=e=>{const cmd=e.target.closest('button')?.dataset.cmd;if(cmd==='new'){const c=api.chat?.({kind:'direct',name:'New chat',members:[]});if(c){api.select?.(c.id);location.hash='chat='+c.id}}else if(cmd==='room'){const c=room('New Live Room');if(c)api.select?.(c.id)}else if(cmd==='search'){hub.querySelector('.esi9search')?.focus()}else if(cmd==='settings'){emit('settings-open',{settings:S.settings})}}}
 const compose=hub.querySelector('.esi9compose');if(compose&&!compose.querySelector('.esi10More')){const b=document.createElement('button');b.className='esi10More';b.type='button';b.textContent='＋';b.title='More message options';b.onclick=()=>{let m=hub.querySelector('.esi10-menu');if(!m){m=document.createElement('div');m.className='esi10-menu';m.innerHTML='<button data-a="emoji">Emoji</button><button data-a="poll">Poll</button><button data-a="attach">Attachment</button><button data-a="location">Location</button>';compose.parentElement.appendChild(m);m.onclick=e=>{const a=e.target.closest('button')?.dataset.a;if(a==='poll')api.poll?.(api.state.activeChat,'Quick poll',['Yes','No'],false);m.classList.remove('open')}}m.classList.toggle('open')};compose.prepend(b)}return true}
 function bootUI(){css();enhanceExistingHub();setTimeout(enhanceExistingHub,300);setTimeout(enhanceExistingHub,1000)}
 bootUI();emit('ready',{version:10});
}
wait(boot);
})();