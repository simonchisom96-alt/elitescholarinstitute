(() => {
  if (location.protocol === 'chrome-error:') return;

  const CACHE_VERSION = 'elite-scholar-v36.2281';
  const NOTIF_DB_URL = 'https://elite-notification-default-rtdb.firebaseio.com';
  window.__esiAppLoadTime = Date.now();
  window.__esiNotifDbUrl = NOTIF_DB_URL;

  /* ---------- Basic mobile stability ---------- */
  const setVH = () => document.documentElement.style.setProperty('--app-vh', `${innerHeight * 0.01}px`);
  setVH();
  addEventListener('resize', setVH, { passive: true });
  addEventListener('orientationchange', () => setTimeout(setVH, 150), { passive: true });
  if (window.visualViewport) visualViewport.addEventListener('resize', setVH, { passive: true });

  function installBaseCSS() {
    const s = document.createElement('style');
    s.textContent = `
      html,body{min-height:100%;min-height:100dvh;overflow-x:hidden;-webkit-overflow-scrolling:touch}
      *,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
      img,video,canvas,iframe{max-width:100%}
      .esi-toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:100000;background:#111;color:#fff;padding:12px 18px;border-radius:12px;font:500 14px system-ui;box-shadow:0 8px 25px rgba(0,0,0,.3)}
      #esiInstallPopup{position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;width:92%;max-width:400px;z-index:100001;background:#0f172a;color:#fff;border:1px solid #2563eb;border-radius:16px;padding:13px;box-shadow:0 8px 30px rgba(0,0,0,.35);opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,-22px);transition:opacity .35s ease,transform .35s ease,visibility .35s}
      #esiInstallPopup.esi-show{opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,0)}
      #esiInstallPopup button{font:700 13px system-ui}
      @media(display-mode:standalone){body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}}
    `;
    document.head.appendChild(s);
  }

  function toast(text, background = '#111') {
    document.querySelectorAll('.esi-toast').forEach(x => x.remove());
    const t = document.createElement('div');
    t.className = 'esi-toast';
    t.textContent = text;
    t.style.background = background;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }
  window.showToast = toast;

  const isInstalled = () =>
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: window-controls-overlay)').matches ||
    navigator.standalone === true;

  /* ---------- Real install prompt ---------- */
  let deferredPrompt = null;
  let installHideTimer = null;

  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    window.__esiInstallAvailable = true;
    // If the page is already loaded, make the custom popup available immediately.
    if (document.readyState !== 'loading') showInstallPopup();
  });

  addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.__esiInstallAvailable = false;
    hideInstallPopup();
    toast('App installed successfully', '#16a34a');
    setTimeout(() => navigator.serviceWorker?.controller?.postMessage({ type: 'CHECK_DOWNLOAD_COMPLETE' }), 1500);
  });

  function createInstallPopup() {
    if (document.getElementById('esiInstallPopup')) return;
    const p = document.createElement('div');
    p.id = 'esiInstallPopup';
    p.innerHTML = `
      <button id="esiInstallClose" type="button" aria-label="Close" style="position:absolute;right:9px;top:8px;width:26px;height:26px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#cbd5e1;font-size:16px">×</button>
      <div style="display:flex;align-items:center;gap:10px;padding-right:28px">
        <img src="/logo.jpg" alt="ESI" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex:0 0 auto">
        <div style="min-width:0">
          <b style="display:block;color:#3b82f6;font-size:13.5px">ELITE SCHOLAR INSTITUTE</b>
          <span style="display:block;margin-top:2px;color:#e5e7eb;font-size:12px;line-height:1.45">Install the app for faster access and offline learning.</span>
        </div>
      </div>
      <button id="esiInstallButton" type="button" style="width:100%;margin-top:11px;padding:11px;border:0;border-radius:11px;background:#2563eb;color:#fff">Install Now</button>
    `;
    document.body.appendChild(p);
    document.getElementById('esiInstallClose').onclick = hideInstallPopup;
    document.getElementById('esiInstallButton').onclick = async () => {
      if (!deferredPrompt) {
        toast('Open your browser menu and choose “Install app”', '#2563eb');
        hideInstallPopup();
        return;
      }
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      try {
        promptEvent.prompt();
        await promptEvent.userChoice;
      } catch (_) {}
      hideInstallPopup();
    };
  }

  function showInstallPopup() {
    if (isInstalled()) return;
    createInstallPopup();
    const p = document.getElementById('esiInstallPopup');
    if (!p) return;
    p.classList.add('esi-show');
    clearTimeout(installHideTimer);
    installHideTimer = setTimeout(hideInstallPopup, 7000);
  }

  function hideInstallPopup() {
    const p = document.getElementById('esiInstallPopup');
    if (!p) return;
    p.classList.remove('esi-show');
    clearTimeout(installHideTimer);
  }

  /* The popup is deliberately independent of beforeinstallprompt.
     This guarantees the card itself appears. The native prompt is used
     automatically whenever the browser provides BeforeInstallPromptEvent. */
  function scheduleInstallPopup() {
    if (isInstalled()) return;
    clearTimeout(installHideTimer);
    setTimeout(showInstallPopup, 8000);
  }

  /* ---------- Service worker ---------- */
  function setupServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'DOWNLOAD_PROGRESS') {
        window.dispatchEvent(new CustomEvent('esiDownloadProgress', { detail: event.data }));
      }
      if (event.data?.type === 'DOWNLOAD_SUCCESS') toast('App downloaded successfully', '#16a34a');
    });

    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(reg => {
        reg.update().catch(() => {});
        if (reg.waiting) reg.waiting.postMessage('skipWaiting');
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage('skipWaiting');
            }
          });
        });
      })
      .catch(error => console.warn('[ESI SW]', error));

    // Important: no controllerchange reload. A worker update must never blank the page.
  }

  addEventListener('online', () => { toast('Back Online', '#16a34a'); handleOnlineNotification(); });
  addEventListener('offline', () => toast('You are offline', '#dc2626'));

  /* ---------- Notification permission ---------- */
  async function requestNotificationPermission() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    try {
      if (await Notification.requestPermission() === 'granted') toast('Reminders enabled', '#2563eb');
    } catch (_) {}
  }

  function requestNotificationPermissionInApp() {
    if (!isInstalled() || !('Notification' in window) || Notification.permission !== 'default') return;
    const last = Number(localStorage.getItem('esiLastPermissionAsk') || 0);
    if (Date.now() - last < 50 * 60 * 60 * 1000) return;
    localStorage.setItem('esiLastPermissionAsk', String(Date.now()));

    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:92%;max-width:400px;z-index:100002;background:#0f172a;border:1px solid #2563eb;border-radius:16px;padding:16px;text-align:center;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.35)';
    box.innerHTML = '<b>🔔 Turn on notifications</b><p style="font-size:11.5px;color:#94a3b8;line-height:1.5">Allow Elite Scholar Institute to notify you about updates and study materials.</p><div style="display:flex;gap:8px"><button id="esiNotifNo" style="flex:1;padding:10px;border:0;border-radius:10px">Don’t Allow</button><button id="esiNotifYes" style="flex:1;padding:10px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700">Allow</button></div>';
    document.body.appendChild(box);
    box.querySelector('#esiNotifNo').onclick = () => box.remove();
    box.querySelector('#esiNotifYes').onclick = async () => { box.remove(); await requestNotificationPermission(); };
  }

  const NOTIFICATIONS = [
    ['Dear Scholar, Your future is built today through persistent reading 🔥','Open your textbooks and continue your academic journey.','/Textbooks.html'],
    ["Rise high in the leader's board right now! 📊",'Start an interactive quiz session.','/quiz.html'],
    ['You have a brand new urgent notification waiting 🗨️','Open the announcement channel for updates.','/notification.html'],
    ['A smarter and faster way to prepare properly 📚','Your post UTME success guide is ready.','/postutme.html'],
    ['Stay strictly on the right track every single day 📃','Use the syllabus guide to organize your preparation.','/syllables.html'],
    ['Small daily wins matter for your exams 🧠','Start a challenging quiz session today.','/quiz.html']
  ];

  async function handleOnlineNotification() {
    if (!isInstalled() || !('Notification' in window) || Notification.permission !== 'granted') return;
    let i = Number(localStorage.getItem('esiNotifIndex') || 0);
    if (i >= NOTIFICATIONS.length) i = 0;
    const [title, body, url] = NOTIFICATIONS[i];
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon:'/logo.jpg', badge:'/logo.jpg', data:{url}, tag:'esi-'+Date.now() });
      localStorage.setItem('esiNotifIndex', String(i + 1));
    } catch (_) {}
  }

  /* ---------- Notification bell / Firebase ---------- */
  const notificationPage = () => location.pathname.endsWith('/notification.html');
  let latestNotifications = {};

  function ensureBell() {
    if (notificationPage() || document.getElementById('notifBellBtn')) return;
    const style = document.createElement('style');
    style.textContent = '#notifBellBtn{position:fixed;top:calc(260px + env(safe-area-inset-top));right:5px;z-index:9990;background:#0f172a;border:1px solid #2563eb;border-radius:50%;width:42px;height:42px;display:grid;place-items:center;font-size:19px;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer}#globalUnreadBadge{display:none;position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#ff2d55;box-shadow:0 0 8px 2px rgba(255,45,85,.9)}#globalUnreadBadge.show{display:block}';
    document.head.appendChild(style);
    const b = document.createElement('button');
    b.id = 'notifBellBtn';
    b.setAttribute('aria-label','Notifications');
    b.innerHTML = '🔔<span id="globalUnreadBadge"></span>';
    b.onclick = () => { location.href = '/notification.html'; };
    document.body.appendChild(b);
  }

  function updateBell() {
    const badge = document.getElementById('globalUnreadBadge');
    if (!badge) return;
    let read = new Set();
    try { read = new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); } catch (_) {}
    const unread = Object.keys(latestNotifications).filter(id => !read.has(id)).length;
    badge.classList.toggle('show', unread > 0 && !notificationPage());
  }
  window.esiUpdateBellBadge = updateBell;
  addEventListener('storage', e => { if (e.key === 'notif_read_ids') updateBell(); });

  function loadFirebase(done) {
    if (window.firebase?.database && window.firebase?.auth) return done();
    const urls = [
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'
    ];
    let i = 0;
    const next = () => {
      if (i >= urls.length) return done();
      const s = document.createElement('script');
      s.src = urls[i++]; s.onload = next; s.onerror = next; document.head.appendChild(s);
    };
    next();
  }

  function initRealtimeNotifications() {
    ensureBell();
    loadFirebase(() => {
      if (!window.firebase?.database || !window.firebase?.auth) return;
      const config = window.FIREBASE_CONFIG || {
        apiKey:'AIzaSyDkjELsB4qeaumvsMAIDGIFZgNzl6eoBPM',
        authDomain:'elite-notification.firebaseapp.com',
        databaseURL:NOTIF_DB_URL,
        projectId:'elite-notification',
        storageBucket:'elite-notification.firebasestorage.app',
        messagingSenderId:'359910414254',
        appId:'1:359910414254:web:a1bafd3e23fd554a975a3f'
      };
      let app;
      try { app = firebase.apps.find(a => a.name === 'notifications') || firebase.initializeApp(config, 'notifications'); }
      catch (_) { return; }
      const auth = app.auth(), db = app.database();
      (auth.currentUser ? Promise.resolve() : auth.signInAnonymously().catch(() => null)).then(() => {
        db.ref('notifications').orderByChild('timestamp').limitToLast(50).on('value', snap => {
          const value = snap.val() || {};
          const previous = new Set(Object.keys(latestNotifications));
          latestNotifications = value;
          updateBell();
          if (notificationPage()) return;
          Object.keys(value).forEach(id => {
            const item = value[id];
            if (previous.has(id) || !item?.timestamp || item.timestamp <= window.__esiAppLoadTime) return;
            const popup = document.createElement('div');
            popup.style.cssText='position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:92%;max-width:400px;z-index:99999;background:#0f172a;border:1px solid #2563eb;border-radius:16px;padding:12px;color:#f2f6ff;font-size:12.5px;line-height:1.4;box-shadow:0 8px 30px rgba(0,0,0,.35)';
            popup.textContent = `${item.authorName || 'Elite Scholar Admin'}: ${item.text || item.body || 'New announcement received.'}`;
            popup.onclick = () => { location.href='/notification.html'; };
            document.body.appendChild(popup);
            setTimeout(() => popup.remove(), 7500);
          });
        });
      });
    });
  }

  function start() {
    installBaseCSS();
    createInstallPopup();
    ensureBell();
    initRealtimeNotifications();
    setupServiceWorker();
    scheduleInstallPopup();
    setTimeout(requestNotificationPermissionInApp, 6000);
  }

  addEventListener('pageshow', () => {
    if (isInstalled()) hideInstallPopup();
    else scheduleInstallPopup();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
