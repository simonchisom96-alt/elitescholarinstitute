/* Elite Scholar Institute — on-demand cache helper 36.2292 */
(() => {
  'use strict';

  const CACHE_NAME = 'elite-scholar-v36.2292';

  const toUrl = value => {
    try {
      const u = new URL(value, location.href);
      u.hash = '';
      return u.href;
    } catch (_) { return null; }
  };

  async function cacheOne(rawUrl) {
    const url = toUrl(rawUrl);
    if (!url || new URL(url).origin !== location.origin) throw new Error('Only same-origin resources can be cached.');
    const cache = await caches.open(CACHE_NAME);
    if (await cache.match(url, { ignoreSearch:true })) return true;
    const response = await fetch(new Request(url, { method:'GET', cache:'no-store', redirect:'follow' }));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await cache.put(url, response.clone());
    return true;
  }

  async function cacheUrls(urls) {
    for (const url of urls) {
      try { await cacheOne(url); } catch (error) { console.warn('[ESI cache]', url, error); }
    }
  }

  // Expose a small API for existing pages without requiring HTML changes.
  window.ESICache = {
    cache: cacheOne,
    cacheMany: cacheUrls,
    cacheCurrentPage: () => cacheOne(location.href)
  };

  // If a page already uses .download-btn + data-url, keep that behavior.
  function init() {
    document.querySelectorAll('.download-btn').forEach(button => {
      if (button.dataset.esiDownloaderReady === '1') return;
      const holder = button.closest('[data-url]');
      const raw = holder?.dataset.url || button.dataset.url;
      if (!raw) return;
      button.dataset.esiDownloaderReady = '1';

      button.addEventListener('click', async event => {
        const target = toUrl(raw);
        if (!target) return;
        event.preventDefault();
        try {
          await cacheOne(target);
          location.href = target;
        } catch (error) {
          console.warn('[ESI downloader]', error);
          window.showToast?.('Unable to cache this file. Check your connection.');
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
