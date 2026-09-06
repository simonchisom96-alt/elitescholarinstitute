/* ESI Quiz Studio Communication V11
   WhatsApp-like communication surfaces for ESI.
   Keeps the existing V10 chat foundation intact and adds:
   - Notifications surface matching notification.html's feed model
   - Status surface for admin video/image/text updates
   - Public multiplayer surface linked to the existing quiz.html flow
   - Mobile-first tabs, unread counters, search, saved/archived hooks
   - Backend-ready adapters; no API keys or secrets in the browser
*/
(function(){
  'use strict';
  const root = window.ESICommunicationV10 || window.ESICommunicationV9 || window.ESICommunicationHub || {};
  const KEY='esi.communication.v11';
  const DAY=24*60*60*1000;
  const base = {
    version:11,
    notifications:[],
    statuses:[],
    publicRooms:[],
    viewedStatuses:{},
    notificationReads:{},
    pinnedChats:{},
    settings:{statusAutoPlay:false,notifications:true,mobileLayout:true}
  };
  let state={...base};
  try{ state={...base,...JSON.parse(localStorage.getItem(KEY)||'{}')}; }catch(e){}
  state.notifications=Array.isArray(state.notifications)?state.notifications:[];
  state.statuses=Array.isArray(state.statuses)?state.statuses:[];
  state.publicRooms=Array.isArray(state.publicRooms)?state.publicRooms:[];
  state.viewedStatuses=state.viewedStatuses||{};
  state.notificationReads=state.notificationReads||{};
  state.pinnedChats=state.pinnedChats||{};
  state.settings={...base.settings,...(state.settings||{})};

  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){} return state;}
  function uid(prefix){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function ago(ts){
    const s=Math.max(0,Math.floor((Date.now()-(ts||Date.now()))/1000));
    if(s<60)return 'now'; const m=Math.floor(s/60); if(m<60)return m+'m';
    const h=Math.floor(m/60); if(h<24)return h+'h'; const d=Math.floor(h/24); return d+'d';
  }
  function notifyChange(detail){
    save();
    try{window.dispatchEvent(new CustomEvent('esi:communication:v11',{detail:detail||state}));}catch(e){}
  }

  function addNotification(item){
    const n={id:item.id||uid('n'),type:item.type||'announcement',title:item.title||'Elite Scholar Institute',text:item.text||'',author:item.author||'ESI Admin',timestamp:item.timestamp||Date.now(),priority:item.priority||'normal',media:item.media||null,link:item.link||null,quiz:item.quiz||null,read:false,saved:!!item.saved};
    state.notifications.unshift(n); state.notifications=state.notifications.slice(0,100); notifyChange({type:'notification',item:n}); return n;
  }
  function markNotificationRead(id){ if(id) state.notificationReads[id]=Date.now(); const n=state.notifications.find(x=>x.id===id); if(n)n.read=true; notifyChange({type:'notification-read',id}); }
  function markNotificationsRead(ids){(ids||state.notifications.map(n=>n.id)).forEach(markNotificationRead);}
  function unreadNotifications(){return state.notifications.filter(n=>!state.notificationReads[n.id]&&!n.read).length;}
  function searchNotifications(q){q=String(q||'').trim().toLowerCase(); if(!q)return state.notifications.slice(); return state.notifications.filter(n=>[n.title,n.text,n.author,n.type].join(' ').toLowerCase().includes(q));}

  function addStatus(item){
    const s={id:item.id||uid('s'),type:item.type||'text',title:item.title||'',text:item.text||'',media:item.media||null,author:item.author||'ESI Admin',timestamp:item.timestamp||Date.now(),expiresAt:item.expiresAt||(Date.now()+DAY),audience:item.audience||'public',views:item.views||0};
    state.statuses.unshift(s); state.statuses=state.statuses.slice(0,50); notifyChange({type:'status',item:s}); return s;
  }
  function activeStatuses(){
    const now=Date.now(); return state.statuses.filter(s=>(s.expiresAt||0)>now);
  }
  function viewStatus(id){if(!id)return; state.viewedStatuses[id]=Date.now(); const s=state.statuses.find(x=>x.id===id); if(s)s.views=Number(s.views||0)+1; notifyChange({type:'status-view',id});}
  function unreadStatuses(){return activeStatuses().filter(s=>!state.viewedStatuses[s.id]).length;}

  function addPublicRoom(item){
    const r={id:item.id||uid('room'),code:String(item.code||'').toUpperCase(),name:item.name||'ESI Live Quiz',host:item.host||'ESI Host',players:Number(item.players||0),maxPlayers:Number(item.maxPlayers||100),status:item.status||'waiting',public:item.public!==false,quizId:item.quizId||null,updatedAt:item.updatedAt||Date.now()};
    state.publicRooms=[r,...state.publicRooms.filter(x=>x.id!==r.id)].slice(0,50); notifyChange({type:'public-room',item:r}); return r;
  }
  function removePublicRoom(id){state.publicRooms=state.publicRooms.filter(r=>r.id!==id);notifyChange({type:'public-room-remove',id});}
  function publicRooms(q){
    const now=Date.now(); state.publicRooms=state.publicRooms.filter(r=>r.updatedAt+DAY*2>now);
    q=String(q||'').trim().toLowerCase(); return state.publicRooms.filter(r=>!q||[r.name,r.code,r.host,r.status].join(' ').toLowerCase().includes(q));
  }

  function openSurface(surface){
    const hub=document.getElementById('esi9Hub'); if(!hub)return false;
    hub.classList.add('show');
    document.querySelectorAll('[data-esi-v11-tab]').forEach(b=>b.classList.toggle('active',b.dataset.esiV11Tab===surface));
    document.querySelectorAll('.esi-v11-panel').forEach(p=>p.hidden=p.dataset.esiV11Panel!==surface);
    renderSurface(surface); return true;
  }

  function ensureUI(){
    const hub=document.getElementById('esi9Hub'); if(!hub)return;
    if(document.getElementById('esiV11Styles'))return;
    const st=document.createElement('style'); st.id='esiV11Styles'; st.textContent=`
      #esi9Hub .esi-v11-nav{display:flex;gap:6px;padding:8px 10px;overflow:auto;border-bottom:1px solid rgba(255,255,255,.08);scrollbar-width:none}
      #esi9Hub .esi-v11-nav::-webkit-scrollbar{display:none}
      #esi9Hub .esi-v11-tab{position:relative;flex:0 0 auto;border:1px solid rgba(255,255,255,.1);background:#0b2040;color:#9db3dc;border-radius:999px;padding:7px 12px;font:700 10px Poppins,sans-serif}
      #esi9Hub .esi-v11-tab.active{background:#1565ff;color:#fff;border-color:#1565ff}
      #esi9Hub .esi-v11-badge{display:inline-grid;place-items:center;min-width:16px;height:16px;margin-left:4px;padding:0 4px;border-radius:99px;background:#ff8a00;color:#170d00;font-size:8px}
      #esi9Hub .esi-v11-panel{padding:10px;max-height:62vh;overflow:auto}
      #esi9Hub .esi-v11-card{background:#0d1b3e;border:1px solid #1e3a6e;border-radius:14px;padding:11px;margin-bottom:8px}
      #esi9Hub .esi-v11-row{display:flex;align-items:center;gap:9px}
      #esi9Hub .esi-v11-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#122a55;border:1px solid #2a4d8f;font-weight:800;color:#8fb0ff;flex:0 0 auto}
      #esi9Hub .esi-v11-title{font-size:11.5px;font-weight:800;color:#f2f6ff}
      #esi9Hub .esi-v11-meta{font-size:8.5px;color:#6f88b8;margin-top:2px}
      #esi9Hub .esi-v11-text{font-size:11px;line-height:1.45;color:#dce8ff;margin-top:8px;white-space:pre-wrap;word-break:break-word}
      #esi9Hub .esi-v11-chip{font-size:8px;font-weight:800;border:1px solid #2a4d8f;color:#8fb0ff;background:#12224a;border-radius:999px;padding:3px 7px}
      #esi9Hub .esi-v11-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
      #esi9Hub .esi-v11-action{border:1px solid #2a4d8f;background:#102b4f;color:#dce8ff;border-radius:9px;padding:7px 9px;font:700 9px Poppins,sans-serif}
      #esi9Hub .esi-v11-action.primary{background:#1565ff;border-color:#1565ff;color:#fff}
      #esi9Hub .esi-v11-search{width:100%;padding:9px 11px;margin-bottom:8px;border-radius:10px;border:1px solid #1e3a6e;background:#0a162d;color:#f2f6ff;font:600 11px Poppins,sans-serif}
      #esi9Hub .esi-v11-status-strip{display:flex;gap:10px;overflow:auto;padding:2px 0 10px;scrollbar-width:none}
      #esi9Hub .esi-v11-status-strip::-webkit-scrollbar{display:none}
      #esi9Hub .esi-v11-status{flex:0 0 64px;text-align:center;font-size:8px;color:#9db3dc}
      #esi9Hub .esi-v11-ring{width:54px;height:54px;border-radius:50%;padding:2px;background:#1565ff;margin:0 auto 4px}
      #esi9Hub .esi-v11-ring>div{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:#0d1b3e;border:2px solid #0d1b3e}
      #esi9Hub .esi-v11-media{width:100%;max-height:210px;object-fit:cover;border-radius:10px;margin-top:8px;border:1px solid #1e3a6e}
      #esi9Hub .esi-v11-room-code{font-size:18px;font-weight:900;letter-spacing:2px;color:#ffd84d}
      #esi9Hub .esi-v11-empty{padding:24px 10px;text-align:center;color:#6f88b8;font-size:10px}
    `; document.head.appendChild(st);

    const oldNav=hub.querySelector('.esi-v11-nav'); if(oldNav)oldNav.remove();
    const nav=document.createElement('div'); nav.className='esi-v11-nav';
    const tabs=[['chats','Chats'],['groups','Groups'],['rooms','Live Quiz'],['notifications','Notifications'],['status','Status'],['saved','Saved']];
    nav.innerHTML=tabs.map(([id,label])=>`<button class="esi-v11-tab" data-esi-v11-tab="${id}">${label}<span class="esi-v11-badge" data-esi-v11-count="${id}" hidden></span></button>`).join('');
    hub.insertBefore(nav,hub.firstChild);
    const panels=document.createElement('div'); panels.id='esiV11Panels';
    ['chats','groups','rooms','notifications','status','saved'].forEach(id=>{const p=document.createElement('section');p.className='esi-v11-panel';p.dataset.esiV11Panel=id;p.hidden=true;panels.appendChild(p);});
    hub.appendChild(panels);
    nav.addEventListener('click',e=>{const b=e.target.closest('[data-esi-v11-tab]');if(b)openSurface(b.dataset.esiV11Tab);});
    openSurface('chats');
  }

  function renderSurface(surface){
    const p=document.querySelector(`.esi-v11-panel[data-esi-v11-panel="${surface}"]`); if(!p)return;
    if(surface==='notifications'){
      p.innerHTML=`<input class="esi-v11-search" id="esiV11NotifSearch" placeholder="Search notifications…"><div id="esiV11NotifList"></div><div class="esi-v11-actions"><button class="esi-v11-action primary" data-v11-markall>Mark all read</button><a class="esi-v11-action" href="notification.html">Open full notifications</a></div>`;
      const render=()=>{const arr=searchNotifications(document.getElementById('esiV11NotifSearch')?.value||'');const list=document.getElementById('esiV11NotifList');list.innerHTML=arr.length?arr.map(n=>`<article class="esi-v11-card" data-v11-notif="${esc(n.id)}"><div class="esi-v11-row"><div class="esi-v11-avatar">${n.type==='poll'?'📊':n.type==='quiz'?'❓':n.type==='image'?'🖼️':'🔔'}</div><div style="flex:1"><div class="esi-v11-title">${esc(n.title)}</div><div class="esi-v11-meta">${esc(n.author)} · ${ago(n.timestamp)}${n.priority==='urgent'?' · URGENT':''}</div></div>${(!n.read&&!state.notificationReads[n.id])?'<span class="esi-v11-chip">NEW</span>':''}</div><div class="esi-v11-text">${esc(n.text)}</div>${n.media?.url?`<img class="esi-v11-media" src="${esc(n.media.url)}" alt="${esc(n.media.alt||'Notification media')}">`:''}<div class="esi-v11-actions"><button class="esi-v11-action" data-v11-read="${esc(n.id)}">${n.read||state.notificationReads[n.id]?'Read':'Mark read'}</button>${n.link?`<a class="esi-v11-action" href="${esc(n.link)}">Open</a>`:''}</div></article>`).join(''):'<div class="esi-v11-empty">No notifications</div>';};
      document.getElementById('esiV11NotifSearch').oninput=render; render();
      p.onclick=e=>{const r=e.target.closest('[data-v11-read]');if(r){markNotificationRead(r.dataset.v11Read);render();}if(e.target.closest('[data-v11-markall]')){markNotificationsRead();render();}};
    }else if(surface==='status'){
      const arr=activeStatuses();
      p.innerHTML=`<div class="esi-v11-status-strip"><div class="esi-v11-status"><div class="esi-v11-ring"><div>ESI</div></div><b>Admin</b></div>${arr.map(s=>`<div class="esi-v11-status"><div class="esi-v11-ring"><div>${s.type==='video'?'▶':s.type==='image'?'▣':'A'}</div></div><span>${esc((s.title||s.type).slice(0,10))}</span></div>`).join('')}</div><div id="esiV11StatusList"></div><div class="esi-v11-card"><div class="esi-v11-title">Admin Status</div><div class="esi-v11-meta">Public status updates expire after 24 hours by default.</div><div class="esi-v11-actions"><button class="esi-v11-action primary" data-v11-demo-status>Preview admin video status</button><a class="esi-v11-action" href="notification.html">Admin notifications</a></div></div>`;
      const list=document.getElementById('esiV11StatusList');
      list.innerHTML=arr.length?arr.map(s=>`<article class="esi-v11-card" data-v11-status="${esc(s.id)}"><div class="esi-v11-row"><div class="esi-v11-avatar">${s.type==='video'?'▶':'ESI'}</div><div style="flex:1"><div class="esi-v11-title">${esc(s.title||'ESI Admin Status')}</div><div class="esi-v11-meta">${esc(s.author)} · ${ago(s.timestamp)} · ${Math.max(0,Math.ceil(((s.expiresAt||0)-Date.now())/3600000))}h left</div></div>${state.viewedStatuses[s.id]?'':'<span class="esi-v11-chip">NEW</span>'}</div><div class="esi-v11-text">${esc(s.text)}</div>${s.type==='video'&&s.media?.url?`<video class="esi-v11-media" controls playsinline preload="metadata" ${state.settings.statusAutoPlay?'autoplay muted':''} src="${esc(s.media.url)}"></video>`:''}${s.type==='image'&&s.media?.url?`<img class="esi-v11-media" src="${esc(s.media.url)}" alt="${esc(s.media.alt||'ESI status')}">`:''}<div class="esi-v11-actions"><button class="esi-v11-action" data-v11-view="${esc(s.id)}">${state.viewedStatuses[s.id]?'Viewed':'View status'}</button></div></article>`).join(''):'<div class="esi-v11-empty">No active status updates yet.</div>';
      p.onclick=e=>{const v=e.target.closest('[data-v11-view]');if(v){viewStatus(v.dataset.v11View);renderSurface('status');}const d=e.target.closest('[data-v11-demo-status]');if(d){const demo=addStatus({type:'video',title:'ESI Admin Video',text:'Admin video status preview — connect the media URL through the secure backend adapter when API engines are added.',media:{url:'',alt:'Admin video status'}});renderSurface('status');return demo;}};
    }else if(surface==='rooms'){
      p.innerHTML=`<input class="esi-v11-search" id="esiV11RoomSearch" placeholder="Search public quizzes or room code…"><div id="esiV11RoomList"></div><div class="esi-v11-card"><div class="esi-v11-title">Public Multiplayer</div><div class="esi-v11-meta">Use the existing ESI multiplayer flow. No private backend credentials are exposed here.</div><div class="esi-v11-actions"><a class="esi-v11-action primary" href="quiz.html">Open Multiplayer Quiz</a><button class="esi-v11-action" data-v11-refresh-rooms>Refresh rooms</button></div></div>`;
      const render=()=>{const arr=publicRooms(document.getElementById('esiV11RoomSearch')?.value||'');const list=document.getElementById('esiV11RoomList');list.innerHTML=arr.length?arr.map(r=>`<article class="esi-v11-card"><div class="esi-v11-row"><div style="flex:1"><div class="esi-v11-title">${esc(r.name)}</div><div class="esi-v11-meta">${esc(r.host)} · ${esc(r.status)} · ${r.players}/${r.maxPlayers}</div></div><div class="esi-v11-room-code">${esc(r.code||'----')}</div></div><div class="esi-v11-actions"><a class="esi-v11-action primary" href="quiz.html">Join</a></div></article>`).join(''):'<div class="esi-v11-empty">No public live quizzes right now.</div>';};
      document.getElementById('esiV11RoomSearch').oninput=render; render(); p.onclick=e=>{if(e.target.closest('[data-v11-refresh-rooms]'))render();};
    }else if(surface==='saved'){
      p.innerHTML='<div class="esi-v11-card"><div class="esi-v11-title">Saved</div><div class="esi-v11-meta">Saved messages and notification items remain available here as the communication backend is connected.</div></div>';
    }else{
      p.innerHTML='<div class="esi-v11-card"><div class="esi-v11-title">ESI Communication</div><div class="esi-v11-meta">Chats, groups, rooms, notifications and status share one communication shell.</div></div>';
    }
    updateBadges();
  }

  function updateBadges(){
    const vals={notifications:unreadNotifications(),status:unreadStatuses(),rooms:state.publicRooms.filter(r=>r.status==='live').length};
    Object.keys(vals).forEach(k=>{const el=document.querySelector(`[data-esi-v11-count="${k}"]`);if(el){el.textContent=vals[k]>99?'99+':vals[k];el.hidden=!vals[k];}});
  }

  const api={state,getState:()=>state,save,addNotification,markNotificationRead,markNotificationsRead,unreadNotifications,searchNotifications,addStatus,activeStatuses,viewStatus,unreadStatuses,addPublicRoom,removePublicRoom,publicRooms,openSurface,updateBadges};
  window.ESICommunicationV11=api;
  window.ESICommunicationHub=Object.assign(window.ESICommunicationHub||{},api);
  window.ESICommunicationV4=window.ESICommunicationV4||api;

  function boot(){
    ensureUI();
    updateBadges();
    window.addEventListener('esi:communication:v10',updateBadges);
    window.addEventListener('esi:communication:v9',updateBadges);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
