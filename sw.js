const CACHE_NAME = 'elite-scholar-v36.2280';
const OFFLINE_URL = '/offline.html';

const APP_SHELL = [
  '/', '/index.html',
  '/logo.jpg', '/advert.png', '/esi.jpg', '/founder.jpg', '/manifest.json', '/offline.html',
  '/app.js', '/downloader.js',
  '/Textbooks.html', '/uniben.html', '/crstextbook.html', '/literaturetextbook.html',
  '/postutme.html', '/buk.html', '/imsu.html', '/oou.html', '/eksu.html', '/esut.html',
  '/lautech.html', '/aaua.html', '/syllables.html',
  '/Grace.jpg', '/Chuka.jpg', '/325.jpg', '/339.jpg', '/faloke.jpg', '/emma.jpg',
  '/uniport.html', '/unijos.html', '/unimed.html', '/unical.html', '/yabatech.html',
  '/oauth.html', '/luth.html', '/delsu.html',
  '/governmenttextbook.html', '/Englishtextbook.html', '/biologytextbook.html',
  '/chemistrytextbook.html', '/economicstextbook.html', '/physicstextbook.html',
  '/mathematicstextbook.html', '/motivation.html',
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

const sameOrigin = url => url.origin === self.location.origin;
const good = response => response && response.ok;
const absolute = path => new URL(path, self.location.origin).href;

function htmlCandidates(url) {
  const out = [url.href];
  const path = url.pathname;
  if (path === '/' || path === '') out.push(absolute('/index.html'));
  else if (path.endsWith('.html')) out.push(absolute(path.slice(0, -5) || '/'));
  else out.push(absolute(path + '.html'));
  return [...new Set(out)];
}

async function precacheItem(cache, path) {
  const requested = new URL(path, self.location.origin);
  const target = requested.pathname === '/' ? absolute('/index.html') : requested.href;
  const response = await fetch(new Request(target, {
    method: 'GET', cache: 'reload', redirect: 'follow'
  }));
  if (!good(response)) throw new Error(`Precache failed: ${path} (${response.status})`);
  await cache.put(requested.href, response.clone());
  if (requested.pathname === '/') await cache.put(absolute('/index.html'), response.clone());
}

async function shellComplete() {
  const cache = await caches.open(CACHE_NAME);
  for (const path of APP_SHELL) {
    const url = new URL(path, self.location.origin);
    let hit = await cache.match(url.href, { ignoreSearch: true });
    if (!good(hit) && url.pathname === '/') hit = await cache.match(absolute('/index.html'), { ignoreSearch: true });
    if (!good(hit)) return false;
  }
  return true;
}

async function tellClients(message) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  list.forEach(client => client.postMessage(message));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    let completed = 0;
    for (const path of APP_SHELL) {
      await precacheItem(cache, path);
      completed++;
      await tellClients({
        type: 'DOWNLOAD_PROGRESS', completed, total: APP_SHELL.length,
        percent: Math.round(completed * 100 / APP_SHELL.length)
      });
    }
    if (!(await shellComplete())) throw new Error('Application shell verification failed');
    await tellClients({ type: 'DOWNLOAD_SUCCESS', completed: APP_SHELL.length, total: APP_SHELL.length, percent: 100 });
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
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
      const complete = await shellComplete();
      await tellClients(complete
        ? { type: 'DOWNLOAD_SUCCESS', completed: APP_SHELL.length, total: APP_SHELL.length, percent: 100 }
        : { type: 'DOWNLOAD_INCOMPLETE' });
    })());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!sameOrigin(url)) return;

  // Cache-first for every same-origin asset. A successful network miss is cached,
  // including images and files that are not part of APP_SHELL.
  if (request.mode !== 'navigate' && request.destination !== 'document') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (good(response)) await cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  // Cache-first HTML navigation. No forced reload and no controllerchange reload:
  // this prevents the blank-page/back-navigation failure.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const candidate of htmlCandidates(url)) {
      const cached = await cache.match(candidate, { ignoreSearch: true });
      if (good(cached)) return cached;
    }

    try {
      const target = url.pathname === '/'
        ? absolute('/index.html')
        : url.pathname.endsWith('.html') ? url.href : absolute(url.pathname + '.html');
      const response = await fetch(new Request(target, {
        method: 'GET', headers: request.headers, redirect: 'follow'
      }));
      if (good(response)) {
        await cache.put(url.href, response.clone());
        await cache.put(target, response.clone());
        if (url.pathname === '/') await cache.put(absolute('/index.html'), response.clone());
      }
      return response;
    } catch {
      const offline = await cache.match(absolute(OFFLINE_URL), { ignoreSearch: true });
      return offline || Response.error();
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
      if (client.url.startsWith(self.location.origin)) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
