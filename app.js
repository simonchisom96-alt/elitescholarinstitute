(() => {
  // Guard - silent, no error
  if (location.protocol === 'chrome-error:') return;
// ===== Real viewport fix (root cause) =====
  (function fixViewportMeta() {
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.setAttribute('name', 'viewport');
      vp.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
      document.head.appendChild(vp);
    } else if (!/viewport-fit\s*=\s*cover/i.test(vp.getAttribute('content') || '')) {
      const existing = (vp.getAttribute('content') || '').replace(/,?\s*viewport-fit=[^,]*/i, '').trim();
      vp.setAttribute('content', existing ? existing + ', viewport-fit=cover' : 'viewport-fit=cover');
    }
  })();

  function esiSetRealVH() {
    document.documentElement.style.setProperty('--app-vh', (window.innerHeight * 0.01) + 'px');
  }
  esiSetRealVH();
  window.addEventListener('resize', esiSetRealVH);
  window.addEventListener('orientationchange', () => setTimeout(esiSetRealVH, 150));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', esiSetRealVH);
  // Real app optimization
  const style = document.createElement('style');
  style.textContent = `html,body{overflow-x:hidden;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;min-height:100vh;min-height:calc(var(--app-vh,1vh) * 100);min-height:100dvh}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}img{content-visibility:auto}@media(display-mode:standalone){body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}::-webkit-scrollbar{display:none}}
header,[class*="header" i],[id*="header" i],[class*="topbar" i],[class*="top-bar" i],[id*="topbar" i],[class*="navbar" i],[class*="nav-bar" i],[class*="appbar" i],[class*="app-bar" i]{padding-top:max(12px,env(safe-area-inset-top)) !important;padding-left:max(0px,env(safe-area-inset-left)) !important;padding-right:max(0px,env(safe-area-inset-right)) !important;box-sizing:border-box !important;flex-shrink:0}
header *,[class*="header" i] *,[id*="header" i] *,[class*="topbar" i] *,[class*="top-bar" i] *,[class*="navbar" i] *,[class*="appbar" i] *{min-width:0}
[class*="logo-box" i],[class*="header-title" i],[class*="header-row" i]{flex-wrap:nowrap;min-width:0}
[class*="logo-box" i] h1,[class*="logo-box" i] h2,[class*="header-title" i] h1,[class*="header-title" i] h2{font-size:clamp(12px,4vw,16px) !important;overflow-wrap:anywhere;line-height:1.2}
[class*="logo-box" i] p,[class*="header-title" i] p{font-size:clamp(9px,2.6vw,11px) !important;overflow-wrap:anywhere}
[class*="logo-box" i] img,[class*="logo-badge" i]{flex-shrink:0}
@media(max-width:360px){[class*="logo-box" i] img,[class*="logo-badge" i]{width:34px !important;height:34px !important}}
@media(max-height:700px){header,[class*="header" i],[id*="header" i],[class*="topbar" i],[class*="navbar" i]{padding-top:max(8px,env(safe-area-inset-top)) !important}}
[class*="bottom-nav" i],[class*="tab-bar" i],[class*="tabbar" i],[class*="footer-nav" i],[class*="bottombar" i],[class*="bottom-bar" i]{padding-bottom:max(8px,env(safe-area-inset-bottom)) !important;box-sizing:border-box !important;flex-shrink:0}`;
  document.head.appendChild(style);

  const CACHE_VERSION = 'elite-scholar-v36.2269';

  // ===== NOTIFICATION SYSTEM CONFIG =====
  // Hung on window so BOTH this IIFE and the separate bell-badge IIFE below can
  // see them. Previously these were plain `const` inside this IIFE only, so the
  // second IIFE (a completely separate function scope) threw
  // "ReferenceError: NOTIF_DB_URL is not defined" the moment it tried to use it.
  window.__esiAppLoadTime = Date.now(); // prevents old messages from re-popping on every page load
  window.__esiNotifDbUrl = 'https://elite-notification-default-rtdb.firebaseio.com';

  // 20 deep general notifications - no subject, no emoji
  const NOTIFICATIONS = [
  { 
    title: "Dear Scholar, Your future is built today through persistent reading 🔥", 
    body: "You have come too far to stop now, so open your textbooks right now and continue the rewarding journey of academic excellence.", 
    url: "/Textbooks.html" 
  },
  { 
    title: "Rise high in the leader's board right now! 📊", 
    body: "Train yourself intensely with others to rise above all competitors in the leader's board and win exciting grand prizes at the very end of the month.", 
    url: "/quiz.html" 
  },
  { 
    title: "You have a brand new urgent notification waiting 🗨️", 
    body: "View our elite announcement channel immediately to get daily breaking news, exciting quiz drills, join live class sessions, and experience many more while using the app.", 
    url: "/notification.html" 
  },
  { 
    title: "A smarter and faster way to prepare properly 📚", 
    body: "Learn precisely how elite top scorers prepare differently for the exams, because your complete post utme success guide is fully ready for you.", 
    url: "/postutme.html" 
  },
  { 
    title: "Stay strictly on the right track every single day 📃", 
    body: "Focus intensely on what matters most for your examinations. Your detailed syllabus guide is waiting patiently right now to lead you straight to victory.", 
    url: "/syllables.html" 
  },
  { 
    title: "Small daily wins matter for your exams 🧠", 
    body: "Answer a few challenging questions today and build unshakeable confidence for tomorrow's challenges. Start your daily interactive quiz session right now.", 
    url: "/quiz.html" 
  },
  { 
    title: "Keep pushing forward no matter how hard it gets ⚡", 
    body: "Slow steady progress is still massive progress every single day. Your powerful motivational guide is completely ready to uplift your spirit right now.", 
    url: "/motivatio.html" 
  },
  { 
    title: "See it clearly so you can remember it forever 🖼️", 
    body: "Visual learning helps your brain retain complex information much more effectively. Open our educational pictures to understand every difficult concept much better.", 
    url: "/picture.html" 
  },

  // ==================== LOOP 2 (Items 8 to 14) ====================
  { 
    title: "One more powerful step toward your dreams 📖", 
    body: "True consistency will make you completely unstoppable in your academics. Continue your deep reading today and conquer every textbook chapter effortlessly.", 
    url: "/Textbooks.html" 
  },
  { 
    title: "Prove your incredible worth to yourself today 🧠", 
    body: "You do not need to impress anyone else out there, you just need to grow your knowledge. Start practicing with a challenging quiz right now.", 
    url: "/quiz.html" 
  },
  { 
    title: "You have a brand new urgent notification waiting 🗨️", 
    body: "View our elite announcement channel immediately to get daily breaking news, exciting quiz drills, join live class sessions, and experience many more while using the app.", 
    url: "/notification.html" 
  },
  { 
    title: "You are much closer than you think to success 📃", 
    body: "The difficult academic work you are trying to avoid right now is the exact reason for your next level. Open your ultimate exam guide today.", 
    url: "/postutme.html" 
  },
  { 
    title: "Want to know all about elite scholar institute? 📚", 
    body: "View the rich history and core founders who contributed heavily to the development of elite scholar institute. Without their sacrifice ESI wouldn't exist.", 
    url: "/credit.html" 
  },
  { 
    title: "Do not ever give up on your goals yet 🔥", 
    body: "This temporary difficult moment in your studies is shaping your strong success story. Find inner strength to continue fighting for your future.", 
    url: "/motivatio.html" 
  },
  { 
    title: "Small daily wins matter for your exams 📊", 
    body: "Answer a few challenging questions today and build unshakeable confidence for tomorrow's challenges. Start your daily interactive quiz session right now.", 
    url: "/quiz.html" 
  },
  { 
    title: "Learn much faster with vibrant visual aids 🌠", 
    body: "Complex academic topics become extremely simple when explained with clear pictures. Tap to view diagrams and understand core concepts instantly without stress.", 
    url: "/picture.html" 
  },
{ 
    title: "Stay strictly on the right track every single day 🎯", 
    body: "Focus intensely on what matters most for your examinations. Your detailed syllabus guide is waiting patiently right now to lead you straight to victory.", 
    url: "/syllables.html" 
  },
  // ==================== LOOP 3 (Items 15 to 21) ====================
  { 
    title: "Discipline beats raw motivation every single time 📚", 
    body: "Show up to study today even if you do not feel like reading at all. Open your textbooks and master your core subjects.", 
    url: "/Textbooks.html" 
  },
  { 
    title: "Small daily wins matter for your exams 🧠", 
    body: "Answer a few challenging questions today and build unshakeable confidence for tomorrow's challenges. Start your daily interactive quiz session right now.", 
    url: "/quiz.html" 
  },
  { 
    title: "You have a brand new urgent notification waiting 🗨️", 
    body: "View our elite announcement channel immediately to get daily breaking news, exciting quiz drills, join live class sessions, and experience many more while using the app.", 
    url: "/notification.html" 
  },
  { 
    title: "Prepare like a true champion and winner 📜", 
    body: "Smart winners prepare long before the opportunity even knocks on their door. Your comprehensive post utme preparation pack is completely ready.", 
    url: "/postutme.html" 
  },
  { 
    title: "Your study plan desperately needs clear direction 🎯", 
    body: "Studying without an official syllabus layout is like traveling blindly without a map. Get proper academic direction now and organize your schedule.", 
    url: "/syllables.html" 
  },
    { 
    title: "Rise high in the leader's board right now! 🌠", 
    body: "Train yourself intensely with others to rise above all competitors in the leader's board and win exciting grand prizes at the very end of the month.", 
    url: "/quiz.html" 
  },
  { 
    title: "The intense pain of studying is temporary 💪", 
    body: "The painful academic sacrifices you make today will transform into glorious testimonies tomorrow. Keep reading hard and never look back.", 
    url: "/motivation.html" 
  },
  { 
    title: "You have what it takes to pass ⚜️", 
    body: "You are completely capable, fully ready, and more than enough to conquer exams. Believe in yourself and continue learning through helpful visual guides.", 
    url: "/picture.html" 
  },
  { 
    title: "Stay strictly on the right track every single day 🌠", 
    body: "Focus intensely on what matters most for your examinations. Your detailed syllabus guide is waiting patiently right now to lead you straight to victory.",
    url: "/syllables.html" 
  },
  { 
    title: "Prove your incredible worth to yourself today 🔥", 
    body: "You do not need to impress anyone else out there, you just need to grow your knowledge. Start practicing with a challenging quiz right now.", 
    url: "/quiz.html" 
  },
  ];

  function showToast(m, b = "#111") {
    const old = document.querySelector('.esi-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'esi-toast';
    t.textContent = m;
    t.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:${b};color:#fff;padding:12px 20px;border-radius:12px;z-index:99999;font-size:14px;box-shadow:0 8px 25px rgba(0,0,0,.25);font-weight:500`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }
  window.showToast = showToast;

  window.addEventListener('online', () => { showToast("Back Online", "#16a34a"); handleOnlineEvent(); });
  window.addEventListener('offline', () => { showToast("You are offline", "#dc2626"); });

  let deferredPrompt, hideTimer, showTimer;
  (function createPopup() {
    if (document.getElementById('installPopup')) return;
    const popupCSS = document.createElement('style');
    popupCSS.textContent = `
        @keyframes esiInstallGlow{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.75;transform:scale(1.035)}}
        @keyframes esiShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        #installPopup{transition:opacity .45s cubic-bezier(.34,1.56,.64,1),transform .45s cubic-bezier(.34,1.56,.64,1);opacity:0;transform:translateX(calc(-50% + 46px));touch-action:pan-y;overflow:hidden} #installPopup::before{content:'';position:absolute;inset:0;border-radius:20px;padding:1px;background:linear-gradient(100deg,transparent 30%,rgba(255,215,0,.55) 48%,rgba(255,255,255,.7) 50%,rgba(255,215,0,.55) 52%,transparent 70%);background-size:250% 100%;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:esiShimmer 3.2s linear infinite;pointer-events:none}
        #installPopup.show{opacity:1;transform:translateX(-50%)}
        #installPopup.dragging{transition:none}
        #installBtn:active{transform:scale(.97)}
    `;
    document.head.appendChild(popupCSS);
    document.body.insertAdjacentHTML('beforeend', `<div id="installPopup" style="display:none;position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;background:#0f172a;border:1px solid #2563eb;border-radius:16px;padding:12px;z-index:99999;width:92%;max-width:400px;box-shadow:0 8px 30px rgba(59,130,246,.3);">
        <button id="closeBtn" style="position:absolute;top:9px;right:11px;background:rgba(255,255,255,.06);border:none;width:23px;height:23px;border-radius:50%;font-size:15px;color:#94a3b8;line-height:1;cursor:pointer">X</button>
        <div style="display:flex;align-items:center;gap:10px">
            <img src="/logo.jpg" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #3b82f6;flex-shrink:0">
            <div style="flex:1;min-width:0;padding-right:18px">
                <b style="font-size:13.5px;color:#3b82f6;display:block">ELITE SCHOLAR INSTITUTE</b>
                <p style="margin:2px 0 0;font-size:12px;color:#f2f6ff;line-height:1.4">Install the app — faster, works offline, sends reminders.</p>
            </div>
        </div>
        <button id="installBtn" style="margin-top:10px;width:100%;background:#2563eb;color:#fff;border:none;padding:10px;border-radius:11px;cursor:pointer;font-weight:700;font-size:13px">Install Now</button>
    </div>`);
  })();

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

  // 7s after landing on a page, show for 7s. No cross-page/session gating at all — a plain
  // 'load' event only ever fires once per genuine page visit (first time, a refresh, or
  // coming back after leaving), so showing on every load already IS "once per page until
  // refreshed or revisited," with zero extra state needed — and it still shows on every
  // other page too, exactly as asked.
  function showInstallPopupFor7Seconds() {
    const p = document.getElementById('installPopup');
    if (!p) return;
    p.style.display = 'block';
    requestAnimationFrame(() => p.classList.add('show'));
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hideInstallPopup(), 4500);
  }

  function hideInstallPopup() {
    const p = document.getElementById('installPopup');
    if (p) {
      p.classList.remove('show');
      p.style.transform = '';
      setTimeout(() => { if (p && !p.classList.contains('show')) p.style.display = 'none'; }, 500);
    }
    clearTimeout(hideTimer);
  }
  // Swipe-to-dismiss — drag the card left or right past ~70px and it slides away and closes,
  // same as tapping ×; release early and it springs back.
  (function enableSwipeDismiss() {
    let startX = 0, dx = 0, dragging = false;
    document.addEventListener('touchstart', e => {
      const el = document.getElementById('installPopup');
      if (!el || !el.classList.contains('show') || !e.target.closest('#installPopup')) return;
      if (e.target.closest('#installBtn') || e.target.closest('#closeBtn')) return;
      dragging = true; startX = e.touches[0].clientX; dx = 0;
      el.classList.add('dragging');
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!dragging) return;
      const el = document.getElementById('installPopup');
      dx = e.touches[0].clientX - startX;
      el.style.transform = `translateX(calc(-50% + ${dx}px)) translateY(0)`;
      el.style.opacity = String(Math.max(0.15, 1 - Math.abs(dx) / 220));
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      const el = document.getElementById('installPopup');
      if (!el) return;
      el.classList.remove('dragging');
      if (Math.abs(dx) > 70) { hideInstallPopup(); }
      else { el.style.transform = ''; el.style.opacity = ''; }
    });
  })();

  // FIX (the real gap): 'load' does NOT reliably fire when a page is restored from the
  // browser's back/forward cache — hitting the browser's own back button after leaving a
  // page very often restores it instantly from memory with zero 'load' event at all. That
  // silently broke "leave the page and come back." 'pageshow' fires in BOTH cases — a
  // genuine fresh load AND a bfcache restore — telling them apart via event.persisted, so
  // this now correctly re-triggers the 7s timer either way, every time.
  window.addEventListener('pageshow', () => {
    if (window.matchMedia('(display-mode:standalone)').matches || window.navigator.standalone) { hideInstallPopup(); return; }
    clearTimeout(showTimer);
    showTimer = setTimeout(() => showInstallPopupFor7Seconds(), 30000);
  });

  document.addEventListener('click', e => {
    if (e.target.id === 'installBtn') {
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => deferredPrompt = null); }
      else showToast("Tap menu > Install App");
      hideInstallPopup();
    }
    if (e.target.id === 'closeBtn') hideInstallPopup();
  });

  function isAppMode() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
(function createNotifPrompt() {
    if (document.getElementById('notifPrompt')) return;
    document.body.insertAdjacentHTML('beforeend', `<div id="notifPrompt" style="display:none;position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%) translateY(-16px);opacity:0;transition:opacity .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1);background:#0f172a;border:1px solid #2563eb;border-radius:16px;box-shadow:0 8px 30px rgba(59,130,246,.3);padding:16px;z-index:99999;width:92%;max-width:400px;text-align:center">
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:4px">
            <img src="/logo.jpg" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1px solid #3b82f6">
            <span style="font-size:12.5px;font-weight:700;color:#3b82f6">ELITE SCHOLAR INSTITUTE</span>
        </div>
        <div style="font-size:28px;margin-top:2px">🔔</div>
        <b style="font-size:14.5px;color:#fff;display:block;margin-top:6px">Turn on notifications</b>
        <p style="margin:4px 0 0;font-size:11.5px;color:#94a3b8;line-height:1.5">Allow Elite Scholar Institute to notify you about new updates and study materials.</p>
        <div style="display:flex;gap:8px;margin-top:14px">
            <button id="notifPromptNo" style="flex:1;background:rgba(255,255,255,.06);color:#94a3b8;border:none;padding:10px;border-radius:11px;cursor:pointer;font-weight:700;font-size:12.5px">Don't Allow</button>
            <button id="notifPromptYes" style="flex:1;background:#2563eb;color:#fff;border:none;padding:10px;border-radius:11px;cursor:pointer;font-weight:700;font-size:12.5px">Allow</button>
        </div>
    </div>`);
    document.getElementById('notifPromptYes').addEventListener('click', async () => {
      hideNotifPrompt();
      await doRequestPermission();
    });
    document.getElementById('notifPromptNo').addEventListener('click', hideNotifPrompt);
  })();

  function showNotifPrompt() {
    const p = document.getElementById('notifPrompt');
    if (!p) return;
    p.style.display = 'block';
    requestAnimationFrame(() => { p.style.opacity = '1'; p.style.transform = 'translateX(-50%) translateY(0)'; });
  }
  function hideNotifPrompt() {
    const p = document.getElementById('notifPrompt');
    if (!p) return;
    p.style.opacity = '0'; p.style.transform = 'translateX(-50%) translateY(-16px)';
    setTimeout(() => { if (p) p.style.display = 'none'; }, 500);
  }

  // This is the actual native call — the one and only real permission grant, exactly as the
  // browser requires. Kept separate from requestNotificationPermissionInApp() below, which
  // now just decides WHEN to show the custom ask card that leads here.
  async function doRequestPermission() {
    if (!('Notification' in window) || Notification.permission === 'granted') return;
    if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') showToast("Reminders enabled", "#2563eb");
    }
  }

  async function requestNotificationPermissionInApp() {
    if (!isAppMode() || !('Notification' in window) || Notification.permission !== 'default') return;
    showNotifPrompt();
  }

  // If they tap "Not Now" here, we never actually call the real API — permission stays
  // 'default' forever, not 'denied' — so this can safely re-offer it later. Set to exactly
  // 50 hours per instruction (not the browser's own cooldown, ours).
  function maybeAskNotificationPermissionAgain() {
    if (!isAppMode() || !('Notification' in window) || Notification.permission !== 'default') return;
    const FIFTY_HOURS = 50 * 60 * 60 * 1000;
    const last = parseInt(localStorage.getItem('esiLastPermissionAsk') || '0');
    if (Date.now() - last < FIFTY_HOURS) return;
    localStorage.setItem('esiLastPermissionAsk', Date.now().toString());
    requestNotificationPermissionInApp();
  }

  async function handleOnlineEvent() {
    if (!isAppMode() || Notification.permission!== 'granted') return;
    let i = parseInt(localStorage.getItem('esiNotifIndex') || '0');
    if (i >= NOTIFICATIONS.length) i = 0;
    const d = NOTIFICATIONS[i];
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(d.title, {
      body: d.body,
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      data: { url: d.url },
      vibrate: [200, 100, 200],
      tag: 'esi-' + Date.now()
    });
    localStorage.setItem('esiNotifIndex', (i + 1).toString());
  }

  /* External link offline protection */
(function () {

  const isExternal = (href) => {
    if (!href) return false;

    return /^(https?:\/\/|\/\/|https:\/\/wa\.me|wa\.me|https:\/\/t\.me|t\.me|tg:\/\/|mailto:|tel:)/i.test(href);
  };

  document.addEventListener("click", function (e) {

    const link = e.target.closest("a");

    if (!link) return;

    const href = link.getAttribute("href");

    if (!isExternal(href)) return;

    if (!navigator.onLine) {

      e.preventDefault();

      sessionStorage.setItem("esiPendingExternalLink", href);

      location.href = "/offline.html";

    }

  }, true);

  window.addEventListener("online", () => {

  const pending = sessionStorage.getItem("esiPendingExternalLink");

  if (!pending) return;

  sessionStorage.removeItem("esiPendingExternalLink");

  setTimeout(() => {
    window.open(pending, "_self");
  }, 500);

});
})();

  window.addEventListener('appinstalled', () => {
    hideInstallPopup();
    setTimeout(() => { if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'CHECK_DOWNLOAD_COMPLETE' }); }, 2800);
    setTimeout(() => requestNotificationPermissionInApp(), 10000);
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data.type === 'DOWNLOAD_SUCCESS') showToast('App Downloaded Successfully', "#16a34a");
    });
    navigator.serviceWorker.register('/sw.js').then(r => {
      r.update();
      if (r.waiting) r.waiting.postMessage('skipWaiting');
      r.addEventListener('updatefound', () => {
        const n = r.installing;
        n.addEventListener('statechange', () => { if (n.state === 'installed' && navigator.serviceWorker.controller) n.postMessage('skipWaiting'); });
      });
    });
    let reloaded = sessionStorage.getItem('esiSwReloaded') === '1';
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      sessionStorage.setItem('esiSwReloaded', '1');
      location.reload();
    });
  }

  window.addEventListener('load', () => {
    if (isAppMode() && navigator.onLine) setTimeout(() => handleOnlineEvent(), 9000);
    setTimeout(() => maybeAskNotificationPermissionAgain(), 6000);
  });

})();

// WhatsApp 6-second floating popup banner (WhatsApp Style)
function showWhatsappPopup(item) {
  let existing = document.getElementById('whatsappPopupBanner');
  if (existing) existing.remove();

  const timeString = item.timestamp
    ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  const authorName = item.author || 'Elite Scholar Admin';

  const banner = document.createElement('div');
  banner.id = 'whatsappPopupBanner';
  // FIX: this used to be set twice in a row here — a dead bottom-right WhatsApp-green style
  // immediately overwritten by the actual top-center blue one below. Removed the dead line;
  // the function name/comment is legacy from an earlier design pass, kept as-is since renaming
  // it isn't worth touching things that don't concern this fix.
  banner.style.cssText = `position:fixed; top:calc(12px + env(safe-area-inset-top)); left:50%; transform:translateX(-50%); background:#0f172a; border:1px solid #2563eb; border-radius:16px; padding:12px; z-index:99999; width:92%; max-width:400px; box-shadow:0 8px 30px rgba(59,130,246,.3); cursor:pointer;`;

  banner.innerHTML = `
    <div class="popup-header" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <img src="logo.jpg" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid #3b82f6;">
        <span class="popup-title" style="color:#3b82f6; font-size:12px; font-weight:700;">${authorName}</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:10px; color:#9db3dc;">${timeString}</span>
        <button class="popup-close" onclick="event.stopPropagation(); closePopupBanner()" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer;">×</button>
      </div>
    </div>
    <div class="popup-body" style="font-size:12.5px; color:#f2f6ff; line-height:1.4;">${item.body || 'New broadcast message received.'}</div>
  `;
  // Click handler to open link/url if provided
  if (item.url) {
    banner.onclick = () => {
      window.location.href = item.url;
    };
  }

  document.body.appendChild(banner);

  // Auto-remove banner after 9 seconds
  setTimeout(() => {
    if (banner && banner.parentNode) {
      banner.remove();
    }
  }, 7500);
}

function closePopupBanner() {
  const banner = document.getElementById('whatsappPopupBanner');
  if (banner) banner.remove();
}

// ===== BELL BADGE + REALTIME NOTIFICATION LISTENER (fully self-injecting) =====
// This block needs nothing added to any HTML file. It injects its own CSS,
// its own bell button, and loads the Firebase SDK itself if the page doesn't
// already have it — app.js being on the page is the only requirement.
(function(){
    let appLoadTime = window.__esiAppLoadTime;
    const NOTIF_DB_URL = window.__esiNotifDbUrl;

    function isOnNotificationPage(){ return location.pathname.endsWith('/notification.html'); }

    // ---- 1. Inject the bell button + badge (skip if the page already has one,
    //         e.g. index.html where it was added directly to the header markup) ----
    function ensureNotifBellUI(){
        if(isOnNotificationPage()) return;       // that page has its own header, doesn't need a floating bell
        if(document.getElementById('notifBellBtn')) return; // page already has one hand-placed in its header

        const bellCSS = 
        document.createElement('style');
        bellCSS.textContent = `
           #notifBellBtn{position:fixed;top:calc(260px + env(safe-area-inset-top));right:5px;z-index:9990;
                background:#0f172a;border:1px solid #2563eb;border-radius:50%;width:42px;height:42px;
                display:grid;place-items:center;font-size:19px;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35);
                cursor:pointer;-webkit-tap-highlight-color:transparent}
            #globalUnreadBadge{display:none;position:absolute;top:-3px;right:-3px;min-width:10px;height:10px;
                border-radius:50%;background:#ff2d55;box-shadow:0 0 6px 2px rgba(255,45,85,.9);
                animation:bellBadgeGlow 1.4s ease-in-out infinite}
            #globalUnreadBadge.show{display:block}
            @keyframes bellBadgeGlow{0%,100%{box-shadow:0 0 4px 1px rgba(255,45,85,.7);opacity:1}
                50%{box-shadow:0 0 10px 4px rgba(255,45,85,1);opacity:.75}}
        `;
        document.head.appendChild(bellCSS);

        const btn = document.createElement('button');
        btn.id = 'notifBellBtn';
        btn.setAttribute('aria-label', 'Notifications');
        btn.innerHTML = '🔔<span id="globalUnreadBadge"></span>';
        btn.onclick = () => { location.href = 'notification.html'; };
        document.body.appendChild(btn);
    }

    // ---- 2. Load the Firebase SDK if this page doesn't already have it ----
    
function loadFirebaseSDKThen(callback){
        if(window.firebase && firebase.database && firebase.auth){ callback(); return; }
        const s1 = document.createElement('script');
        s1.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
        s1.onload = () => {
            const s2 = document.createElement('script');
            s2.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js';
            s2.onload = () => {
                const s3 = document.createElement('script');
                s3.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js';
                s3.onload = callback;
                s3.onerror = () => console.warn('[Notif] failed to load firebase-auth-compat.js');
                document.head.appendChild(s3);
            };
            s2.onerror = () => console.warn('[Notif] failed to load firebase-database-compat.js');
            document.head.appendChild(s2);
        };
        s1.onerror = () => console.warn('[Notif] failed to load firebase-app-compat.js (offline, or CDN blocked in this preview environment)');
        document.head.appendChild(s1);
    }
    function getReadIds(){
        try{ return new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); }
        catch(e){ return new Set(); }
    }

    function updateBellBadge(unreadCount){
        const badge = document.getElementById('globalUnreadBadge');
        if(!badge) return;
        if(isOnNotificationPage()){ badge.classList.remove('show'); return; }
        if(unreadCount > 0) badge.classList.add('show');
        else badge.classList.remove('show');
    }
    window.esiUpdateBellBadge = updateBellBadge;

    let latestCache = {};
    function recomputeUnread(){
        const readIds = getReadIds();
        const unread = Object.keys(latestCache).filter(id => !readIds.has(id)).length;
        updateBellBadge(unread);
        return unread;
    }

    // Cross-tab sync: notification.html updates 'notif_read_ids' whenever the user
    // reads, clears, or deletes something — reflect that here instantly, no refresh.
    window.addEventListener('storage', e=>{
        if(e.key === 'notif_read_ids') recomputeUnread();
    });

    ensureNotifBellUI();

    loadFirebaseSDKThen(() => {
        // FIX: was a second hardcoded copy of the exact same project config that lives in
        // firebase-config.js — that file's own comment says nothing else should ever hold
        // one again. app.js has to stay self-contained though (it self-injects into every
        // page site-wide, most of which never load firebase-config.js at all), so this now
        // prefers window.FIREBASE_CONFIG when a page happens to already have it loaded
        // (e.g. notification.html), and only falls back to its own embedded copy otherwise —
        // single source of truth where possible, without breaking pages that don't have it.
        const NOTIF_FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
            apiKey: "AIzaSyDkjELsB4qeaumvsMAIDGIFZgNzl6eoBPM",
            authDomain: "elite-notification.firebaseapp.com",
            databaseURL: NOTIF_DB_URL,
            projectId: "elite-notification",
            storageBucket: "elite-notification.firebasestorage.app",
            messagingSenderId: "359910414254",
            appId: "1:359910414254:web:a1bafd3e23fd554a975a3f"
        };

        let notifApp;
        try{
            notifApp = firebase.apps.find(a=>a.name==='notifications') ||
                       firebase.initializeApp(NOTIF_FIREBASE_CONFIG, 'notifications');
        }catch(e){ console.warn('[Notif] init failed', e && e.message); return; }

        const notifDb = notifApp.database();
        const notifAuth = notifApp.auth();
        let firstSnapshotSeen = false;

        // Other pages never signed in — if rules require auth to read, every
        // page except notification.html (which signs in via password.js) was
        // silently permission-denied. Sign in here too, same as password.js does.
        if(!notifAuth.currentUser){
            notifAuth.signInAnonymously().catch(err => console.warn('[Notif] anon sign-in failed', err && err.code));
        }

        notifDb.ref('.info/serverTimeOffset').once('value', offsetSnap => {
            appLoadTime = Date.now() + (offsetSnap.val() || 0);
        });

        function previewFor(item){
            if(item.type === 'poll' && item.poll) return '📊 New poll: ' + (item.poll.question || '');
            if(item.type === 'quiz' && item.quiz) return '💡 New quiz: ' + (item.quiz.question || '');
            if(item.type === 'image') return ' New Image 🖼️ ' + (item.text || 'New image update, view now!');
            return item.text || 'New announcement 📢, read now';
        }

        (notifAuth.currentUser ? Promise.resolve() : new Promise(res => notifAuth.onAuthStateChanged(u => u && res()))).then(() => {
        notifDb.ref('notifications').orderByChild('timestamp').limitToLast(50).on('value', snap=>{
            const val = snap.val() || {};
            const isFirstLoad = !firstSnapshotSeen;
            const prevIds = new Set(Object.keys(latestCache));
            latestCache = val;
            firstSnapshotSeen = true;

            recomputeUnread();

            // notification.html handles its own in-page toasts/sounds — don't double them up here.
            if(isOnNotificationPage()) return;

            Object.keys(val).forEach(id=>{
                const item = val[id];
                if(prevIds.has(id)) return;                      // not new since our last snapshot
                if(!item.timestamp || item.timestamp <= appLoadTime) return; // pre-existing history, ignore
                if(isFirstLoad) return;                           // don't pop the whole backlog on first connect

                showWhatsappPopup({
                    body: previewFor(item),
                    author: item.authorName,
                    timestamp: item.timestamp,
                    url: 'notification.html'
                });
            });
        });
});
        window.addEventListener('load', recomputeUnread);
    });
})();



