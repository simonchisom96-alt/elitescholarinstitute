document.addEventListener('DOMContentLoaded', async function(){
  const CACHE_NAME = 'esi-cache-36.2314';
  const cache = await caches.open(CACHE_NAME);
  const btns = document.querySelectorAll('.download-btn');

  const getCleanUrl = (url) => {
    const clean = new URL(url, location.origin);
    return clean.origin + clean.pathname;
  };

  // 1. On load: mark already downloaded files
  for(const btn of btns){
    const card = btn.closest('.book-card');
    if(!card) continue;
    const url = card.dataset.url;
    if(!url) continue;

    const absoluteUrl = getCleanUrl(url);
    const btnText = btn.querySelector('.btn-text');
    const cached = await cache.match(absoluteUrl);

    if(cached && btnText){
      btn.classList.add('success');
      btnText.textContent = '✓ Open';
    }
  }

  // 2. Click handler
  btns.forEach(btn => {
    btn.addEventListener('click', async function(e){
      e.preventDefault();

      if(btn.classList.contains('loading')) return;

      const card = btn.closest('.book-card');
      if(!card) return;

      const url = card.dataset.url;
      const btnText = btn.querySelector('.btn-text');
      const percent = btn.querySelector('.percent');

      if(!url || url.includes('PASTE_')){
        window.showToast('❌ PDF link not set yet');
        return;
      }

      const absoluteUrl = getCleanUrl(url);
      const cached = await cache.match(absoluteUrl);

      if(cached){
        location.href = absoluteUrl;
        return;
      }

      if(!navigator.onLine){
        window.showToast("Connect your internet to download first");
        return;
      }

      btn.classList.add('loading');
      if(btnText) btnText.textContent = 'Downloading...';
      if(percent) percent.textContent = '0%';

      try {
        const res = await fetch(absoluteUrl, {cache: 'no-store'});
        if(!res.ok) throw new Error('Fetch failed');

        if (!res.body) {
          const blob = await res.blob();
          await cache.put(absoluteUrl, new Response(blob, {headers: {'Content-Type': 'application/pdf'}}));
          if(percent) percent.textContent = '100%';
        } else {
          const totalBytes = parseInt(res.headers.get('content-length'), 10) || 0;
          let receivedBytes = 0;
          const reader = res.body.getReader();
          const chunks = [];

          while(true) {
            const {done, value} = await reader.read();
            if(done) break;
            chunks.push(value);
            receivedBytes += value.length;
            if(totalBytes > 0 && percent) {
              const currentPercent = Math.round((receivedBytes / totalBytes) * 100);
              percent.textContent = currentPercent + '%';
            }
          }

          const allChunks = new Uint8Array(receivedBytes);
          let position = 0;
          for(const chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
          }

          const blob = new Blob([allChunks], {type: 'application/pdf'});
          await cache.put(absoluteUrl, new Response(blob, {headers: {'Content-Type': 'application/pdf'}}));
          if(percent) percent.textContent = '100%';
        }

        setTimeout(() => {
          btn.classList.remove('loading');
          btn.classList.add('success');
          if(btnText) btnText.textContent = '✓ Open';
          if(percent) percent.textContent = '';
          location.href = absoluteUrl;
        }, 300);

      } catch(err) {
        console.error('Download error:', err);
        btn.classList.remove('loading');
        if(btnText) btnText.textContent = '⬇ Download Now';
        if(percent) percent.textContent = '';
        window.showToast('Download failed. Check internet');
      }
    });
  });
});
