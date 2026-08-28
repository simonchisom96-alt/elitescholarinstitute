/* Elite Scholar Institute — application controller 36.2292 */
(() => {
  'use strict';

  const BUILD = '36.2292';
  const SW_URL = '/sw.js';
  const INSTALL_DELAY = 8000;
  let deferredInstall = null;
  let installTimer = 0;

  const isInstalled = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true;

  const toast = (message, background = '#111827') => {
    document.querySelectorAll('[data-esi-toast]').forEach(n => n.remove());
    const n = document.createElement('div');
    n.dataset.esiToast = '1';
    n.textContent = message;
    n.style.cssText = `position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;max-width:92%;padding:12px 18px;border-radius:12px;background:${background};color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 8px 25px rgba(0,0,0,.28);text-align:center`;
    (document.body || document.documentElement).appendChild(n);
    setTimeout(() => n.remove(), 4000);
  };
  window.showToast = toast;

  function createInstallUI() {
    if (document.getElementById('esi2292Install') || isInstalled()) return;
    const css = document.createElement('style');
    css.id = 'esi2292InstallCSS';
    css.textContent = `#esi2292Install{position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;width:min(92vw,400px);z-index:2147483646;background:#0f172a;color:#fff;border:1px solid #2563eb;border-radius:17px;padding:13px;box-shadow:0 12px 40px rgba(0,0,0,.38);opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,-18px);transition:opacity .25s ease,transform .25s ease,visibility .25s ease}#esi2292Install.open{opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,0)}`;
    document.head.appendChild(css);
    const box = document.createElement('section');
    box.id = 'esi2292Install';
    box.innerHTML = `<button type="button" id="esi2292Close" aria-label="Close" style="position:absolute;right:8px;top:8px;width:27px;height:27px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#cbd5e1;font-size:17px">×</button><div style="display:flex;align-items:center;gap:10px;padding-right:30px"><img src="/logo.jpg" alt="Elite Scholar Institute" style="width:40px;height:40px;border-radius:50%;object-fit:cover"><div><strong style="display:block;color:#60a5fa;font:700 13.5px system-ui,sans-serif">ELITE SCHOLAR INSTITUTE</strong><span style="display:block;margin-top:3px;color:#e5e7eb;font:400 12px/1.45 system-ui,sans-serif">Install the app for faster access and offline learning.</span></div></div><button type="button" id="esi2292InstallButton" style="display:block;width:100%;margin-top:11px;padding:11px;border:0;border-radius:11px;background:#2563eb;color:#fff;cursor:pointer;font:700 13px system-ui,sans-serif">Install Now</button>`;
    document.body.appendChild(box);
    box.querySelector('#esi2292Close').addEventListener('click', hideInstall);
    box.querySelector('#esi2292InstallButton').addEventListener('click', installNow);
  }

  function showInstall() {
    if (isInstalled()) return;
    createInstallUI();
    const box = document.getElementById('esi2292Install');
    if (!box) return;
    box.classList.add('open');
    clearTimeout(installTimer);
    installTimer = setTimeout(hideInstall, 9000);
  }

  function hideInstall() {
    const box = document.getElementById('esi2292Install');
    if (box) box.classList.remove('open');
    clearTimeout(installTimer);
  }

  async function installNow() {
    if (!deferredInstall) {
      toast('Chrome has not made the native install prompt available for this page yet. Use the browser menu → Install app.', '#2563eb');
      return;
    }
    const event = deferredInstall;
    deferredInstall = null;
    try {
      event.prompt();
      await event.userChoice;
    } catch (_) {}
    hideInstall();
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstall = event;
    window.__esiInstallAvailable = true;
    showInstall();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    window.__esiInstallAvailable = false;
    hideInstall();
    toast('App installed successfully', '#16a34a');
    navigator.serviceWorker?.controller?.postMessage({ type:'CHECK_DOWNLOAD_COMPLETE' });
  });

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'DOWNLOAD_SUCCESS') toast('App files downloaded successfully', '#16a34a');
      if (event.data?.type === 'DOWNLOAD_PARTIAL') window.__esiShellStatus = event.data;
    });
    navigator.serviceWorker.register(SW_URL, { scope:'/', updateViaCache:'none' })
      .then(reg => reg.update().catch(() => {}))
      .catch(error => console.warn('[ESI SW]', error));
  }

  function protectExternalOfflineLinks() {
    document.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link || navigator.onLine) return;
      const href = link.getAttribute('href') || '';
      if (/^(https?:|mailto:|tel:|tg:|\/\/)/i.test(href)) {
        event.preventDefault();
        sessionStorage.setItem('esiPendingExternalLink', href);
        location.href = '/offline.html';
      }
    }, true);
    window.addEventListener('online', () => {
      const href = sessionStorage.getItem('esiPendingExternalLink');
      if (!href) return;
      sessionStorage.removeItem('esiPendingExternalLink');
      setTimeout(() => { location.href = href; }, 300);
    });
  }

  function viewportFix() {
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.name = 'viewport';
      vp.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      document.head.appendChild(vp);
    }
    const setVH = () => document.documentElement.style.setProperty('--app-vh', `${innerHeight * .01}px`);
    setVH();
    addEventListener('resize', setVH, { passive:true });
    addEventListener('orientationchange', () => setTimeout(setVH,150), { passive:true });
    if (window.visualViewport) visualViewport.addEventListener('resize', setVH, { passive:true });
  }

  function boot() {
    viewportFix();
    registerSW();
    protectExternalOfflineLinks();
    if (!isInstalled()) setTimeout(showInstall, INSTALL_DELAY);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
