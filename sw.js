const CACHE_NAME = 'elite-scholar-v36.2276';
const OFFLINE_URL = '/offline.html';

const APP_SHELL = [
  '/',
  '/index.html',

  '/logo.jpg',
  '/advert.png',
  '/esi.jpg',
  '/founder.jpg',

  '/manifest.json',
  '/offline.html',

  '/app.js',
  '/downloader.js',

  '/Textbooks.html',
  '/uniben.html',
  '/crstextbook.html',
  '/literaturetextbook.html',
  '/postutme.html',
  '/buk.html',
  '/imsu.html',
  '/oou.html',
  '/eksu.html',
  '/esut.html',
  '/lautech.html',
  '/aaua.html',
  '/syllables.html',

  '/Grace.jpg',
  '/Chuka.jpg',
  '/325.jpg',
  '/339.jpg',
  '/faloke.jpg',
  '/emma.jpg',

  '/uniport.html',
  '/unijos.html',
  '/unimed.html',
  '/unical.html',
  '/yabatech.html',
  '/oauth.html',
  '/luth.html',
  '/delsu.html',

  '/governmenttextbook.html',
  '/Englishtextbook.html',
  '/biologytextbook.html',
  '/chemistrytextbook.html',
  '/economicstextbook.html',
  '/physicstextbook.html',
  '/mathematicstextbook.html',

  '/motivation.html',
  '/chapter2.html',
  '/chapter3.html',
  '/chapter4.html',
  '/chapter5.html',
  '/chapter6.html',
  '/chapter7.html',
  '/chapter8.html',
  '/chapter9.html',
  '/chapter10.html',

  '/furthermathstextbook.html',
  '/accountingtextbook.html',

  '/motivation2.html',
  '/motivation3.html',
  '/biop.html',
  '/motivatio.html',
  '/uip.html',
  '/ulp.html',
  '/picture.html',
  '/motivation4.html',

  '/unn.html',
  '/physicsp.html',
  '/chemp.html',
  '/crsp.html',
  '/englishp.html',
  '/literaturep.html',
  '/mathematicsp.html',
  '/governmentp.html',
  '/economicsp.html',
  '/accountingp.html',

  '/oau.html',
  '/notification.html',
  '/abu.html',
  '/futa.html',
  '/unilorin.html',
  '/unizik.html',

  '/password.js',
  '/credit.html',

  '/timetable1.jpg',
  '/timetable2.jpg',

  '/quiz1.html',
  '/quiz.html',

  '/video.mp4',

  '/firebase-config.js',
  '/multiplayer.js',
  '/singleplay.js'
];

function isUsableResponse(response) {
  return response &&
         response.ok &&
         !response.redirected;
}

function isHTMLPath(pathname) {
  return pathname.toLowerCase().endsWith('.html');
}

function removeHTML(pathname) {
  if (isHTMLPath(pathname)) {
    return pathname.slice(0, -5) || '/';
  }

  return pathname || '/';
}

function addHTML(pathname) {
  if (
    pathname === '/' ||
    pathname.endsWith('/') ||
    pathname.includes('.')
  ) {
    return pathname;
  }

  return pathname + '.html';
}

function makeURL(pathname, search = '') {
  const url = new URL(pathname || '/', self.location.origin);
  url.search = search || '';
  return url;
}

/*
 * Fetch one shell file without allowing Cloudflare's
 * extensionless redirect response to become the cached response.
 *
 * For .html files we deliberately request the extensionless
 * Cloudflare URL because Pages may redirect:
 *
 *   /Textbooks.html -> /Textbooks
 *
 * The final 200 response is then cached under BOTH names.
 */
async function downloadShellFile(path) {
  const originalURL = makeURL(path);

  const canonicalPath = removeHTML(originalURL.pathname);
  const canonicalURL = makeURL(canonicalPath, originalURL.search);

  let response;

  /*
   * For HTML files use the canonical extensionless URL.
   * This avoids caching Cloudflare's 308 redirect.
   */
  if (isHTMLPath(originalURL.pathname)) {
    response = await fetch(
      new Request(canonicalURL.href, {
        method: 'GET',
        cache: 'reload',
        redirect: 'follow'
      })
    );
  } else {
    response = await fetch(
      new Request(originalURL.href, {
        method: 'GET',
        cache: 'reload',
        redirect: 'follow'
      })
    );
  }

  if (!isUsableResponse(response)) {
    throw new Error(
      `Failed to download ${path}: HTTP ${response.status}`
    );
  }

  const cache = await caches.open(CACHE_NAME);

  /*
   * Cache the actual response under the exact APP_SHELL
   * path AND the canonical Cloudflare path.
   */
  await cache.put(originalURL.href, response.clone());

  if (canonicalURL.href !== originalURL.href) {
    await cache.put(canonicalURL.href, response.clone());
  }

  /*
   * Root and index.html should both resolve to the same
   * actual index document.
   */
  if (originalURL.pathname === '/' ||
      originalURL.pathname === '/index.html') {

    await cache.put('/index.html', response.clone());
    await cache.put('/', response.clone());
  }

  return true;
}

/*
 * Verify every APP_SHELL entry individually.
 * This prevents a cache-count trick from saying "complete"
 * when one particular file is actually missing.
 */
async function verifyAppShell() {
  const cache = await caches.open(CACHE_NAME);

  for (const path of APP_SHELL) {
    const url = makeURL(path);

    let response = await cache.match(url.href, {
      ignoreSearch: true
    });

    /*
     * HTML aliases are also accepted if the response is
     * stored under the canonical extensionless path.
     */
    if (!isUsableResponse(response)) {
      const canonicalURL = makeURL(
        removeHTML(url.pathname),
        url.search
      );

      response = await cache.match(canonicalURL.href, {
        ignoreSearch: true
      });
    }

    if (!isUsableResponse(response)) {
      return false;
    }
  }

  return true;
}

/*
 * Tell every open ESI page how much of the shell is complete.
 */
async function sendDownloadProgress(completed) {
  const clientsList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  const total = APP_SHELL.length;

  clientsList.forEach(client => {
    client.postMessage({
      type: 'DOWNLOAD_PROGRESS',
      completed,
      total,
      percent: Math.round((completed / total) * 100)
    });
  });
}

async function sendDownloadSuccess() {
  const clientsList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  clientsList.forEach(client => {
    client.postMessage({
      type: 'DOWNLOAD_SUCCESS',
      completed: APP_SHELL.length,
      total: APP_SHELL.length,
      percent: 100
    });
  });
}

/*
 * INSTALL
 *
 * Every shell entry is downloaded explicitly.
 *
 * We do NOT use cache.addAll() because one Cloudflare
 * redirect/missing response can make the whole operation
 * fail in a way that is difficult to diagnose.
 */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    /*
     * Start clean for this version.
     */
    await Promise.all(
      APP_SHELL.map(async path => {
        const url = makeURL(path);

        /*
         * Remove an old copy of the exact URL before
         * downloading the new one.
         */
        await cache.delete(url.href);
      })
    );

    let completed = 0;

    for (const path of APP_SHELL) {
      try {
        await downloadShellFile(path);

        completed++;
        await sendDownloadProgress(completed);

      } catch (error) {
        console.error(
          '[ESI SW] APP SHELL DOWNLOAD FAILED:',
          path,
          error
        );

        /*
         * IMPORTANT:
         * Do not activate a partially downloaded shell.
         */
        throw error;
      }
    }

    const complete = await verifyAppShell();

    if (!complete) {
      throw new Error(
        '[ESI SW] APP SHELL VERIFICATION FAILED'
      );
    }

    await sendDownloadSuccess();

    /*
     * Activate immediately.
     */
    await self.skipWaiting();
  })());
});

/*
 * ACTIVATE
 *
 * Delete every old ESI cache version.
 */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }

        return Promise.resolve(false);
      })
    );

    await self.clients.claim();
  })());
});

/*
 * Messages from app.js / downloader.js
 */
self.addEventListener('message', event => {
  const data = event.data;

  if (data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  if (data && data.type === 'CHECK_DOWNLOAD_COMPLETE') {
    event.waitUntil((async () => {
      const complete = await verifyAppShell();

      if (complete) {
        await sendDownloadSuccess();
      }
    })());

    return;
  }
});

/*
 * Notifications
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetURL = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({
      type: 'window'
    }).then(async list => {

      for (const client of list) {
        if (client.url.startsWith(self.location.origin)) {
          await client.navigate(targetURL);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetURL);
    })
  );
});

/*
 * FETCH
 *
 * MAIN RULE:
 *
 * CACHE FIRST.
 *
 * Network is only touched when there is no usable cached
 * response.
 */
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  /*
   * Only handle our own origin.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
   * Only GET requests are cacheable here.
   */
  if (request.method !== 'GET') {
    return;
  }

  /*
   * NAVIGATION REQUESTS
   */
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      const originalURL = makeURL(
        url.pathname,
        url.search
      );

      const canonicalPath = removeHTML(url.pathname);

      const canonicalURL = makeURL(
        canonicalPath,
        url.search
      );

      const htmlURL = makeURL(
        addHTML(canonicalPath),
        url.search
      );

      /*
       * 1. Exact URL.
       */
      let cached = await cache.match(originalURL.href, {
        ignoreSearch: true
      });

      if (isUsableResponse(cached)) {
        return cached;
      }

      /*
       * 2. Canonical extensionless URL.
       *
       * Example:
       * /postutme.html
       *        ->
       * /postutme
       */
      if (canonicalURL.href !== originalURL.href) {
        cached = await cache.match(canonicalURL.href, {
          ignoreSearch: true
        });

        if (isUsableResponse(cached)) {
          return cached;
        }
      }

      /*
       * 3. HTML version.
       *
       * Example:
       * /postutme
       *        ->
       * /postutme.html
       */
      if (htmlURL.href !== originalURL.href &&
          htmlURL.href !== canonicalURL.href) {

        cached = await cache.match(htmlURL.href, {
          ignoreSearch: true
        });

        if (isUsableResponse(cached)) {
          return cached;
        }
      }

      /*
       * 4. Index fallback.
       */
      if (
        canonicalPath === '/' ||
        canonicalPath === '/index.html'
      ) {
        cached = await cache.match('/index.html');

        if (isUsableResponse(cached)) {
          return cached;
        }
      }

      /*
       * 5. Network fallback.
       *
       * Follow Cloudflare redirects, but NEVER return a
       * redirect response from the service worker.
       */
      try {
        const networkURL = isHTMLPath(url.pathname)
          ? canonicalURL
          : originalURL;

        const response = await fetch(
          new Request(networkURL.href, {
            method: 'GET',
            headers: request.headers,
            redirect: 'follow'
          })
        );

        if (isUsableResponse(response)) {
          /*
           * Cache the successful final document.
           */
          await cache.put(
            networkURL.href,
            response.clone()
          );

          await cache.put(
            originalURL.href,
            response.clone()
          );

          if (
            canonicalURL.href !== networkURL.href &&
            canonicalURL.href !== originalURL.href
          ) {
            await cache.put(
              canonicalURL.href,
              response.clone()
            );
          }

          return response;
        }

        /*
         * HTTP error: try offline page.
         */
        const offline = await cache.match(OFFLINE_URL);

        if (offline) {
          return offline;
        }

        return response;

      } catch (error) {
        console.warn(
          '[ESI SW] Navigation network failed:',
          error
        );

        const offline = await cache.match(OFFLINE_URL);

        if (offline) {
          return offline;
        }

        /*
         * Last chance: index.
         */
        const index = await cache.match('/index.html');

        if (index) {
          return index;
        }

        throw error;
      }
    })());

    return;
  }

  /*
   * NON-NAVIGATION ASSETS
   *
   * CACHE FIRST.
   *
   * This includes:
   * images
   * JavaScript
   * CSS
   * video
   * fonts
   * other same-origin GET resources
   */
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    /*
     * First choice: cached response.
     */
    let cached = await cache.match(request, {
      ignoreSearch: true
    });

    if (isUsableResponse(cached)) {
      return cached;
    }

    /*
     * Not cached -> network.
     */
    try {
      const response = await fetch(request);

      if (isUsableResponse(response)) {
        /*
         * Dynamically cache assets that weren't part
         * of APP_SHELL.
         */
        await cache.put(
          request,
          response.clone()
        );
      }

      return response;

    } catch (error) {
      /*
       * If the network fails, try any cached equivalent.
       */
      cached = await cache.match(request, {
        ignoreSearch: true
      });

      if (cached) {
        return cached;
      }

      throw error;
    }
  })());
});
