const CACHE_NAME = 'elite-scholar-v36.2270';
const OFFLINE_URL = '/offline.html';

const APP_SHELL = [
  '/',
  '/index.html',
  '/logo.jpg',
  '/advert.png',
  '/esi.jpg',
  '/founder.jpg',
  '/manifest.json',
  '/offline.html',
  '/app.js',
  '/downloader.js',
  '/Textbooks.html',
  '/uniben.html',
  '/crstextbook.html',
  '/literaturetextbook.html',
  '/postutme.html',
  '/buk.html',
  '/imsu.html',
  '/oou.html',
  '/eksu.html',
  '/esut.html',
  '/lautech.html',
  '/aaua.html',
  '/syllables.html',
  '/Grace.jpg',
  '/Chuka.jpg',
  '/325.jpg',
  '/339.jpg',
  '/faloke.jpg',
  '/emma.jpg',
  '/uniport.html',
  '/unijos.html',
  '/unimed.html',
  '/unical.html',
  '/yabatech.html',
  '/oauth.html',
  '/luth.html',
  '/delsu.html',
  '/governmenttextbook.html',
  '/Englishtextbook.html',
  '/biologytextbook.html',
  '/chemistrytextbook.html',
  '/economicstextbook.html',
  '/physicstextbook.html',
  '/mathematicstextbook.html',
  '/motivation.html',
  '/chapter2.html',
  '/chapter3.html',
  '/chapter4.html',
  '/chapter5.html',
  '/chapter6.html',
  '/chapter7.html',
  '/chapter8.html',
  '/chapter9.html',
  '/chapter10.html',
  '/furthermathstextbook.html',
  '/accountingtextbook.html',
  '/motivation2.html',
  '/motivation3.html',
  '/biop.html',
  '/motivatio.html',
  '/uip.html',
  '/ulp.html',
  '/picture.html',
  '/motivation4.html',
  '/unn.html',
  '/physicsp.html',
  '/chemp.html',
  '/crsp.html',
  '/englishp.html',
  '/literaturep.html',
  '/mathematicsp.html',
  '/governmentp.html',
  '/economicsp.html',
  '/accountingp.html',
  '/oau.html',
  '/notification.html',
  '/abu.html',
  '/futa.html',
   '/unilorin.html',
   '/unizik.html',
 '/password.js',
 '/credit.html',
 '/timetable1.jpg',
 '/timetable2.jpg',
 '/quiz1.html',
 '/quiz.html',
 '/video.mp4',
 '/firebase-config.js',
 '/multiplayer.js',
 '/singleplay.js',
   ];

self.addEventListener('message', async (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data && e.data.type === 'CHECK_DOWNLOAD_COMPLETE') {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    if (keys.length >= APP_SHELL.length) {
      const clientsList = await self.clients.matchAll();
      clientsList.forEach(c => c.postMessage({ type: 'DOWNLOAD_SUCCESS' }));
    }
  }
});

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' })));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k!== CACHE_NAME? caches.delete(k) : null)))
   .then(() => self.clients.claim())
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) {
          c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  if (req.method !== 'GET') return;

  // Pages:...*ESI*237530659608108391083# CACHE FIRST = instant offline, no network check
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      let ch = await cache.match(req, { ignoreSearch: true });
      if (ch) return ch;
      if (!u.pathname.endsWith('/') && !u.pathname.includes('.')) {
        ch = await cache.match(u.pathname + '.html');
        if (ch) return ch;
      }
      if (u.pathname === '/' || u.pathname === '/index.html') {
        ch = await cache.match('/index.html');
        if (ch) return ch;
      }
      try {
        const r = await fetch(req);
        if (r.ok) cache.put(req, r.clone());
        return r;
      } catch {
        return await cache.match(OFFLINE_URL);
      }
    })());
    return;
  }

  // Assets: CACHE FIRST (same as before)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      return cached || fetch(req).then(r => {
        if (r.ok) caches.open(CACHE_NAME).then(ca => ca.put(req, r.clone()));
        return r;
      }).catch(() => cached);
    })
  );
});
