const CACHE_NAME = 'elite-scholar-v36.2281';
const OFFLINE_URL = '/offline.html';

const APP_SHELL = [
  '/', '/index.html',
  '/logo.jpg', '/advert.png', '/esi.jpg', '/founder.jpg', '/manifest.json', '/offline.html',
  '/app.js', '/downloader.js',
  '/Textbooks.html', '/uniben.html', '/crstextbook.html', '/literaturetextbook.html',
  '/postutme.html', '/buk.html', '/imsu.html', '/oou.html', '/eksu.html', '/esut.html',
  '/lautech.html', '/aaua.html', '/syllables.html',
  '/Grace.jpg', '/Chuka.jpg', '/325.jpg', '/339.jpg', '/faloke.jpg', '/emma.jpg',
  '/uniport.html', '/unijos.html', '/unimed.html', '/unical.html', '/yabatech.html',
  '/oauth.html', '/luth.html', '/delsu.html',
  '/governmenttextbook.html', '/Englishtextbook.html', '/biologytextbook.html',
  '/chemistrytextbook.html', '/economicstextbook.html', '/physicstextbook.html',
  '/mathematicstextbook.html', '/motivation.html',
  '/chapter2.html', '/chapter3.html', '/chapter4.html', '/chapter5.html', '/chapter6.html',
  '/chapter7.html', '/chapter8.html', '/chapter9.html', '/chapter10.html',
  '/furthermathstextbook.html', '/accountingtextbook.html', '/motivation2.html',
  '/motivation3.html', '/biop.html', '/motivatio.html', '/uip.html', '/ulp.html',
  '/picture.html', '/motivation4.html', '/unn.html', '/physicsp.html', '/chemp.html',
  '/crsp.html', '/englishp.html', '/literaturep.html', '/mathematicsp.html',
  '/governmentp.html', '/economicsp.html', '/accountingp.html', '/oau.html',
  '/notification.html', '/abu.html', '/futa.html', '/unilorin.html', '/unizik.html',
  '/password.js', '/credit.html', '/timetable1.jpg', '/timetable2.jpg',
  '/quiz1.html', '/quiz.html', '/video.mp4', '/firebase-config.js',
  '/multiplayer.js', '/singleplay.js'
];

const isSameOrigin = request => new URL(request.url).origin === self.location.origin;
const isUsable = response => response && response.ok;

async function openAppCache() {
  return caches.open(CACHE_NAME);
}

async function cacheOne(cache, path) {
  const request = new Request(new URL(path, self.location.origin).href, {
    method: 'GET',
    cache: 'reload',
    redirect: 'follow'
  });
  const response = await fetch(request);
  if (!isUsable(response)) throw new Error(`${path}: HTTP ${response.status}`);
  await cache.put(request.url, response.clone());
  return true;
}

async function verifyShell() {
  const cache = await openAppCache();
  let missing = 0;
  for (const path of APP_SHELL) {
    const hit = await cache.match(new URL(path, self.location.origin).href, { ignoreSearch: true });
    if (!isUsable(hit)) missing++;
  }
  return { complete: missing === 0, missing };
}

async function messageClients(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await openAppCache();
    let completed = 0;

    // Never let one bad/missing file destroy the entire service-worker install.
    // Every successful shell item is retained; failures are reported and can be
    // retried naturally when that resource is requested later.
    for (const path of APP_SHELL) {
      try {
        await cacheOne(cache, path);
      } catch (error) {
        console.warn('[ESI SW] shell item failed:', path, error);
      }
      completed++;
      await messageClients({
        type: 'DOWNLOAD_PROGRESS',
        completed,
        total: APP_SHELL.length,
        percent: Math.round(completed * 100 / APP_SHELL.length)
      });
    }

    const result = await verifyShell();
    await messageClients({
      type: result.complete ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_INCOMPLETE',
      completed: APP_SHELL.length - result.missing,
      total: APP_SHELL.length,
      percent: Math.round((APP_SHELL.length - result.missing) * 100 / APP_SHELL.length),
      missing: result.missing
    });

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (event.data && event.data.type === 'CHECK_DOWNLOAD_COMPLETE') {
    event.waitUntil((async () => {
      const result = await verifyShell();
      await messageClients({
        type: result.complete ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_INCOMPLETE',
        completed: APP_SHELL.length - result.missing,
        total: APP_SHELL.length,
        percent: Math.round((APP_SHELL.length - result.missing) * 100 / APP_SHELL.length),
        missing: result.missing
      });
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !isSameOrigin(request)) return;

  event.respondWith((async () => {
    const cache = await openAppCache();

    // CACHE FIRST: use the exact URL requested. No .html -> extensionless
    // rewriting. Cloudflare Pages is allowed to serve the real HTML path.
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (isUsable(response)) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate' || request.destination === 'document') {
        const offline = await cache.match(new URL(OFFLINE_URL, self.location.origin).href, { ignoreSearch: true });
        return offline || Response.error();
      }
      return Response.error();
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin)) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
