/* Elite Scholar Institute — independent offline/cache controller 36.2296 */
'use strict';

const BUILD = '36.2296';
const CACHE = 'elite-scholar-v' + BUILD;
const GH_BASE = 'https://raw.githubusercontent.com/simonchisom96-alt/elitescholarinstitute/main/';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('elite-scholar-v') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isCacheable(request, response) {
  return request.method === 'GET' && response && response.ok &&
    (response.type === 'basic' || response.type === 'cors');
}

function isNavigation(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}

function githubUrlFor(request) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/^\/+/, '');
  if (!path || path.endsWith('/')) path += 'index.html';
  return GH_BASE + path;
}

async function cachePut(request, response) {
  if (!isCacheable(request, response)) return;
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  } catch (_) {}
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    await cachePut(request, response);
    return response;
  } catch (_) {}

  const cache = await caches.open(CACHE);
  const cached = await cache.match(request) ||
    await cache.match(new URL(request.url).pathname);
  if (cached) return cached;

  try {
    const gh = await fetch(githubUrlFor(request), { mode: 'cors', cache: 'no-store' });
    if (gh.ok) {
      await cachePut(request, gh);
      return gh;
    }
  } catch (_) {}

  const indexCached = await cache.match('/index.html');
  if (indexCached) return indexCached;

  return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elite Scholar Institute</title><body><h3>You are offline</h3><p>This page has not been cached yet.</p></body>', {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function assetRequest(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await cachePut(request, response);
    return response;
  } catch (_) {
    try {
      const gh = await fetch(githubUrlFor(request), { mode: 'cors', cache: 'no-store' });
      if (gh.ok) {
        await cachePut(request, gh);
        return gh;
      }
    } catch (_) {}
    throw new Error('Resource unavailable');
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!/^https?:$/i.test(new URL(request.url).protocol)) return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(isNavigation(request)
    ? networkFirstNavigation(request)
    : assetRequest(request));
});
