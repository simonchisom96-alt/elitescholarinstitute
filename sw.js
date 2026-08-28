/* Elite Scholar Institute — clean offline engine 36.2300 */
'use strict';

const BUILD = '36.2300';
const CACHE_NAME = 'esi-runtime-' + BUILD;
const OFFLINE_URL = '/offline.html';
const PRECACHE = ['/offline.html'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(PRECACHE.map(async url => {
      try { await cache.add(url); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('esi-runtime-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function sameOrigin(request) {
  try { return new URL(request.url).origin === self.location.origin; } catch (_) { return false; }
}

function isNavigation(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function cacheable(response) {
  return response && response.ok && (response.type === 'basic' || response.type === 'cors');
}

async function put(request, response) {
  if (!cacheable(response)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (_) {}
}

async function network(request) {
  return fetch(request, { cache: 'no-cache' });
}

async function navigation(request) {
  // Never let a broken cached HTML response take priority over a live page.
  try {
    const response = await network(request);
    await put(request, response);
    return response;
  } catch (_) {}

  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const cached = await cache.match(request) || await cache.match(url.pathname);
  if (cached) return cached;

  // A page that has never been visited can still be obtained from the repository.
  try {
    const ghUrl = githubFallbackUrl(url);
    const response = await fetch(ghUrl, { cache: 'no-store', mode: 'cors' });
    if (response.ok) {
      await put(request, response);
      return response;
    }
  } catch (_) {}

  const offline = await cache.match(OFFLINE_URL);
  if (offline) return offline;
  return new Response('Offline', { status: 503, headers: {'Content-Type':'text/plain'} });
}

function githubFallbackUrl(url) {
  let path = url.pathname.replace(/^\/+/, '');
  if (!path || path.endsWith('/')) path += 'index.html';
  return 'https://raw.githubusercontent.com/simonchisom96-alt/elitescholarinstitute/main/' + path;
}

async function asset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await put(request, response);
    return response;
  } catch (_) {}

  try {
    const url = new URL(request.url);
    const response = await fetch(githubFallbackUrl(url), {cache:'no-store', mode:'cors'});
    if (response.ok) {
      await put(request, response);
      return response;
    }
  } catch (_) {}

  throw new Error('ESI asset unavailable');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;
  event.respondWith(isNavigation(request) ? navigation(request) : asset(request));
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
