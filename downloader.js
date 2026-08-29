document.addEventListener('DOMContentLoaded', function(){
  const CACHE_NAME = 'esi-pdf-cache-36.2346';
  const cachePromise = caches.open(CACHE_NAME);

  const getPdfUrl = (btn) => {
    const card = btn.closest('.book-card');
    const owner = btn.closest('[data-url]');
    const raw = (card && card.dataset.url) || (owner && owner.dataset.url) || btn.dataset.url || btn.getAttribute('href');
    if(!raw || /PASTE_/i.test(raw)) return null;
    try {
      const clean = new URL(raw, location.href);
      // In the APK, keep the proven appassets route so MainActivity's native
      // resource handler can retrieve the real Pages PDF.
      if (/ESIAndroid\//i.test(navigator.userAgent) && clean.origin === 'https://elitescholarinstitute.pages.dev') {
        return location.origin + clean.pathname;
      }
      return clean.origin + clean.pathname;
    } catch(e) {
      return null;
    }
  };

  const getFileName = (url) => {
    try {
      const name = decodeURIComponent(new URL(url, location.href).pathname.split('/').pop() || 'document.pdf');
      return /\.pdf$/i.test(name) ? name : 'document.pdf';
    } catch(e) { return 'document.pdf'; }
  };

  const isPdf = async (blob) => {
    if(!blob || !blob.size) return false;
    const h = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
    return h.length === 5 && h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46 && h[4] === 0x2D;
  };

  const openPdf = async (blob, fileName) => {
    if(!await isPdf(blob)) throw new Error('Not a PDF');
    if(window.ESIAndroid && typeof window.ESIAndroid.openPdf === 'function'){
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = () => {
          try {
            const data = String(reader.result || '');
            const comma = data.indexOf(',');
            window.ESIAndroid.openPdf(fileName, comma >= 0 ? data.slice(comma + 1) : data);
            resolve();
          } catch(e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error || new Error('PDF read failed'));
        reader.readAsDataURL(blob);
      });
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  };

  const markCachedButtons = async () => {
    try {
      const cache = await cachePromise;
      document.querySelectorAll('.download-btn').forEach(async btn => {
        const url = getPdfUrl(btn);
        if(!url) return;
        const cached = await cache.match(url);
        if(!cached) return;
        try {
          if(await isPdf(await cached.clone().blob())){
            btn.classList.add('success');
            const text = btn.querySelector('.btn-text');
            if(text) text.textContent = '✓ Open';
          } else await cache.delete(url);
        } catch(_) { await cache.delete(url); }
      });
    } catch(_) {}
  };

  document.addEventListener('click', async function(e){
    const btn = e.target.closest && e.target.closest('.download-btn');
    if(!btn) return;

    const url = getPdfUrl(btn);
    if(!url) return;

    e.preventDefault();
    e.stopPropagation();
    if(btn.classList.contains('loading')) return;

    const text = btn.querySelector('.btn-text');
    const percent = btn.querySelector('.percent');
    const fileName = getFileName(url);

    try {
      const cache = await cachePromise;
      const cached = await cache.match(url);
      if(cached){
        const blob = await cached.clone().blob();
        if(await isPdf(blob)){
          btn.classList.add('success');
          if(text) text.textContent = '✓ Open';
          await openPdf(blob, fileName);
          return;
        }
        await cache.delete(url);
      }

      btn.classList.add('loading');
      if(text) text.textContent = 'Downloading...';
      if(percent) percent.textContent = '0%';

      const response = await fetch(url, { method:'GET', cache:'no-store' });
      if(!response.ok) throw new Error('PDF request failed: ' + response.status);

      const blob = await response.blob();
      if(!await isPdf(blob)) throw new Error('Server did not return a PDF');

      await cache.put(url, new Response(blob, {headers:{'Content-Type':'application/pdf'}}));

      btn.classList.remove('loading');
      btn.classList.add('success');
      if(text) text.textContent = '✓ Open';
      if(percent) percent.textContent = '';
      await openPdf(blob, fileName);
    } catch(err) {
      console.error('PDF download error:', err);
      btn.classList.remove('loading');
      if(text) text.textContent = '⬇ Download Now';
      if(percent) percent.textContent = '';
      window.showToast && window.showToast('Download failed. Check internet');
    }
  }, true);

  markCachedButtons();
});
