/* Elite Scholar Institute — application controller 36.2306 — no service worker */
(() => {
  'use strict';

  const BUILD = '36.2306';
  const APK_URL = 'https://github.com/simonchisom96-alt/elitescholarinstitute/releases/latest/download/EliteScholarInstitute.apk';
  const NOTIF_DB_URL = 'https://elite-notification-default-rtdb.firebaseio.com';
  let installBox = null;
  let hideTimer = null;
  let deferredInstall = null;
  let notifications = {};

  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInstalled = () =>
    !!window.matchMedia?.('(display-mode: standalone)').matches ||
    !!window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    navigator.standalone === true ||
    /ESIAndroid\//i.test(navigator.userAgent);

  window.__esiAppLoadTime = Date.now();
  window.__esiNotifDbUrl = NOTIF_DB_URL;

  function toast(message, background = '#111827') {
    document.querySelectorAll('[data-esi-toast]').forEach(n => n.remove());
    const n = document.createElement('div');
    n.dataset.esiToast = '1';
    n.textContent = message;
    n.style.cssText = `position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;max-width:92%;padding:12px 18px;border-radius:12px;background:${background};color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 8px 25px rgba(0,0,0,.28);text-align:center`;
    (document.body || document.documentElement).appendChild(n);
    setTimeout(() => n.remove(), 4500);
  }
  window.showToast = toast;

  function ensureManifest() {
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = '/manifest.json?v=' + BUILD;
  }

  function viewportFix() {
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.name = 'viewport';
      document.head.appendChild(vp);
    }
    const content = vp.getAttribute('content') || 'width=device-width, initial-scale=1';
    vp.setAttribute('content', /viewport-fit\s*=\s*cover/i.test(content) ? content : content + ', viewport-fit=cover');
    const setVH = () => document.documentElement.style.setProperty('--app-vh', `${innerHeight * 0.01}px`);
    setVH();
    addEventListener('resize', setVH, { passive: true });
    addEventListener('orientationchange', () => setTimeout(setVH, 150), { passive: true });
    if (window.visualViewport) visualViewport.addEventListener('resize', setVH, { passive: true });
  }

  function createInstallUI() {
    if (document.getElementById('esiInstallPopup')) {
      installBox = document.getElementById('esiInstallPopup');
      return;
    }
    const p = document.createElement('section');
    p.id = 'esiInstallPopup';
    p.style.cssText = 'position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;width:92%;max-width:400px;z-index:2147483646;background:#0f172a;color:#fff;border:1px solid #2563eb;border-radius:17px;padding:13px;box-shadow:0 12px 40px rgba(0,0,0,.38);opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,-18px);transition:opacity .25s ease,transform .25s ease,visibility .25s ease';
    p.innerHTML = '<button type="button" data-close aria-label="Close" style="position:absolute;right:8px;top:8px;width:27px;height:27px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#cbd5e1;font-size:17px">×</button><div style="display:flex;align-items:center;gap:10px;padding-right:30px"><img src="/logo.jpg" alt="Elite Scholar Institute" style="width:40px;height:40px;border-radius:50%;object-fit:cover"><div><strong style="display:block;color:#60a5fa;font-size:13.5px">ELITE SCHOLAR INSTITUTE</strong><span data-install-text style="display:block;margin-top:3px;color:#e5e7eb;font-size:12px;line-height:1.45"></span></div></div><button type="button" data-install style="display:block;width:100%;margin-top:11px;padding:11px;border:0;border-radius:11px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;font-size:13px"></button>';
    document.body.appendChild(p);
    installBox = p;
    p.querySelector('[data-close]').onclick = hideInstall;
    p.querySelector('[data-install]').onclick = installNow;
    updateInstallText();
  }

  function updateInstallText() {
    if (!installBox) return;
    const text = installBox.querySelector('[data-install-text]');
    const button = installBox.querySelector('[data-install]');
    if (isAndroid && !isInstalled()) {
      text.textContent = 'Get the Android app directly. No browser install prompt is required.';
      button.textContent = 'Download Android App';
    } else if (isIOS) {
      text.textContent = 'On iPhone or iPad, use Share → Add to Home Screen to install the website.';
      button.textContent = 'Show iPhone Instructions';
    } else {
      text.textContent = 'Add Elite Scholar Institute to your device for faster access.';
      button.textContent = 'Install / Add to Home Screen';
    }
  }

  function showInstall() {
    if (isInstalled()) return;
    createInstallUI();
    updateInstallText();
    installBox.style.opacity = '1';
    installBox.style.visibility = 'visible';
    installBox.style.pointerEvents = 'auto';
    installBox.style.transform = 'translate(-50%,0)';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideInstall, 10000);
  }

  function hideInstall() {
    if (!installBox) return;
    installBox.style.opacity = '0';
    installBox.style.visibility = 'hidden';
    installBox.style.pointerEvents = 'none';
    installBox.style.transform = 'translate(-50%,-18px)';
    clearTimeout(hideTimer);
  }

  async function installNow() {
    hideInstall();
    if (isAndroid && !isInstalled()) {
      window.location.href = APK_URL;
      return;
    }
    if (deferredInstall) {
      const event = deferredInstall;
      deferredInstall = null;
      try {
        event.prompt();
        await event.userChoice;
      } catch (_) {}
      return;
    }
    if (isIOS) {
      toast('Tap Share, then choose Add to Home Screen.', '#2563eb');
      return;
    }
    toast('Use your browser menu and choose Install app or Add to Home screen.', '#2563eb');
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstall = event;
    window.__esiInstallAvailable = true;
    if (!isAndroid && !isIOS) showInstall();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    window.__esiInstallAvailable = false;
    hideInstall();
    toast('App installed successfully', '#16a34a');
  });

  // Remove only legacy ESI service workers left on a device from older builds.
  // No service worker is registered by this version.
  async function removeLegacyServiceWorkers() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    } catch (_) {}
  }

  function ensureBell() {
    if (location.pathname.endsWith('/notification.html') || document.getElementById('notifBellBtn')) return;
    const s = document.createElement('style');
    s.textContent = '#notifBellBtn{position:fixed;top:calc(260px + env(safe-area-inset-top));right:5px;z-index:9990;background:#0f172a;border:1px solid #2563eb;border-radius:50%;width:42px;height:42px;display:grid;place-items:center;font-size:19px;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer;-webkit-tap-highlight-color:transparent}#globalUnreadBadge{display:none;position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#ff2d55;box-shadow:0 0 8px 2px rgba(255,45,85,.9)}#globalUnreadBadge.show{display:block}';
    document.head.appendChild(s);
    const b = document.createElement('button');
    b.id = 'notifBellBtn';
    b.setAttribute('aria-label', 'Notifications');
    b.innerHTML = '🔔<span id="globalUnreadBadge"></span>';
    b.onclick = () => { location.href = '/notification.html'; };
    document.body.appendChild(b);
  }

  function updateBell() {
    const b = document.getElementById('globalUnreadBadge');
    if (!b) return;
    let read = new Set();
    try { read = new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); } catch (_) {}
    const unread = Object.keys(notifications).filter(id => !read.has(id)).length;
    b.classList.toggle('show', unread > 0 && !location.pathname.endsWith('/notification.html'));
  }
  window.esiUpdateBellBadge = updateBell;

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
      s.src = urls[i++];
      s.onload = next;
      s.onerror = next;
      document.head.appendChild(s);
    };
    next();
  }

  function setupBell() {
    ensureBell();
    loadFirebase(() => {
      if (!window.firebase?.database || !window.firebase?.auth) return;
      let app;
      try {
        const config = window.FIREBASE_CONFIG || {
          apiKey: 'AIzaSyDkjELsB4qeaumvsMAIDGIFZgNzl6eoBPM',
          authDomain: 'elite-notification.firebaseapp.com',
          databaseURL: NOTIF_DB_URL,
          projectId: 'elite-notification',
          storageBucket: 'elite-notification.firebasestorage.app',
          messagingSenderId: '359910414254',
          appId: '1:359910414254:web:a1bafd3e23fd554a975a3f'
        };
        app = firebase.apps.find(a => a.name === 'notifications') || firebase.initializeApp(config, 'notifications');
      } catch (_) { return; }
      const auth = app.auth();
      const db = app.database();
      const ready = auth.currentUser ? Promise.resolve() : auth.signInAnonymously().catch(() => null);
      ready.then(() => {
        db.ref('notifications').orderByChild('timestamp').limitToLast(50).on('value', snap => {
          notifications = snap.val() || {};
          updateBell();
        });
      });
    });
  }

  addEventListener('online', () => toast('Back Online', '#16a34a'));
  addEventListener('offline', () => toast('You are offline', '#dc2626'));
  addEventListener('storage', e => { if (e.key === 'notif_read_ids') updateBell(); });

  async function boot() {
    ensureManifest();
    viewportFix();
    await removeLegacyServiceWorkers();
    setupBell();
    createInstallUI();
    if (!isInstalled()) setTimeout(showInstall, 8000);
  }

  addEventListener('pageshow', () => {
    if (!isInstalled()) setTimeout(showInstall, 500);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
