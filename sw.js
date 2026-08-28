const CACHE_NAME = 'elite-scholar-v36.2277';
const OFFLINE_URL = '/offline.html';

const APP_SHELL = [
  '/', '/index.html',
  '/logo.jpg', '/advert.png', '/esi.jpg', '/founder.jpg',
  '/manifest.json', '/offline.html', '/app.js', '/downloader.js',
  '/Textbooks.html', '/uniben.html', '/crstextbook.html', '/literaturetextbook.html',
  '/postutme.html', '/buk.html', '/imsu.html', '/oou.html', '/eksu.html', '/esut.html',
  '/lautech.html', '/aaua.html', '/syllables.html',
  '/Grace.jpg', '/Chuka.jpg', '/325.jpg', '/339.jpg', '/faloke.jpg', '/emma.jpg',
  '/uniport.html', '/unijos.html', '/unimed.html', '/unical.html', '/yabatech.html',
  '/oauth.html', '/luth.html', '/delsu.html',
  '/governmenttextbook.html', '/Englishtextbook.html', '/biologytextbook.html',
  '/chemistrytextbook.html', '/economicstextbook.html', '/physicstextbook.html',
  '/mathematicstextbook.html', '/motivation.html',
  '/chapter2.html', '/chapter3.html', '/chapter4.html', '/chapter5.html',
  '/chapter6.html', '/chapter7.html', '/chapter8.html', '/chapter9.html', '/chapter10.html',
  '/furthermathstextbook.html', '/accountingtextbook.html',
  '/motivation2.html', '/motivation3.html', '/biop.html', '/motivatio.html',
  '/uip.html', '/ulp.html', '/picture.html', '/motivation4.html',
  '/unn.html', '/physicsp.html', '/chemp.html', '/crsp.html', '/englishp.html',
  '/literaturep.html', '/mathematicsp.html', '/governmentp.html', '/economicsp.html',
  '/accountingp.html', '/oau.html', '/notification.html', '/abu.html', '/futa.html',
  '/unilorin.html', '/unizik.html', '/password.js', '/credit.html',
  '/timetable1.jpg', '/timetable2.jpg', '/quiz1.html', '/quiz.html',
  '/video.mp4', '/firebase-config.js', '/multiplayer.js', '/singleplay.js'
];

const SHELL_URLS = APP_SHELL.map(p => new URL(p, self.location.origin).href);

function cleanPath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('.html') ? pathname.slice(0, -5) || '/' : pathname;
}

function isUsable(response) {
  return !!response && response.ok && !response.redirected;
}

async function putBoth(cache, requestedURL, response) {
  if (!isUsable(response)) throw new Error(`HTTP ${response && response.status}`);
  const url = new URL(requestedURL);
  const canonicalPath = cleanPath(url.pathname);
  const canonicalURL = new URL(canonicalPath, self.location.origin);
  canonicalURL.search = url.search;

  await cache.put(requestedURL, response.clone());
  await cache.put(canonicalURL.href, response.clone());

  if (url.pathname === '/' || url.pathname === '/index.html') {
    await cache.put(new URL('/', self.location.origin).href, response.clone());
    await cache.put(new URL('/index.html', self.location.origin).href, response.clone());
  }
}

async function downloadShell(path) {
  const requested = new URL(path, self.location.origin);
  const canonical = new URL(cleanPath(requested.pathname), self.location.origin);
  canonical.search = requested.search;

  // Ask Pages for the canonical extensionless document, then cache the real 200 response
  // under both the .html and extensionless URLs. Never cache a redirect response.
  const target = requested.pathname.toLowerCase().endsWith('.html') ? canonical : requested;
  const response = await fetch(new Request(target.href, {
    method: 'GET',
    cache: 'reload',
    redirect: 'follow'
  }));

  if (!isUsable(response)) throw new Error(`Failed to download ${path}: HTTP ${response.status}`);
  const cache = await caches.open(CACHE_NAME);
  await putBoth(cache, requested.href, response);
}

async function verifyShell() {
  const cache = await caches.open(CACHE_NAME);
  for (const path of APP_SHELL) {
    const requested = new URL(path, self.location.origin);
    let hit = await cache.match(requested.href, {ignoreSearch: true});
    if (!isUsable(hit)) {
      const canonical = new URL(cleanPath(requested.pathname), self.location.origin);
      hit = await cache.match(canonical.href, {ignoreSearch: true});
    }
    if (!isUsable(hit)) return false;
  }
  return true;
}

async function broadcast(data) {
  const list = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
  list.forEach(client => client.postMessage(data));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Remove only this version's stale entries, then download every shell item individually.
    const cache = await caches.open(CACHE_NAME);
    for (const path of APP_SHELL) {
      await cache.delete(new URL(path, self.location.origin).href);
    }

    let completed = 0;
    for (const path of APP_SHELL) {
      await downloadShell(path);
      completed++;
      await broadcast({
        type: 'DOWNLOAD_PROGRESS',
        completed,
        total: APP_SHELL.length,
        percent: Math.round(completed / APP_SHELL.length * 100)
      });
    }

    if (!await verifyShell()) throw new Error('APP SHELL VERIFICATION FAILED');
    await broadcast({type: 'DOWNLOAD_SUCCESS', completed: APP_SHELL.length, total: APP_SHELL.length, percent: 100});
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
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
      const complete = await verifyShell();
      await broadcast(complete
        ? {type: 'DOWNLOAD_SUCCESS', completed: APP_SHELL.length, total: APP_SHELL.length, percent: 100}
        : {type: 'DOWNLOAD_INCOMPLETE'});
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // CACHE FIRST for every same-origin asset. Anything successfully fetched is cached
  // automatically, including images, CSS, JS, fonts, PDFs and media requested later.
  if (request.destination !== 'document' && request.mode !== 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, {ignoreSearch: true});
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (isUsable(response)) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        return cached || Response.error();
      }
    })());
    return;
  }

  // Navigation: CACHE FIRST. Resolve both /page.html and /page so Cloudflare Pages
  // extensionless routing cannot trap the browser in a redirect/offline failure.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const requested = new URL(request.url);
    const candidates = [];

    const add = href => { if (!candidates.includes(href)) candidates.push(href); };
    add(requested.href);

    const canonical = new URL(cleanPath(requested.pathname), self.location.origin);
    canonical.search = requested.search;
    add(canonical.href);

    if (requested.pathname === '/' || requested.pathname === '/index.html') {
      add(new URL('/index.html', self.location.origin).href);
      add(new URL('/', self.location.origin).href);
    }

    for (const href of candidates) {
      const cached = await cache.match(href, {ignoreSearch: true});
      if (isUsable(cached)) return cached;
    }

    // If not cached, fetch the canonical path and cache the successful final response
    // under the requested and canonical aliases for future offline use.
    try {
      const target = requested.pathname.toLowerCase().endsWith('.html') ? canonical : requested;
      const response = await fetch(new Request(target.href, {
        method: 'GET',
        headers: request.headers,
        redirect: 'follow'
      }));

      if (isUsable(response)) {
        await putBoth(cache, requested.href, response);
        return response;
      }
      return response;
    } catch (error) {
      const offline = await cache.match(new URL(OFFLINE_URL, self.location.origin).href);
      return offline || Response.error();
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url
    ? event.notification.data.url : '/';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    for (const client of list) {
      if (client.url.startsWith(self.location.origin)) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
