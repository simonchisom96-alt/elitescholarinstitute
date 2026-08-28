/* Elite Scholar Institute — clean on-demand downloader 36.2290 */
(() => {
  'use strict';

  const CACHE_NAME = 'elite-scholar-v36.2290';

  const absoluteUrl = value => {
    try {
      const url = new URL(value, location.href);
      url.hash = '';
      return url.href;
    } catch (_) {
      return null;
    }
  };

  async function getCache() {
    return caches.open(CACHE_NAME);
  }

  async function setState(button, text, success = false) {
    const label = button.querySelector('.btn-text');
    const percent = button.querySelector('.percent');
    button.classList.remove('loading');
    button.classList.toggle('success', success);
    if (label) label.textContent = text;
    if (percent) percent.textContent = '';
  }

  async function cacheResource(url) {
    const cache = await getCache();
    const existing = await cache.match(url, { ignoreSearch:true });
    if (existing) return true;

    if (!navigator.onLine) throw new Error('offline');
    const response = await fetch(url, { method:'GET', cache:'no-store', redirect:'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await cache.put(url, response.clone());
    return true;
  }

  function init() {
    document.querySelectorAll('.download-btn').forEach(button => {
      const card = button.closest('.book-card');
      const raw = card?.dataset.url;
      const url = raw ? absoluteUrl(raw) : null;
      if (!url) return;

      getCache().then(cache => cache.match(url, { ignoreSearch:true }))
        .then(hit => { if (hit) setState(button, '✓ Open', true); })
        .catch(() => {});

      button.addEventListener('click', async event => {
        event.preventDefault();
        if (button.classList.contains('loading')) return;

        const target = absoluteUrl(card?.dataset.url);
        if (!target || card?.dataset.url?.includes('PASTE_')) {
          window.showToast?.('PDF link is not configured');
          return;
        }

        const cache = await getCache();
        const already = await cache.match(target, { ignoreSearch:true });
        if (already) {
          location.href = target;
          return;
        }

        if (!navigator.onLine) {
          window.showToast?.('Connect to the internet to download this file first');
          return;
        }

        button.classList.add('loading');
        const label = button.querySelector('.btn-text');
        if (label) label.textContent = 'Downloading...';

        try {
          const response = await fetch(target, { method:'GET', cache:'no-store', redirect:'follow' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await cache.put(target, response.clone());
          await setState(button, '✓ Open', true);
          setTimeout(() => { location.href = target; }, 200);
        } catch (error) {
          console.error('[ESI downloader]', error);
          await setState(button, '⬇ Download Now');
          window.showToast?.('Download failed. Check your internet connection');
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
