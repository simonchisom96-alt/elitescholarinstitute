const CACHE_NAME = 'elite-scholar-v36.2278';
const OFFLINE_URL = '/offline.html';

// Precache the complete application shell. Resources not listed here are still
// cached automatically the first time the app successfully requests them.
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

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function usable(response) {
  return !!response && response.ok;
}

function htmlAlias(pathname) {
  if (!pathname || pathname === '/') return '/index.html';
  return pathname.endsWith('.html') ? pathname : pathname + '.html';
}

async function cacheResponse(cache, url, response) {
  if (usable(response)) await cache.put(url, response.clone());
}

async function precacheOne(cache, path) {
  const requested = new URL(path, self.location.origin);

  // Always request the actual file for an HTML shell. This avoids depending on
  // Cloudflare's extensionless redirect behavior during installation.
  const fetchURL = requested.pathname === '/'
    ? new URL('/index.html', self.location.origin)
    : requested.pathname.endsWith('.html')
      ? requested
      : requested;

  const response = await fetch(new Request(fetchURL.href, {
    method: 'GET',
    cache: 'reload',
    redirect: 'follow'
  }));

  if (!usable(response)) {
    throw new Error(`Shell download failed: ${path} (${response.status})`);
  }

  await cacheResponse(cache, requested.href, response);

  // Keep / and /index.html interchangeable without ever storing a redirect.
  if (requested.pathname === '/') {
    await cacheResponse(cache, new URL('/index.html', self.location.origin).href, response);
    await cacheResponse(cache, new URL('/', self.location.origin).href, response);
  }
}

async function verifyShell() {
  const cache = await caches.open(CACHE_NAME);
  for (const path of APP_SHELL) {
    const requested = new URL(path, self.location.origin);
    let hit = await cache.match(requested.href, {ignoreSearch: true});

    // / is satisfied by index.html as well.
    if (!usable(hit) && requested.pathname === '/') {
      hit = await cache.match(new URL('/index.html', self.location.origin).href);
    }

    if (!usable(hit)) return false;
  }
  return true;
}

async function notifyClients(message) {
  const clientsList = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
  clientsList.forEach(client => client.postMessage(message));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    let completed = 0;

    // Every shell item must succeed. If one fails, installation fails rather than
    // pretending that the app was fully downloaded.
    for (const path of APP_SHELL) {
      await precacheOne(cache, path);
      completed++;
      await notifyClients({
        type: 'DOWNLOAD_PROGRESS',
        completed,
        total: APP_SHELL.length,
        percent: Math.round((completed / APP_SHELL.length) * 100)
      });
    }

    if (!(await verifyShell())) {
      throw new Error('APP SHELL VERIFICATION FAILED');
    }

    await notifyClients({
      type: 'DOWNLOAD_SUCCESS',
      completed: APP_SHELL.length,
      total: APP_SHELL.length,
      percent: 100
    });

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    );
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
      await notifyClients(complete
        ? {type: 'DOWNLOAD_SUCCESS', completed: APP_SHELL.length, total: APP_SHELL.length, percent: 100}
        : {type: 'DOWNLOAD_INCOMPLETE'}
      );
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!sameOrigin(url)) return;

  // CACHE FIRST for images, JS, CSS, fonts, PDFs, media and every other
  // same-origin non-document request. A successful network response is cached
  // automatically, so resources outside APP_SHELL become available offline
  // after the user visits them once.
  if (request.mode !== 'navigate' && request.destination !== 'document') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, {ignoreSearch: true});
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (usable(response)) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        return Response.error();
      }
    })());
    return;
  }

  // CACHE FIRST navigation. Exact URL first, then its .html counterpart.
  // This deliberately avoids the old extension-stripping -> extensionless-fetch
  // behavior that could trigger Cloudflare redirect failures on back navigation.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const candidates = [];

    const add = href => {
      if (!candidates.includes(href)) candidates.push(href);
    };

    add(url.href);

    if (url.pathname === '/') {
      add(new URL('/index.html', self.location.origin).href);
    } else if (!url.pathname.endsWith('.html')) {
      add(new URL(htmlAlias(url.pathname), self.location.origin).href);
    } else {
      add(new URL(url.pathname.slice(0, -5) || '/', self.location.origin).href);
    }

    for (const candidate of candidates) {
      const cached = await cache.match(candidate, {ignoreSearch: true});
      if (usable(cached)) return cached;
    }

    // Not cached yet: fetch the real HTML path, then cache the successful final
    // response under both the requested URL and the .html alias.
    try {
      let target;
      if (url.pathname === '/') target = new URL('/index.html', self.location.origin);
      else if (url.pathname.endsWith('.html')) target = url;
      else target = new URL(htmlAlias(url.pathname), self.location.origin);

      const response = await fetch(new Request(target.href, {
        method: 'GET',
        headers: request.headers,
        redirect: 'follow'
      }));

      if (usable(response)) {
        await cache.put(url.href, response.clone());
        await cache.put(target.href, response.clone());
        if (url.pathname === '/') {
          await cache.put(new URL('/index.html', self.location.origin).href, response.clone());
        }
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
    ? event.notification.data.url
    : '/';

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
