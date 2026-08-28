/* Elite Scholar Institute — Cloudflare + GitHub progressive offline worker 36.2296 */
'use strict';

const BUILD = '36.2296';
const CACHE_NAME = `elite-scholar-v${BUILD}`;
const OFFLINE_URL = '/offline.html';

// GitHub is the master copy. Cloudflare remains the normal public origin.
// GitHub is used only when the same-origin request cannot be obtained.
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/simonchisom96-alt/elitescholarinstitute/main/';

const sameOrigin = request => {
  try { return new URL(request.url).origin === self.location.origin; } catch (_) { return false; }
};

const absolute = path => new URL(path, self.location.origin).href;

function githubUrl(requestUrl) {
  try {
    const u = new URL(requestUrl, self.location.origin);
    let path = decodeURIComponent(u.pathname || '/');
    if (path === '/' || path === '') path = '/index.html';
    path = path.replace(/^\/+/, '');
    return GITHUB_RAW_BASE + path;
  } catch (_) {
    return null;
  }
}

async function cacheResponse(cache, request, response) {
  if (!response || !response.ok) return false;
  try {
    await cache.put(request, response.clone());
    return true;
  } catch (_) {
    return false;
  }
}

async function networkFetch(request) {
  try {
    const response = await fetch(request, { cache: 'no-store', redirect: 'follow' });
    if (response && response.ok) return response;
    return null;
  } catch (_) {
    return null;
  }
}

async function githubFetch(request) {
  const url = githubUrl(request.url);
  if (!url) return null;
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      redirect: 'follow'
    });
    if (response && response.ok) return response;
  } catch (_) {}
  return null;
}

async function getFreshOrGithub(cache, request) {
  let response = await networkFetch(request);
  if (response) {
    await cacheResponse(cache, request, response);
    return response;
  }

  response = await githubFetch(request);
  if (response) {
    await cacheResponse(cache, request, response);
    return response;
  }

  return null;
}

async function warmShell() {
  const cache = await caches.open(CACHE_NAME);
  const shell = ['/', '/index.html', '/offline.html', '/manifest.json', '/app.js', '/downloader.js', '/logo.jpg'];
  let complete = 0;

  for (const path of shell) {
    const request = new Request(absolute(path), { method: 'GET' });
    if (await cache.match(request, { ignoreSearch: true })) {
      complete++;
      continue;
    }
    if (await getFreshOrGithub(cache, request)) complete++;
  }

  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage({
    type: complete === shell.length ? 'DOWNLOAD_SUCCESS' : 'DOWNLOAD_PARTIAL',
    complete,
    total: shell.length,
    build: BUILD
  }));
}

self.addEventListener('install', event => {
  // Never block activation on downloading the site.
  event.waitUntil((async () => {
    await caches.open(CACHE_NAME);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith('elite-scholar-v') && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());

  // Warm in the background; activation is already complete.
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
          const request = new Request(new URL(raw, self.location.origin).href, { method: 'GET' });
          if (sameOrigin(request)) await getFreshOrGithub(cache, request);
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
    const isDocument = request.mode === 'navigate' || request.destination === 'document';

    // Documents use network-first so a broken/stale cached index can never trap
    // the user while online. A successful response is immediately cached.
    if (isDocument) {
      const fresh = await getFreshOrGithub(cache, request);
      if (fresh) return fresh;

      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      const offline = await cache.match(absolute(OFFLINE_URL), { ignoreSearch: true });
      if (offline) return offline;

      return new Response(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elite Scholar Institute</title><body><h1>Elite Scholar Institute</h1><p>This page is unavailable right now. Reconnect and try again.</p></body>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Non-document resources are cache-first, then progressively fetched and cached.
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    const fresh = await getFreshOrGithub(cache, request);
    if (fresh) return fresh;

    return new Response('', { status: 504, statusText: 'Offline' });
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
