document.addEventListener('DOMContentLoaded', async function(){
  const CACHE_NAME = 'esi-pdf-cache-36.2337';
  const cache = await caches.open(CACHE_NAME);
  const btns = document.querySelectorAll('.download-btn');

  const getCleanUrl = (url) => {
    const clean = new URL(url, location.href);
    if (/ESIAndroid\//i.test(navigator.userAgent) && clean.origin === 'https://elitescholarinstitute.pages.dev') {
      return location.origin + clean.pathname + clean.search;
    }
    return clean.href;
  };

  const getPdfUrl = (btn) => {
    const owner = btn.closest('[data-url]');
    const rawUrl = (owner && owner.dataset.url) || btn.dataset.url || btn.getAttribute('href');
    if(!rawUrl || /PASTE_/i.test(rawUrl)) return null;
    const url = getCleanUrl(rawUrl);
    try {
      const path = new URL(url, location.href).pathname.toLowerCase();
      return path.endsWith('.pdf') ? url : null;
    } catch(e) {
      return null;
    }
  };

  const getFileName = (url) => {
    try {
      const name = decodeURIComponent(new URL(url, location.href).pathname.split('/').pop() || 'document.pdf');
      return /\.pdf$/i.test(name) ? name : 'document.pdf';
    } catch(e) {
      return 'document.pdf';
    }
  };

  const isPdfBlob = async (blob) => {
    if(!blob || !blob.size) return false;
    const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
    return header.length === 5 && header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46 && header[4] === 0x2D;
  };

  const downloadInBrowser = (blob, fileName) => {
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

  const openPdfBlob = async (blob, fileName = 'document.pdf') => {
    if(!(await isPdfBlob(blob))) throw new Error('Response is not a valid PDF');

    if(window.ESIAndroid && typeof window.ESIAndroid.openPdf === 'function'){
      const reader = new FileReader();
      await new Promise((resolve, reject) => {
        reader.onload = () => {
          try {
            const result = String(reader.result || '');
            const comma = result.indexOf(',');
            const base64 = comma >= 0 ? result.slice(comma + 1) : result;
            window.ESIAndroid.openPdf(fileName, base64);
            resolve();
          } catch(err) { reject(err); }
        };
        reader.onerror = () => reject(reader.error || new Error('Unable to read PDF'));
        reader.readAsDataURL(blob);
      });
      return;
    }

    downloadInBrowser(blob, fileName);
  };

  for(const btn of btns){
    const absoluteUrl = getPdfUrl(btn);
    if(!absoluteUrl) continue;
    const btnText = btn.querySelector('.btn-text');
    const cached = await cache.match(absoluteUrl);
    if(cached){
      try {
        const cachedBlob = await cached.blob();
        if(await isPdfBlob(cachedBlob)){
          btn.classList.add('success');
          if(btnText) btnText.textContent = '✓ Open';
        } else {
          await cache.delete(absoluteUrl);
        }
      } catch(_) {
        await cache.delete(absoluteUrl);
      }
    }
  }

  btns.forEach(btn => {
    btn.addEventListener('click', async function(e){
      e.preventDefault();
      e.stopPropagation();
      if(btn.classList.contains('loading')) return;

      const btnText = btn.querySelector('.btn-text');
      const percent = btn.querySelector('.percent');
      const absoluteUrl = getPdfUrl(btn);
      if(!absoluteUrl){
        window.showToast('❌ PDF link not set yet');
        return;
      }

      const fileName = getFileName(absoluteUrl);
      const cached = await cache.match(absoluteUrl);
      if(cached){
        try {
          const cachedBlob = await cached.blob();
          if(await isPdfBlob(cachedBlob)){
            await openPdfBlob(cachedBlob, fileName);
            return;
          }
          await cache.delete(absoluteUrl);
        } catch(err) {
          console.error('Cached PDF error:', err);
          await cache.delete(absoluteUrl);
        }
      }

      if(!navigator.onLine){
        window.showToast('Connect your internet to download first');
        return;
      }

      btn.classList.add('loading');
      if(btnText) btnText.textContent = 'Downloading...';
      if(percent) percent.textContent = '0%';

      try {
        // Keep the proven same-origin PDF request path. In the APK the Android
        // WebView interceptor receives the appassets PDF URL and handles the
        // native network/cache path. On the website this remains same-origin.
        const res = await fetch(absoluteUrl, { method: 'GET', credentials: 'same-origin', cache: 'default' });
        if(!res.ok) throw new Error('PDF request failed: ' + res.status);

        const blob = await res.blob();
        if(!(await isPdfBlob(blob))) throw new Error('Server did not return a PDF');

        const pdfResponse = new Response(blob, {headers:{'Content-Type':'application/pdf'}});
        await cache.put(absoluteUrl, pdfResponse.clone());

        if(percent) percent.textContent = '100%';
        btn.classList.remove('loading');
        btn.classList.add('success');
        if(btnText) btnText.textContent = '✓ Open';
        if(percent) percent.textContent = '';

        await openPdfBlob(blob, fileName);
      } catch(err) {
        console.error('PDF download error:', err);
        btn.classList.remove('loading');
        if(btnText) btnText.textContent = '⬇ Download Now';
        if(percent) percent.textContent = '';
        window.showToast('Download failed. Check internet');
      }
    });
  }
});
