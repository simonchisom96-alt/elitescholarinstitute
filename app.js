(() => {
  if (location.protocol === 'chrome-error:') return;
  const CACHE_VERSION = 'elite-scholar-v36.2280';
  const NOTIF_DB_URL = 'https://elite-notification-default-rtdb.firebaseio.com';
  window.__esiAppLoadTime = Date.now();
  window.__esiNotifDbUrl = NOTIF_DB_URL;

  const setVH = () => document.documentElement.style.setProperty('--app-vh', `${innerHeight * 0.01}px`);
  setVH();
  addEventListener('resize', setVH, { passive:true });
  addEventListener('orientationchange', () => setTimeout(setVH,150), { passive:true });
  if (visualViewport) visualViewport.addEventListener('resize', setVH, { passive:true });

  let vp = document.querySelector('meta[name="viewport"]');
  if (!vp) { vp=document.createElement('meta'); vp.name='viewport'; document.head.appendChild(vp); }
  if (!/viewport-fit\s*=\s*cover/i.test(vp.content||'')) vp.content=(vp.content||'width=device-width, initial-scale=1')+', viewport-fit=cover';

  const style=document.createElement('style');
  style.textContent=`html,body{min-height:100%;min-height:100dvh;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}img{content-visibility:auto}@media(display-mode:standalone){body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}::-webkit-scrollbar{display:none}}#installPopup{transition:opacity .4s ease,transform .4s ease;opacity:0;transform:translate(-50%,-18px)}#installPopup.show{opacity:1;transform:translate(-50%,0)}.esi-toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:100000;background:#111;color:#fff;padding:12px 20px;border-radius:12px;font:500 14px system-ui;box-shadow:0 8px 25px rgba(0,0,0,.25)}#notifBellBtn{position:fixed;top:calc(260px + env(safe-area-inset-top));right:5px;z-index:9990;background:#0f172a;border:1px solid #2563eb;border-radius:50%;width:42px;height:42px;display:grid;place-items:center;font-size:19px;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer}#globalUnreadBadge{display:none;position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#ff2d55;box-shadow:0 0 8px 2px rgba(255,45,85,.8)}#globalUnreadBadge.show{display:block}`;
  document.head.appendChild(style);

  function showToast(m,b='#111'){document.querySelectorAll('.esi-toast').forEach(x=>x.remove());const t=document.createElement('div');t.className='esi-toast';t.textContent=m;t.style.background=b;document.body.appendChild(t);setTimeout(()=>t.remove(),4000)}
  window.showToast=showToast;
  const isAppMode=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;

  // ===== INSTALL PROMPT =====
  let deferredPrompt=null,installTimer=null;
  function createInstallPopup(){
    if(document.getElementById('installPopup'))return;
    document.body.insertAdjacentHTML('beforeend',`<div id="installPopup" style="display:none;position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;background:#0f172a;border:1px solid #2563eb;border-radius:16px;padding:12px;z-index:99999;width:92%;max-width:400px;box-shadow:0 8px 30px rgba(59,130,246,.3)"><button id="closeBtn" style="position:absolute;top:8px;right:10px;background:rgba(255,255,255,.06);border:0;width:24px;height:24px;border-radius:50%;color:#94a3b8">×</button><div style="display:flex;align-items:center;gap:10px"><img src="/logo.jpg" style="width:36px;height:36px;border-radius:50%;object-fit:cover"><div style="min-width:0;color:#f2f6ff;font-size:12px;line-height:1.4"><b style="display:block;color:#3b82f6;font-size:13px">ELITE SCHOLAR INSTITUTE</b>Install the app for faster access and offline learning.</div></div><button id="installBtn" style="width:100%;margin-top:10px;padding:10px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700">Install Now</button></div>`);
    document.getElementById('closeBtn').onclick=hideInstallPopup;
    document.getElementById('installBtn').onclick=async()=>{if(!deferredPrompt){showToast('Use your browser menu and choose Install App');hideInstallPopup();return}const p=deferredPrompt;deferredPrompt=null;try{await p.prompt();await p.userChoice}catch(_){}hideInstallPopup()};
  }
  function showInstallPopup(){if(isAppMode()||!deferredPrompt)return;createInstallPopup();const p=document.getElementById('installPopup');p.style.display='block';requestAnimationFrame(()=>p.classList.add('show'));clearTimeout(installTimer);installTimer=setTimeout(hideInstallPopup,7000)}
  function hideInstallPopup(){const p=document.getElementById('installPopup');if(!p)return;p.classList.remove('show');clearTimeout(installTimer);setTimeout(()=>{if(!p.classList.contains('show'))p.style.display='none'},450)}
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;setTimeout(showInstallPopup,8000)});
  addEventListener('appinstalled',()=>{deferredPrompt=null;hideInstallPopup();navigator.serviceWorker?.controller?.postMessage({type:'CHECK_DOWNLOAD_COMPLETE'});setTimeout(requestNotificationPermissionInApp,5000)});

  // ===== SERVICE WORKER =====
  function setupSW(){
    if(!('serviceWorker' in navigator))return;
    navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{
      reg.update().catch(()=>{});
      if(reg.waiting)reg.waiting.postMessage('skipWaiting');
      reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)w.postMessage('skipWaiting')})});
    }).catch(e=>console.warn('[ESI SW]',e));
    navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='DOWNLOAD_PROGRESS')window.dispatchEvent(new CustomEvent('esiDownloadProgress',{detail:e.data}));if(e.data?.type==='DOWNLOAD_SUCCESS')showToast('App downloaded successfully','#16a34a')});
    // Deliberately no controllerchange reload: worker updates must never blank the page.
  }

  addEventListener('online',()=>{showToast('Back Online','#16a34a');handleOnlineEvent()});
  addEventListener('offline',()=>showToast('You are offline','#dc2626'));

  // ===== NOTIFICATION BELL + REALTIME NOTIFICATIONS =====
  const notificationPage=()=>location.pathname.endsWith('/notification.html');
  function ensureBell(){if(notificationPage()||document.getElementById('notifBellBtn'))return;const b=document.createElement('button');b.id='notifBellBtn';b.setAttribute('aria-label','Notifications');b.innerHTML='🔔<span id="globalUnreadBadge"></span>';b.onclick=()=>location.href='/notification.html';document.body.appendChild(b)}
  function getReadIds(){try{return new Set(JSON.parse(localStorage.getItem('notif_read_ids')||'[]'))}catch(_){return new Set()}}
  let latestCache={};
  function recomputeUnread(){const b=document.getElementById('globalUnreadBadge');if(!b)return;const n=Object.keys(latestCache).filter(id=>!getReadIds().has(id)).length;b.classList.toggle('show',n>0&&!notificationPage())}
  window.esiUpdateBellBadge=recomputeUnread;
  function showBroadcast(item){document.getElementById('whatsappPopupBanner')?.remove();const b=document.createElement('div');b.id='whatsappPopupBanner';b.style.cssText='position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);background:#0f172a;border:1px solid #2563eb;border-radius:16px;padding:12px;z-index:99999;width:92%;max-width:400px;box-shadow:0 8px 30px rgba(59,130,246,.3);cursor:pointer;color:#f2f6ff;font-size:12.5px;line-height:1.4';b.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px"><b style="color:#3b82f6">${item.authorName||'Elite Scholar Admin'}</b><span style="font-size:10px;color:#9db3dc">${item.timestamp?new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'Just now'}</span></div>${item.text||item.body||'New announcement received.'}`;b.onclick=()=>location.href='/notification.html';document.body.appendChild(b);setTimeout(()=>b.remove(),7500)}
  function loadFirebase(done){if(window.firebase?.database&&window.firebase?.auth)return done();const urls=['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'];let i=0;const next=()=>{if(i>=urls.length)return done();const s=document.createElement('script');s.src=urls[i++];s.onload=next;s.onerror=()=>console.warn('[ESI] Firebase CDN unavailable');document.head.appendChild(s)};next()}
  function initRealtimeNotifications(){ensureBell();loadFirebase(()=>{if(!window.firebase?.database||!window.firebase?.auth)return;const config=window.FIREBASE_CONFIG||{apiKey:'AIzaSyDkjELsB4qeaumvsMAIDGIFZgNzl6eoBPM',authDomain:'elite-notification.firebaseapp.com',databaseURL:NOTIF_DB_URL,projectId:'elite-notification',storageBucket:'elite-notification.firebasestorage.app',messagingSenderId:'359910414254',appId:'1:359910414254:web:a1bafd3e23fd554a975a3f'};let app;try{app=firebase.apps.find(a=>a.name==='notifications')||firebase.initializeApp(config,'notifications')}catch(_){return}const auth=app.auth(),db=app.database();(auth.currentUser?Promise.resolve():auth.signInAnonymously().catch(()=>null)).then(()=>db.ref('notifications').orderByChild('timestamp').limitToLast(50).on('value',snap=>{const val=snap.val()||{},old=new Set(Object.keys(latestCache));latestCache=val;recomputeUnread();if(notificationPage())return;Object.keys(val).forEach(id=>{const item=val[id];if(old.has(id)||!item?.timestamp||item.timestamp<=window.__esiAppLoadTime)return;showBroadcast(item)})}))})}

  const NOTIFICATIONS=[['Dear Scholar, Your future is built today through persistent reading 🔥','Open your textbooks and continue your academic journey.','/Textbooks.html'],["Rise high in the leader's board right now! 📊",'Start an interactive quiz session.','/quiz.html'],['You have a brand new urgent notification waiting 🗨️','Open the announcement channel for updates.','/notification.html'],['A smarter and faster way to prepare properly 📚','Your post UTME success guide is ready.','/postutme.html'],['Stay strictly on the right track every single day 📃','Use the syllabus guide to organize your preparation.','/syllables.html'],['Small daily wins matter for your exams 🧠','Start a challenging quiz session today.','/quiz.html']];
  async function handleOnlineEvent(){if(!isAppMode()||!('Notification' in window)||Notification.permission!=='granted')return;let i=Number(localStorage.getItem('esiNotifIndex')||0);if(i>=NOTIFICATIONS.length)i=0;const [title,body,url]=NOTIFICATIONS[i];try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:'/logo.jpg',badge:'/logo.jpg',data:{url},tag:'esi-'+Date.now()});localStorage.setItem('esiNotifIndex',String(i+1))}catch(_) {}}
  async function doRequestPermission(){if(!('Notification' in window)||Notification.permission!=='default')return;try{if(await Notification.requestPermission()==='granted')showToast('Reminders enabled','#2563eb')}catch(_) {}}
  function requestNotificationPermissionInApp(){if(!isAppMode()||!('Notification' in window)||Notification.permission!=='default')return;const last=Number(localStorage.getItem('esiLastPermissionAsk')||0);if(Date.now()-last<50*60*60*1000)return;localStorage.setItem('esiLastPermissionAsk',String(Date.now()));const p=document.createElement('div');p.style.cssText='position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:92%;max-width:400px;z-index:100001;background:#0f172a;border:1px solid #2563eb;border-radius:16px;padding:16px;text-align:center;color:#fff';p.innerHTML='<b>🔔 Turn on notifications</b><p style="font-size:11.5px;color:#94a3b8">Allow Elite Scholar Institute to notify you about updates and study materials.</p><div style="display:flex;gap:8px"><button id="esiNotifNo" style="flex:1;padding:10px;border:0;border-radius:10px">Don’t Allow</button><button id="esiNotifYes" style="flex:1;padding:10px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700">Allow</button></div>';document.body.appendChild(p);p.querySelector('#esiNotifNo').onclick=()=>p.remove();p.querySelector('#esiNotifYes').onclick=async()=>{p.remove();await doRequestPermission()}}

  function start(){createInstallPopup();ensureBell();initRealtimeNotifications();setupSW();setTimeout(requestNotificationPermissionInApp,6000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  addEventListener('pageshow',()=>{if(isAppMode())hideInstallPopup();else if(deferredPrompt){clearTimeout(installTimer);installTimer=setTimeout(showInstallPopup,8000)}});
})();
