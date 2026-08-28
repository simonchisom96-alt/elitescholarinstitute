/* Elite Scholar Institute — clean application controller 36.2290 */
(() => {
  'use strict';

  const BUILD = '36.2290';
  const SW_URL = '/sw.js';
  const INSTALL_DELAY = 8000;
  let installEvent = null;
  let installTimer = 0;

  const installed = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true;

  const toast = (message, background = '#111827') => {
    document.querySelectorAll('[data-esi-toast]').forEach(node => node.remove());
    const node = document.createElement('div');
    node.dataset.esiToast = '1';
    node.textContent = message;
    node.style.cssText = `position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;max-width:92%;padding:12px 18px;border-radius:12px;background:${background};color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 8px 25px rgba(0,0,0,.28);text-align:center`;
    (document.body || document.documentElement).appendChild(node);
    setTimeout(() => node.remove(), 4000);
  };
  window.showToast = toast;

  function installStyles() {
    if (document.getElementById('esi2290Style')) return;
    const style = document.createElement('style');
    style.id = 'esi2290Style';
    style.textContent = `
      html,body{min-height:100%;min-height:100dvh;overflow-x:hidden}
      *,*::before,*::after{box-sizing:border-box}
      #esi2290Install{position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;width:min(92vw,400px);z-index:2147483646;background:#0f172a;color:#fff;border:1px solid #2563eb;border-radius:17px;padding:13px;box-shadow:0 12px 40px rgba(0,0,0,.38);opacity:0;visibility:hidden;pointer-events:none;transform:translate(-50%,-18px);transition:opacity .25s ease,transform .25s ease,visibility .25s ease}
      #esi2290Install.esi-open{opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,0)}
      #esi2290Install button{font:700 13px system-ui,sans-serif}
    `;
    document.head.appendChild(style);
  }

  function createInstallUI() {
    if (document.getElementById('esi2290Install')) return;
    const box = document.createElement('section');
    box.id = 'esi2290Install';
    box.setAttribute('aria-label', 'Install Elite Scholar Institute');
    box.innerHTML = `
      <button type="button" id="esi2290Close" aria-label="Close" style="position:absolute;right:8px;top:8px;width:27px;height:27px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#cbd5e1;font-size:17px">×</button>
      <div style="display:flex;align-items:center;gap:10px;padding-right:30px">
        <img src="/logo.jpg" alt="Elite Scholar Institute" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex:0 0 auto">
        <div style="min-width:0">
          <strong style="display:block;color:#60a5fa;font:700 13.5px system-ui,sans-serif">ELITE SCHOLAR INSTITUTE</strong>
          <span style="display:block;margin-top:3px;color:#e5e7eb;font:400 12px/1.45 system-ui,sans-serif">Install the app for faster access and offline learning.</span>
        </div>
      </div>
      <button type="button" id="esi2290InstallButton" style="display:block;width:100%;margin-top:11px;padding:11px;border:0;border-radius:11px;background:#2563eb;color:#fff;cursor:pointer">Install Now</button>
    `;
    document.body.appendChild(box);
    box.querySelector('#esi2290Close').addEventListener('click', hideInstall);
    box.querySelector('#esi2290InstallButton').addEventListener('click', installNow);
  }

  function showInstall() {
    if (installed()) return;
    createInstallUI();
    const box = document.getElementById('esi2290Install');
    if (!box) return;
    box.classList.add('esi-open');
    clearTimeout(installTimer);
    installTimer = setTimeout(hideInstall, 9000);
  }

  function hideInstall() {
    const box = document.getElementById('esi2290Install');
    if (box) box.classList.remove('esi-open');
    clearTimeout(installTimer);
  }

  async function installNow() {
    if (!installEvent) {
      try {
        const registration = await navigator.serviceWorker?.getRegistration('/');
        await registration?.update();
      } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, 350));
      if (installEvent) return installNow();
      toast('The browser has not supplied its native install prompt yet. Use the browser Install App command.', '#2563eb');
      return;
    }

    const event = installEvent;
    installEvent = null;
    try {
      event.prompt();
      await event.userChoice;
    } catch (_) {}
    hideInstall();
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installEvent = event;
    window.__esiInstallAvailable = true;
    showInstall();
  });

  window.addEventListener('appinstalled', () => {
    installEvent = null;
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

  function offlineExternalProtection() {
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

  function setupViewport() {
    const setVH = () => document.documentElement.style.setProperty('--app-vh', `${innerHeight * .01}px`);
    setVH();
    addEventListener('resize', setVH, { passive:true });
    addEventListener('orientationchange', () => setTimeout(setVH,150), { passive:true });
    if (window.visualViewport) visualViewport.addEventListener('resize', setVH, { passive:true });
  }

  function showWhatsappPopup(item) {
    document.getElementById('whatsappPopupBanner')?.remove();
    const node = document.createElement('div');
    node.id = 'whatsappPopupBanner';
    node.style.cssText='position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:92%;max-width:400px;z-index:2147483640;background:#0f172a;color:#f8fafc;border:1px solid #2563eb;border-radius:16px;padding:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:400 12.5px/1.45 system-ui,sans-serif;cursor:pointer';
    const author = document.createElement('strong');
    author.style.color = '#60a5fa';
    author.textContent = item?.author || 'Elite Scholar Admin';
    const body = document.createElement('div');
    body.style.marginTop = '5px';
    body.textContent = item?.body || 'New broadcast message received.';
    node.append(author, body);
    node.addEventListener('click', () => { if (item?.url) location.href = item.url; });
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 7500);
  }
  window.showWhatsappPopup = showWhatsappPopup;
  window.closePopupBanner = () => document.getElementById('whatsappPopupBanner')?.remove();

  function boot() {
    installStyles();
    setupViewport();
    registerSW();
    offlineExternalProtection();
    if (!installed()) setTimeout(showInstall, INSTALL_DELAY);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
