/* ESI SW diagnostic — disables service-worker control and clears ESI caches. */
'use strict';
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('elite-scholar-v')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for (const client of clients) {
      try { await client.navigate(client.url); } catch (_) {}
    }
  })());
});
self.addEventListener('fetch', () => {});
