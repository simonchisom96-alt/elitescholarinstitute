/* Elite Scholar Institute — clean offline engine 36.2301 */
'use strict';

const BUILD = '36.2301';
const CACHE_NAME = 'esi-runtime-' + BUILD;
const OFFLINE_URL = '/offline.html';
const GITHUB_ROOT = 'https://raw.githubusercontent.com/simonchisom96-alt/elitescholarinstitute/main/';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.add(new Request(OFFLINE_URL, { cache: 'no-store' })); } catch (_) {}
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

const ownRequest = request => {
  try { return new URL(request.url).origin === self.location.origin; } catch (_) { return false; }
};
const navigation = request => request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
const good = response => !!response && response.ok && (response.type === 'basic' || response.type === 'cors');

async function save(request, response) {
  if (!good(response)) return;
  try { const c = await caches.open(CACHE_NAME); await c.put(request, response.clone()); } catch (_) {}
}

function githubUrl(request) {
  const u = new URL(request.url);
  let path = u.pathname.replace(/^\/+/, '');
  if (!path || path.endsWith('/')) path += 'index.html';
  return GITHUB_ROOT + path;
}

async function navigationRequest(request) {
  // Always try the live Cloudflare page first. This prevents stale/broken HTML
  // from becoming the normal response after a deployment.
  try {
    const live = await fetch(request, { cache: 'no-store', redirect: 'follow' });
    if (live.ok) { await save(request, live); return live; }
  } catch (_) {}

  // If Cloudflare is unavailable, use the exact page previously cached.
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const cached = await cache.match(request) || await cache.match(url.pathname);
  if (cached) return cached;

  // Last-resort GitHub copy of the exact requested path.
  try {
    const source = await fetch(githubUrl(request), { cache: 'no-store', mode: 'cors' });
    if (source.ok) { await save(request, source); return source; }
  } catch (_) {}

  const offline = await cache.match(OFFLINE_URL);
  if (offline) return offline;
  return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elite Scholar Institute</title><body><h3>Offline</h3><p>This page has not been cached yet.</p></body>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function resourceRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const live = await fetch(request, { redirect: 'follow' });
    if (good(live)) await save(request, live);
    return live;
  } catch (_) {}

  // Same-origin assets that were not previously cached can be recovered from GitHub.
  try {
    const source = await fetch(githubUrl(request), { cache: 'no-store', mode: 'cors' });
    if (source.ok) { await save(request, source); return source; }
  } catch (_) {}

  return new Response('', { status: 504, statusText: 'Offline' });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !ownRequest(request)) return;
  event.respondWith(navigation(request) ? navigationRequest(request) : resourceRequest(request));
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const raw of event.data.urls) {
        try {
          const url = new URL(raw, self.location.origin);
          if (url.origin !== self.location.origin) continue;
          const response = await fetch(new Request(url.href, { method:'GET', cache:'no-store' }));
          if (good(response)) await cache.put(url.href, response.clone());
        } catch (_) {}
      }
    })());
  }
});
