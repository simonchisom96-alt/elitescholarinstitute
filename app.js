/* Elite Scholar Institute — application controller 36.2331 */
(() => {
  'use strict';

  const BUILD = '36.2331';
  const APK_URL = 'https://github.com/simonchisom96-alt/elitescholarinstitute/releases/latest/download/ESI.apk';
  const NOTIF_DB_URL = 'https://elite-notification-default-rtdb.firebaseio.com';
  const SW_URL = '/sw.js?v=' + BUILD;
  let installBox = null;
  let hideTimer = null;
  let installTimer = null;
  let deferredInstall = null;
  let notifications = {};

  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInstalled = () => !!window.matchMedia?.('(display-mode: standalone)').matches || !!window.matchMedia?.('(display-mode: window-controls-overlay)').matches || navigator.standalone === true || /ESIAndroid\//i.test(navigator.userAgent);

  window.__esiAppLoadTime = Date.now();
  window.__esiNotifDbUrl = NOTIF_DB_URL;
  window.__esiBuild = BUILD;

  function toast(message, background = '#111827') {
    document.querySelectorAll('[data-esi-toast]').forEach(n => n.remove());
    const n = document.createElement('div');
    n.dataset.esiToast = '1';
    n.textContent = message;
    n.style.cssText = `position:fixed;left:50%;bottom:max(20px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483647;max-width:92%;padding:12px 18px;border-radius:12px;background:${background};color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 8px 25px rgba(0,0,0,.28);text-align:center`;
    (document.body || document.documentElement).appendChild(n);
    setTimeout(() => n.remove(), 4500);
  }
  window.showToast = toast;

  function ensureManifest() {
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link); }
    link.href = '/manifest.json?v=' + BUILD;
  }

  function repairMobileCompatibilityCSS() {
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement('meta'); vp.name = 'viewport'; document.head.appendChild(vp); }
    const content = vp.getAttribute('content') || 'width=device-width, initial-scale=1';
    vp.setAttribute('content', /viewport-fit\s*=\s*cover/i.test(content) ? content : content + ', viewport-fit=cover');

    const setVH = () => {
      document.documentElement.style.setProperty('--app-vh', `${innerHeight * 0.01}px`);
      document.documentElement.style.setProperty('--esi-safe-top', 'env(safe-area-inset-top, 0px)');
      document.documentElement.style.setProperty('--esi-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
    };
    setVH();
    addEventListener('resize', setVH, { passive: true });
    addEventListener('orientationchange', () => setTimeout(setVH, 150), { passive: true });
    if (window.visualViewport) visualViewport.addEventListener('resize', setVH, { passive: true });

    if (!document.getElementById('esiMobileCompatibilityCSS')) {
      const s = document.createElement('style');
      s.id = 'esiMobileCompatibilityCSS';
      s.textContent = `
        html,body{max-width:100%;overflow-x:hidden;touch-action:auto!important}
        img,video,canvas,svg{max-width:100%;height:auto}
        input,textarea,select,button{max-width:100%}
        header,.header,.app-header,#appHeader,[class*="topbar" i],[class*="top-bar" i],[id*="topbar" i],[class*="navbar" i],[class*="nav-bar" i],[class*="appbar" i],[class*="app-bar" i]{box-sizing:border-box!important;max-width:100vw;min-width:0;flex-shrink:0;padding-top:max(8px,env(safe-area-inset-top))!important;padding-left:max(0px,env(safe-area-inset-left))!important;padding-right:max(0px,env(safe-area-inset-right))!important}
        header *,[class*="header" i] *,[id*="header" i] *,[class*="topbar" i] *,[class*="top-bar" i] *,[class*="navbar" i] *,[class*="appbar" i] *,[class*="app-bar" i] *{min-width:0;max-width:100%}
        [class*="logo-box" i],[class*="header-title" i],[class*="header-row" i]{min-width:0;max-width:100%;flex-wrap:nowrap}
        [class*="logo-box" i] img,[class*="logo-badge" i]{flex:0 0 auto;max-width:40px}
        [class*="logo-box" i] h1,[class*="logo-box" i] h2,[class*="header-title" i] h1,[class*="header-title" i] h2{font-size:clamp(12px,4vw,16px)!important;line-height:1.2;overflow-wrap:anywhere}
        [class*="logo-box" i] p,[class*="header-title" i] p{font-size:clamp(9px,2.6vw,11px)!important;line-height:1.25;overflow-wrap:anywhere}
        /* The page CSS uses *{touch-action:pan-y}; that blocks horizontal gesture recognition at the body/html level. */
        html,body,*{touch-action:auto!important}
        [class*="filter" i],[id*="filter" i],[class*="tabs" i],[id*="tabs" i],[class*="category" i],[id*="category" i]{touch-action:pan-x pan-y!important;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;min-width:0}
        [class*="filter" i]>* ,[id*="filter" i]>* ,[class*="tabs" i]>* ,[id*="tabs" i]>* ,[class*="category" i]>* ,[id*="category" i]>*{touch-action:pan-x pan-y!important;flex:0 0 auto}
        .quiz-container,.quiz-content,[class*="quiz-container" i],[class*="quiz-content" i]{min-width:0;max-width:100%;overflow-x:hidden}
        pre,code{max-width:100%;overflow-x:auto;touch-action:pan-x pan-y!important}
        @media(max-width:360px){[class*="logo-box" i] img,[class*="logo-badge" i]{width:34px!important;height:34px!important}}
        @media(max-height:700px){header,.header,.app-header,#appHeader,[class*="topbar" i],[class*="navbar" i]{padding-top:max(6px,env(safe-area-inset-top))!important}}
        [class*="bottom-nav" i],[class*="tab-bar" i],[class*="tabbar" i],[class*="footer-nav" i],[class*="bottombar" i],[class*="bottom-bar" i]{padding-bottom:max(8px,env(safe-area-inset-bottom))!important;box-sizing:border-box!important;flex-shrink:0}
      `;
      document.head.appendChild(s);
    }

    const fixHorizontalTouchTargets = () => {
      document.querySelectorAll('*').forEach(el => {
        if (el === document.documentElement || el === document.body) return;
        if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
          const cs = getComputedStyle(el);
          if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') {
            el.style.setProperty('touch-action', 'pan-x pan-y', 'important');
            for (const child of el.children) child.style.setProperty('touch-action', 'pan-x pan-y', 'important');
            el.style.overscrollBehaviorX = 'contain';
            el.style.webkitOverflowScrolling = 'touch';
          }
        }
      });
    };
    requestAnimationFrame(fixHorizontalTouchTargets);
    setTimeout(fixHorizontalTouchTargets, 300);
    setTimeout(fixHorizontalTouchTargets, 1200);
    window.addEventListener('resize', fixHorizontalTouchTargets, { passive: true });
  }

  function releaseInitialLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('fade-out');
  }

  function scheduleInitialLoaderFallback() {
    setTimeout(releaseInitialLoader, 6000);
  }

  function createInstallUI() {
    if (document.getElementById('esiInstallPopup')) { installBox = document.getElementById('esiInstallPopup'); return; }
    const p = document.createElement('section');
    p.id = 'esiInstallPopup';
    p.style.cssText = 'position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;width:92%;max-width:400px;z-index:2147483646;background:#0f172a;color:#fff;border:1px solid #2563eb;border-radius:17px;padding:13px;box-shadow:0 12px 40px rgba(0,0,0,.38);opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,-18px);transition:opacity .25s ease,transform .25s ease,visibility .25s ease';
    p.innerHTML = '<button type="button" data-close aria-label="Close" style="position:absolute;right:8px;top:8px;width:27px;height:27px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#cbd5e1;font-size:17px">×</button><div style="display:flex;align-items:center;gap:10px;padding-right:30px"><img src="/logo.jpg" alt="Elite Scholar Institute" style="width:40px;height:40px;border-radius:50%;object-fit:cover"><div><strong style="display:block;color:#60a5fa;font-size:13.5px">ELITE SCHOLAR INSTITUTE</strong><span data-install-text style="display:block;margin-top:3px;color:#e5e7eb;font-size:12px;line-height:1.45"></span></div></div><button type="button" data-install style="display:block;width:100%;margin-top:11px;padding:11px;border:0;border-radius:11px;background:#2563eb;color:#fff;cursor:pointer;font-weight:700;font-size:13px"></button>';
    document.body.appendChild(p); installBox = p;
    p.querySelector('[data-close]').onclick = hideInstall;
    p.querySelector('[data-install]').onclick = installNow;
    updateInstallText();
  }

  function updateInstallText() {
    if (!installBox) return;
    const text = installBox.querySelector('[data-install-text]');
    const button = installBox.querySelector('[data-install]');
    text.textContent = isAndroid && !isInstalled() ? 'Works offline, faster access, better architecture, completely safe.' : isIOS ? 'Add Elite Scholar Institute to your Home Screen.' : 'Add Elite Scholar Institute to your device.';
    button.textContent = 'Install Elite Scholar App';
  }

  function showInstall() {
    if (isInstalled()) return;
    createInstallUI(); updateInstallText();
    installBox.style.opacity = '1'; installBox.style.visibility = 'visible'; installBox.style.pointerEvents = 'auto'; installBox.style.transform = 'translate(-50%,0)';
    clearTimeout(hideTimer); hideTimer = setTimeout(hideInstall, 10000);
  }
  function scheduleInstall(delay = 15000) {
    if (isInstalled() || installTimer) return;
    clearTimeout(installTimer); installTimer = setTimeout(() => { installTimer = null; showInstall(); }, delay);
  }
  function hideInstall() {
    if (!installBox) return;
    installBox.style.opacity = '0'; installBox.style.visibility = 'hidden'; installBox.style.pointerEvents = 'none'; installBox.style.transform = 'translate(-50%,-18px)'; clearTimeout(hideTimer);
  }
  async function installNow() {
    hideInstall();
    if (isAndroid && !isInstalled()) { window.location.assign(APK_URL); return; }
    if (deferredInstall) { const event = deferredInstall; deferredInstall = null; try { event.prompt(); await event.userChoice; } catch (_) {} return; }
    if (isIOS) { toast('Tap Share, then choose Add to Home Screen.', '#2563eb'); return; }
    toast('Use your browser menu and choose Install app or Add to Home screen.', '#2563eb');
  }
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; window.__esiInstallAvailable = true; if (!isAndroid && !isIOS) scheduleInstall(15000); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; window.__esiInstallAvailable = false; hideInstall(); toast('App installed successfully', '#16a34a'); });

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try { const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/', updateViaCache: 'none' }); await registration.update().catch(() => {}); if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING'); return registration; } catch (_) { return null; }
  }

  function ensureBell() {
    if (location.pathname.endsWith('/notification.html') || document.getElementById('notifBellBtn')) return;
    const s = document.createElement('style');
    s.textContent = '#notifBellBtn{position:fixed;top:calc(260px + env(safe-area-inset-top));right:5px;z-index:9990;background:#0f172a;border:1px solid #2563eb;border-radius:50%;width:42px;height:42px;display:grid;place-items:center;font-size:19px;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer;-webkit-tap-highlight-color:transparent}#globalUnreadBadge{display:none;position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#ff2d55;box-shadow:0 0 8px 2px rgba(255,45,85,.9)}#globalUnreadBadge.show{display:block}';
    document.head.appendChild(s);
    const b = document.createElement('button'); b.id = 'notifBellBtn'; b.setAttribute('aria-label', 'Notifications'); b.innerHTML = '🔔<span id="globalUnreadBadge"></span>'; b.onclick = () => { location.href = '/notification.html'; }; document.body.appendChild(b);
  }
  function updateBell() { const b = document.getElementById('globalUnreadBadge'); if (!b) return; let read = new Set(); try { read = new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); } catch (_) {} const unread = Object.keys(notifications).filter(id => !read.has(id)).length; b.classList.toggle('show', unread > 0 && !location.pathname.endsWith('/notification.html')); }
  window.esiUpdateBellBadge = updateBell;

  function loadFirebase(done) {
    if (window.firebase?.database && window.firebase?.auth) return done();
    const urls = ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js']; let i = 0;
    const next = () => { if (i >= urls.length) return done(); const s = document.createElement('script'); s.src = urls[i++]; s.onload = next; s.onerror = next; document.head.appendChild(s); }; next();
  }
  function setupBell() {
    ensureBell();
    loadFirebase(() => {
      if (!window.firebase?.database || !window.firebase?.auth) return;
      let app;
      try { const config = window.FIREBASE_CONFIG || {apiKey:'AIzaSyDkjELsB4qeaumvsMAIDGIFZgNzl6eoBPM',authDomain:'elite-notification.firebaseapp.com',databaseURL:NOTIF_DB_URL,projectId:'elite-notification',storageBucket:'elite-notification.firebasestorage.app',messagingSenderId:'359910414254',appId:'1:359910414254:web:a1bafd3e23fd554a975a3f'}; app = firebase.apps.find(a => a.name === 'notifications') || firebase.initializeApp(config, 'notifications'); } catch (_) { return; }
      const auth = app.auth(), db = app.database(), ready = auth.currentUser ? Promise.resolve() : auth.signInAnonymously().catch(() => null);
      ready.then(() => { db.ref('notifications').orderByChild('timestamp').limitToLast(50).on('value', snap => { notifications = snap.val() || {}; updateBell(); window.dispatchEvent(new CustomEvent('esi:notifications-updated',{detail:notifications})); }); });
    });
  }
  addEventListener('online', () => toast('Back Online', '#16a34a'));
  addEventListener('offline', () => toast('You are offline', '#dc2626'));
  addEventListener('storage', e => { if (e.key === 'notif_read_ids') updateBell(); });

  async function boot() { ensureManifest(); repairMobileCompatibilityCSS(); createInstallUI(); scheduleInstall(15000); setupBell(); scheduleInitialLoaderFallback(); await registerServiceWorker(); }
  addEventListener('pageshow', () => { repairMobileCompatibilityCSS(); if (!isInstalled()) scheduleInstall(15000); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
