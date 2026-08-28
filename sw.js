/* Elite Scholar Institute — robust cache-first service worker 36.2291 */
'use strict';

const BUILD = '36.2291';
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
const urlFor = path => new URL(path, self.location.origin).href;

async function putResponse(cache, request, response) {
  if (!response || !response.ok) return false;
  try {
    await cache.put(request, response.clone());
    return true;
  } catch (_) {
    return false;
  }
}

async function notifyClients(type, data = {}) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage({ type, ...data }));
}

async function shellStatus() {
  const cache = await caches.open(CACHE_NAME);
  let complete = 0;
  for (const path of APP_SHELL) {
    if (await cache.match(urlFor(path), { ignoreSearch: true })) complete++;
  }
  return { complete, total: APP_SHELL.length };
}

async function cacheShell() {
  const cache = await caches.open(CACHE_NAME);
  for (let i = 0; i < APP_SHELL.length; i++) {
    const path = APP_SHELL[i];
    let ok = false;
    try {
      const response = await fetch(new Request(urlFor(path), {
        method: 'GET', cache: 'no-store', redirect: 'follow'
      }));
      ok = await putResponse(cache, urlFor(path), response);
    } catch (_) {}
    await notifyClients('DOWNLOAD_PROGRESS', {
      completed: i + 1,
      total: APP_SHELL.length,
      percent: Math.round((i + 1) * 100 / APP_SHELL.length),
      file: path,
      ok
    });
  }
  const status = await shellStatus();
  await notifyClients(status.complete === status.total ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_PARTIAL', status);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await caches.open(CACHE_NAME);
    // Do not make activation depend on every shell file succeeding.
    // Files that fail here are still cached automatically when visited online.
    await cacheShell();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter(name => name.startsWith('elite-scholar-v') && name !== CACHE_NAME)
           .map(name => caches.delete(name))
    );
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
      await notifyClients(status.complete === status.total ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_PARTIAL', status);
    })());
  }
  if (event.data?.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const raw of event.data.urls) {
        try {
          const url = new URL(raw, self.location.origin);
          if (url.origin !== self.location.origin) continue;
          const response = await fetch(new Request(url.href, { cache:'no-store', redirect:'follow' }));
          await putResponse(cache, url.href, response);
        } catch (_) {}
      }
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Exact request first. No .html stripping, no rewriting to '/', and no
    // navigation canonicalization. Every page keeps its real URL.
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok) {
        // Cache every successful same-origin resource encountered while browsing:
        // HTML, JS, CSS, images, fonts, JSON, video, PDFs and other GET resources.
        await putResponse(cache, request, response);
      }
      return response;
    } catch (_) {
      if (request.mode === 'navigate' || request.destination === 'document') {
        const offline = await cache.match(urlFor(OFFLINE_URL), { ignoreSearch: true });
        return offline || new Response(
          '<!doctype html><meta name="viewport" content="width=device-width"><title>Offline</title><h1>You are offline</h1>',
          { headers:{ 'Content-Type':'text/html;charset=utf-8' } }
        );
      }
      const cachedAgain = await cache.match(request, { ignoreSearch:true });
      return cachedAgain || new Response('', { status:504, statusText:'Offline' });
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/index.html';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin)) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
