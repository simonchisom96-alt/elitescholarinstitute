/* Elite Scholar Institute — resilient cache-first offline worker 36.2295 */
'use strict';

const BUILD = '36.2295';
const CACHE_NAME = `elite-scholar-v${BUILD}`;
const OFFLINE_URL = '/offline.html';

// Only the true boot shell is required before the first page can render.
// Everything else is cached progressively as it is requested.
const APP_SHELL = ['/', '/index.html', '/offline.html', '/manifest.json', '/app.js', '/downloader.js', '/logo.jpg'];

const sameOrigin = request => {
  try { return new URL(request.url).origin === self.location.origin; } catch (_) { return false; }
};
const abs = path => new URL(path, self.location.origin).href;

async function put(cache, request, response) {
  if (!response || !response.ok) return false;
  try { await cache.put(request, response.clone()); return true; } catch (_) { return false; }
}

async function fetchAndCache(cache, url) {
  try {
    const response = await fetch(new Request(url, { method:'GET', cache:'no-store', redirect:'follow' }));
    return await put(cache, url, response);
  } catch (_) { return false; }
}

async function warmShell() {
  const cache = await caches.open(CACHE_NAME);
  let complete = 0;
  for (const path of APP_SHELL) {
    const url = abs(path);
    if (await cache.match(url, { ignoreSearch:true }) || await fetchAndCache(cache, url)) complete++;
  }
  const clients = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
  clients.forEach(client => client.postMessage({
    type: complete === APP_SHELL.length ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_PARTIAL',
    complete, total: APP_SHELL.length, build: BUILD
  }));
}

self.addEventListener('install', event => {
  // Activation must never wait for the shell or the whole site.
  event.waitUntil((async () => {
    await caches.open(CACHE_NAME);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('elite-scholar-v') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
  // Warm independently so a slow/broken file can never leave pages blank.
  setTimeout(() => warmShell().catch(() => {}), 0);
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type === 'CHECK_DOWNLOAD_COMPLETE') {
    event.waitUntil(warmShell());
    return;
  }
  if (event.data?.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const raw of event.data.urls) {
        try {
          const url = new URL(raw, self.location.origin);
          if (url.origin === self.location.origin) await fetchAndCache(cache, url.href);
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
    const cached = await cache.match(request, { ignoreSearch:true });
    // Cache first: previously visited resources never need the network.
    if (cached) return cached;

    try {
      const response = await fetch(request);
      // Progressive caching: every successful same-origin GET is saved.
      await put(cache, request, response);
      return response;
    } catch (_) {
      if (request.mode === 'navigate' || request.destination === 'document') {
        const offline = await cache.match(abs(OFFLINE_URL), { ignoreSearch:true });
        if (offline) return offline;
        const index = await cache.match(abs('/index.html'), { ignoreSearch:true });
        if (index) return index;
        return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elite Scholar Institute</title><body><h1>Elite Scholar Institute</h1><p>This page is not cached yet. Open it once while online.</p></body>', { status:200, headers:{'Content-Type':'text/html; charset=utf-8'} });
      }
      return new Response('', { status:504, statusText:'Offline' });
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
        try { await client.navigate(target); } catch (_) {}
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
