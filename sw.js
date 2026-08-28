/* Elite Scholar Institute — cache-first offline worker 36.2294 */
'use strict';

const BUILD = '36.2294';
const CACHE_NAME = `elite-scholar-v${BUILD}`;
const OFFLINE_URL = '/offline.html';

// Keep this shell limited to stable same-origin app entry points. Every other
// same-origin GET (HTML, JS, CSS, images, PDFs, video, fonts, etc.) is cached
// automatically the first time it is requested.
const APP_SHELL = [
  '/', '/index.html', '/offline.html', '/manifest.json',
  '/app.js', '/downloader.js', '/logo.jpg', '/advert.png', '/esi.jpg', '/founder.jpg',
  '/Textbooks.html', '/uniben.html', '/crstextbook.html', '/literaturetextbook.html',
  '/postutme.html', '/buk.html', '/imsu.html', '/oou.html', '/eksu.html', '/esut.html',
  '/lautech.html', '/aaua.html', '/syllables.html', '/uniport.html', '/unijos.html',
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

async function put(cache, request, response) {
  if (!response || !response.ok) return false;
  try { await cache.put(request, response.clone()); return true; } catch (_) { return false; }
}

async function report(type, extra = {}) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage({ type, ...extra }));
}

async function shellStatus() {
  const cache = await caches.open(CACHE_NAME);
  let complete = 0;
  for (const path of APP_SHELL) if (await cache.match(absolute(path), { ignoreSearch: true })) complete++;
  return { complete, total: APP_SHELL.length, build: BUILD };
}

async function warmShell() {
  const cache = await caches.open(CACHE_NAME);
  let completed = 0;
  for (const path of APP_SHELL) {
    const url = absolute(path);
    let ok = false;
    try {
      if (await cache.match(url, { ignoreSearch: true })) ok = true;
      else {
        const response = await fetch(new Request(url, { method: 'GET', cache: 'no-store', redirect: 'follow' }));
        ok = await put(cache, url, response);
      }
    } catch (_) {}
    completed++;
    await report('DOWNLOAD_PROGRESS', {
      completed, total: APP_SHELL.length,
      percent: Math.round(completed * 100 / APP_SHELL.length), file: path, ok
    });
  }
  const status = await shellStatus();
  await report(status.complete === status.total ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_PARTIAL', status);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await caches.open(CACHE_NAME);
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
    await warmShell();
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
      await report(status.complete === status.total ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_PARTIAL', status);
    })());
    return;
  }
  if (event.data?.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const raw of event.data.urls) {
        try {
          const url = new URL(raw, self.location.origin);
          if (url.origin !== self.location.origin || url.protocol !== 'https:' && url.protocol !== 'http:') continue;
          const response = await fetch(new Request(url.href, { method: 'GET', cache: 'no-store', redirect: 'follow' }));
          await put(cache, url.href, response);
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
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok) await put(cache, request, response);
      return response;
    } catch (_) {
      if (request.mode === 'navigate' || request.destination === 'document') {
        const offline = await cache.match(absolute(OFFLINE_URL), { ignoreSearch: true });
        if (offline) return offline;
        const index = await cache.match(absolute('/index.html'), { ignoreSearch: true });
        if (index) return index;
        return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elite Scholar Institute</title><body><h1>You are offline</h1><p>This page has not been cached yet.</p></body>', {
          status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }
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
        try { await client.navigate(target); } catch (_) {}
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
