/* Elite Scholar Institute — clean cache-first service worker */
const BUILD = '36.2290';
const CACHE_NAME = `elite-scholar-v${BUILD}`;
const OFFLINE_URL = '/offline.html';

const APP_SHELL = [
  '/', '/index.html', '/logo.jpg', '/advert.png', '/esi.jpg', '/founder.jpg',
  '/manifest.json', '/offline.html', '/app.js', '/downloader.js',
  '/Textbooks.html', '/uniben.html', '/crstextbook.html', '/literaturetextbook.html',
  '/postutme.html', '/buk.html', '/imsu.html', '/oou.html', '/eksu.html', '/esut.html',
  '/lautech.html', '/aaua.html', '/syllables.html', '/Grace.jpg', '/Chuka.jpg',
  '/325.jpg', '/339.jpg', '/faloke.jpg', '/emma.jpg', '/uniport.html', '/unijos.html',
  '/unimed.html', '/unical.html', '/yabatech.html', '/oauth.html', '/luth.html',
  '/delsu.html', '/governmenttextbook.html', '/Englishtextbook.html',
  '/biologytextbook.html', '/chemistrytextbook.html', '/economicstextbook.html',
  '/physicstextbook.html', '/mathematicstextbook.html', '/motivation.html',
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

const sameOrigin = request => new URL(request.url).origin === self.location.origin;
const absolute = path => new URL(path, self.location.origin).href;

async function cacheShellItem(cache, path) {
  const url = absolute(path);
  try {
    // A normal fetch is deliberately used here. Cloudflare Pages may redirect
    // an HTML URL; the final successful response is still stored under the
    // exact URL the application requested.
    const response = await fetch(new Request(url, { method: 'GET', cache: 'no-store', redirect: 'follow' }));
    if (!response || !response.ok) return false;
    await cache.put(url, response.clone());
    return true;
  } catch (_) {
    return false;
  }
}

async function shellStatus() {
  const cache = await caches.open(CACHE_NAME);
  let complete = 0;
  for (const path of APP_SHELL) {
    if (await cache.match(absolute(path), { ignoreSearch: true })) complete++;
  }
  return { complete, total: APP_SHELL.length };
}

async function tellClients(type, extra = {}) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of list) client.postMessage({ type, ...extra });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // The worker is installed independently of individual shell failures.
    // Successful files are retained, and failed files are retried on demand.
    for (let i = 0; i < APP_SHELL.length; i++) {
      const path = APP_SHELL[i];
      const ok = await cacheShellItem(cache, path);
      await tellClients('DOWNLOAD_PROGRESS', {
        completed: i + 1,
        total: APP_SHELL.length,
        percent: Math.round(((i + 1) / APP_SHELL.length) * 100),
        file: path,
        ok
      });
    }

    const status = await shellStatus();
    await tellClients(status.complete === status.total ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_PARTIAL', status);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (event.data?.type === 'CHECK_DOWNLOAD_COMPLETE') {
    event.waitUntil((async () => {
      const status = await shellStatus();
      await tellClients(status.complete === status.total ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_PARTIAL', status);
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // TRUE CACHE-FIRST. No extension rewriting, no canonical-path conversion,
    // no navigation interception to another HTML file.
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok) {
        // Store every successful same-origin GET, including HTML, JS, CSS,
        // images, fonts, JSON and other resources encountered while browsing.
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      if (request.mode === 'navigate' || request.destination === 'document') {
        const offline = await cache.match(absolute(OFFLINE_URL), { ignoreSearch: true });
        return offline || new Response('<!doctype html><title>Offline</title><h1>You are offline</h1>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/index.html';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin)) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
