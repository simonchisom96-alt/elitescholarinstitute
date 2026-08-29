/* Elite Scholar Institute service worker — offline shell + runtime cache */
const CACHE_VERSION = 'esi-cache-36.2346';
const APP_SHELL = [
  '/', '/index.html', '/logo.jpg', '/advert.png', '/esi.jpg', '/founder.jpg',
  '/manifest.json', '/offline.html', '/app.js', '/downloader.js',
  '/Textbooks.html', '/uniben.html', '/crstextbook.html', '/literaturetextbook.html',
  '/postutme.html', '/buk.html', '/imsu.html', '/oou.html', '/eksu.html', '/esut.html',
  '/lautech.html', '/aaua.html', '/syllables.html', '/Grace.jpg', '/Chuka.jpg', '/325.jpg',
  '/339.jpg', '/faloke.jpg', '/emma.jpg', '/uniport.html', '/unijos.html', '/unimed.html',
  '/unical.html', '/yabatech.html', '/oauth.html', '/luth.html', '/delsu.html',
  '/governmenttextbook.html', '/Englishtextbook.html', '/biologytextbook.html',
  '/chemistrytextbook.html', '/economicstextbook.html', '/physicstextbook.html',
  '/mathematicstextbook.html', '/motivation.html', '/chapter2.html', '/chapter3.html',
  '/chapter4.html', '/chapter5.html', '/chapter6.html', '/chapter7.html', '/chapter8.html',
  '/chapter9.html', '/chapter10.html', '/furthermathstextbook.html', '/accountingtextbook.html',
  '/motivation2.html', '/motivation3.html', '/biop.html', '/motivatio.html', '/uip.html',
  '/ulp.html', '/picture.html', '/motivation4.html', '/unn.html', '/physicsp.html',
  '/chemp.html', '/crsp.html', '/englishp.html', '/literaturep.html', '/mathematicsp.html',
  '/governmentp.html', '/economicsp.html', '/accountingp.html', '/oau.html',
  '/notification.html', '/abu.html', '/futa.html', '/unilorin.html', '/unizik.html',
  '/password.js', '/credit.html', '/timetable1.jpg', '/timetable2.jpg', '/quiz1.html',
  '/quiz.html', '/video.mp4', '/firebase-config.js', '/multiplayer.js', '/singleplay.js'
];

const isSameOrigin = request => new URL(request.url).origin === self.location.origin;
const isGet = request => request.method === 'GET';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(APP_SHELL.map(async url => {
      try {
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (response.ok || response.type === 'opaque') await cache.put(url, response.clone());
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('esi-cache-') && key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (!isGet(request) || !isSameOrigin(request)) return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  // PDFs have their own download/cache pipeline. In the APK, PDF URLs use
  // the appassets origin so MainActivity can retrieve the real Pages PDF.
  // Let those requests reach the native resource handler instead of this
  // generic runtime cache.
  if (/\.pdf$/i.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const network = await fetch(request);
        if (network.ok) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, network.clone()).catch(() => {});
        }
        return network;
      } catch (_) {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match(request)) || (await cache.match('/index.html')) || (await cache.match('/offline.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);
    if (cached) {
      fetch(request).then(response => { if (response.ok) cache.put(request, response.clone()).catch(() => {}); }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
