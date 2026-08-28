(() => {
  const CACHE_NAME = 'elite-scholar-v36.2280';

  function cleanUrl(value) {
    try {
      const u = new URL(value, location.href);
      u.hash = '';
      return u.href;
    } catch (_) { return value; }
  }

  async function openCache() {
    return caches.open(CACHE_NAME);
  }

  async function markButton(btn, text, success) {
    const label = btn.querySelector('.btn-text');
    const percent = btn.querySelector('.percent');
    btn.classList.toggle('success', !!success);
    btn.classList.remove('loading');
    if (label) label.textContent = text;
    if (percent) percent.textContent = '';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const cache = await openCache();
    const buttons = document.querySelectorAll('.download-btn');

    // Show already cached PDFs immediately.
    for (const btn of buttons) {
      const card = btn.closest('.book-card');
      const raw = card?.dataset.url;
      if (!raw) continue;
      const url = cleanUrl(raw);
      if (await cache.match(url, { ignoreSearch: true })) await markButton(btn, '✓ Open', true);
    }

    buttons.forEach(btn => btn.addEventListener('click', async e => {
      e.preventDefault();
      if (btn.classList.contains('loading')) return;

      const card = btn.closest('.book-card');
      const raw = card?.dataset.url;
      const label = btn.querySelector('.btn-text');
      const percent = btn.querySelector('.percent');
      if (!raw || raw.includes('PASTE_')) {
        window.showToast?.('❌ PDF link not set yet');
        return;
      }

      const url = cleanUrl(raw);
      const cached = await cache.match(url, { ignoreSearch: true });
      if (cached) {
        location.href = url;
        return;
      }
      if (!navigator.onLine) {
        window.showToast?.('Connect your internet to download first');
        return;
      }

      btn.classList.add('loading');
      if (label) label.textContent = 'Downloading...';
      if (percent) percent.textContent = '0%';

      try {
        const response = await fetch(url, { cache: 'no-store', redirect: 'follow' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Stream into a Blob so the progress indicator works where the server
        // exposes Content-Length. The final response is then stored in the same
        // cache used by the service worker.
        if (response.body) {
          const reader = response.body.getReader();
          const chunks = [];
          const total = Number(response.headers.get('content-length')) || 0;
          let received = 0;
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            chunks.push(part.value);
            received += part.value.byteLength;
            if (total && percent) percent.textContent = `${Math.min(100, Math.round(received * 100 / total))}%`;
          }
          const bytes = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
          await cache.put(url, new Response(new Blob([bytes], { type: response.headers.get('content-type') || 'application/pdf' })));
        } else {
          await cache.put(url, response.clone());
        }

        if (percent) percent.textContent = '100%';
        await markButton(btn, '✓ Open', true);
        setTimeout(() => { location.href = url; }, 250);
      } catch (err) {
        console.error('[ESI downloader]', err);
        await markButton(btn, '⬇ Download Now', false);
        window.showToast?.('Download failed. Check your internet connection');
      }
    }));
  });
})();
