/* Elite Scholar Institute Service Worker — 36.2302 */
'use strict';

const BUILD = '36.2302';
const CACHE = `esi-${BUILD}`;
const OFFLINE = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(new Request(OFFLINE, { cache: 'no-store' }));
      if (response.ok) await cache.put(OFFLINE, response.clone());
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key.startsWith('esi-') && key !== CACHE)
          .map(key => caches.delete(key))
    );
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

function isSameOrigin(request) {
  try { return new URL(request.url).origin === self.location.origin; }
  catch (_) { return false; }
}

function isNavigation(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').toLowerCase().includes('text/html');
}

function isGood(response) {
  return !!response && response.ok &&
    (response.type === 'basic' || response.type === 'cors');
}

async function cachePut(request, response) {
  if (!isGood(response)) return;
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  } catch (_) {}
}

async function getNetwork(request, preloadResponse) {
  if (preloadResponse) {
    try {
      const preloaded = await preloadResponse;
      if (preloaded) return preloaded;
    } catch (_) {}
  }
  return fetch(request, { cache: 'no-store', redirect: 'follow' });
}

async function handleNavigation(event) {
  const request = event.request;

  // Online: the live Cloudflare HTML is always authoritative.
  // This prevents an old cached page from breaking normal navigation.
  try {
    const response = await getNetwork(request, event.preloadResponse);
    if (response && response.ok) {
      await cachePut(request, response);
      return response;
    }
  } catch (_) {}

  // Offline/failed network: return the exact previously visited HTML page.
  try {
    const cache = await caches.open(CACHE);
    const url = new URL(request.url);
    const cached = await cache.match(request) || await cache.match(url.pathname);
    if (cached) return cached;

    const offline = await cache.match(OFFLINE);
    if (offline) return offline;
  } catch (_) {}

  return new Response(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elite Scholar Institute</title></head><body><h3>Offline</h3><p>This page has not been cached yet.</p></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function handleResource(request) {
  // Online resources use the newest server copy first. A successful response is
  // cached immediately, so every HTML/CSS/JS/image/PDF resource becomes available
  // offline after it has been visited once.
  try {
    const response = await fetch(request, { cache: 'no-store', redirect: 'follow' });
    if (isGood(response)) await cachePut(request, response);
    return response;
  } catch (_) {}

  // Offline: use the exact resource previously cached while online.
  try {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
  } catch (_) {}

  return new Response('', { status: 504, statusText: 'Offline' });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !isSameOrigin(request)) return;
  event.respondWith(
    isNavigation(request) ? handleNavigation(event) : handleResource(request)
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
