/* Elite Scholar Institute — Firebase Cloud Messaging service worker */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDkjELsB4qeaumvsMAIDGIFZgNzl6eoBPM',
  authDomain: 'elite-notification.firebaseapp.com',
  databaseURL: 'https://elite-notification-default-rtdb.firebaseio.com',
  projectId: 'elite-notification',
  storageBucket: 'elite-notification.firebasestorage.app',
  messagingSenderId: '359910414254',
  appId: '1:359910414254:web:a1bafd3e23fd554a975a3f'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = data.title || notification.title || 'Elite Scholar Institute';
  const body = data.body || notification.body || 'You have a new notification.';
  const path = data.path || '/notification.html';

  self.registration.showNotification(title, {
    body,
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    data: { path }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification?.data?.path || '/notification.html';
  const target = new URL(path, self.location.origin).href;

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
