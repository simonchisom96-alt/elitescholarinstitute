/* Elite Scholar Institute — FCM web client bridge */
(() => {
  'use strict';

  const FCM_SENDER_URL = window.ESI_FCM_SENDER_URL || 'https://esi-fcm.onrender.com/send';
  const FCM_REGISTER_URL = FCM_SENDER_URL.replace(/\/send\/?$/, '/register');
  const VAPID_KEY = 'BJGp_RkyA76f90dCB3wu4egPaJFhVK2LmSIwvW_TIyt9SEyqqJT12NAxYnKikHrcFFa8Ie2YVFpR29PlETx4bwM';
  const MESSAGING_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js';
  let messagingReady = null;

  function loadMessagingSdk() {
    if (window.firebase?.messaging) return Promise.resolve();
    if (window.__esiMessagingSdkPromise) return window.__esiMessagingSdkPromise;
    window.__esiMessagingSdkPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = MESSAGING_SDK;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Firebase Messaging SDK failed to load'));
      document.head.appendChild(s);
    });
    return window.__esiMessagingSdkPromise;
  }

  async function getFirebaseApp() {
    if (!window.firebase?.apps) throw new Error('Firebase is not ready');
    return firebase.apps.find(a => a.name === 'notifications') || firebase.app();
  }

  async function registerMessagingWorker() {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers are not supported');
    return navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });
  }

  async function getMessagingInstance() {
    if (!messagingReady) {
      messagingReady = (async () => {
        await loadMessagingSdk();
        const app = await getFirebaseApp();
        return firebase.messaging(app);
      })();
    }
    return messagingReady;
  }

  async function registerWebPush() {
    if (!window.isSecureContext || !('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    const messaging = await getMessagingInstance();
    const sw = await registerMessagingWorker();
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
    if (!token) return false;

    const response = await fetch(FCM_REGISTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!response.ok) throw new Error('FCM registration returned HTTP ' + response.status);

    localStorage.setItem('esi_fcm_web_registered', '1');
    return true;
  }

  async function requestPushAndRegister() {
    if (!('Notification' in window)) {
      if (typeof window.showToast === 'function') window.showToast('Push notifications are not supported here', '#dc2626');
      return;
    }
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission !== 'granted') {
      if (typeof window.showToast === 'function') window.showToast('Notification permission denied', '#dc2626');
      return;
    }
    try {
      await registerWebPush();
      if (typeof window.showToast === 'function') window.showToast('Push notifications enabled ✓', '#2563eb');
    } catch (error) {
      console.warn('[ESI FCM] registration failed', error);
      if (typeof window.showToast === 'function') window.showToast('Push setup could not be completed yet', '#dc2626');
    }
  }

  async function sendFcm(title, body, path) {
    const user = window.firebase?.auth?.()?.currentUser;
    if (!user || user.email !== 'admin@elitescholarinstitute.app') {
      throw new Error('Admin Firebase session is required');
    }
    const idToken = await user.getIdToken();
    const response = await fetch(FCM_SENDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify({ title, body, path })
    });
    if (!response.ok) throw new Error('FCM sender returned HTTP ' + response.status);
    return response.json();
  }

  function previewFor(data) {
    if (data.type === 'poll' && data.poll) return '📊 New poll, vote now: ' + (data.poll.question || '');
    if (data.type === 'quiz' && data.quiz) return '💡 New quiz, answer now: ' + (data.quiz.question || '');
    if (data.type === 'image') return '🖼️ New Image Update, View now: ' + (data.text || '');
    return data.text || 'New announcement 📢, read now';
  }

  function titleFor(data) {
    if (data.type === 'poll') return 'Elite Scholar Institute — New Poll';
    if (data.type === 'quiz') return 'Elite Scholar Institute — New Quiz';
    if (data.type === 'image') return 'Elite Scholar Institute — New Image';
    return 'Elite Scholar Institute — New Announcement';
  }

  function installPushBridge() {
    const originalRequestPush = window.requestPush;
    window.requestPush = requestPushAndRegister;
    window.esiRegisterFcmWeb = registerWebPush;

    if (typeof window.pushNotif === 'function') {
      window.pushNotif = function(data) {
        const db = window.firebase?.database?.();
        if (!db) {
          if (typeof window.showToast === 'function') window.showToast('Firebase is not ready', '#dc2626');
          return;
        }
        const ref = db.ref('notifications').push(data);
        ref.then(async () => {
          try {
            await sendFcm(titleFor(data), previewFor(data).slice(0, 2000), '/notification.html');
            if (typeof window.showToast === 'function') window.showToast('Broadcast sent successfully ✓', '#2563eb');
          } catch (error) {
            console.warn('[ESI FCM] broadcast delivery failed', error);
            if (typeof window.showToast === 'function') window.showToast('Broadcast saved, but push delivery failed', '#dc2626');
          }
          if (typeof window.closeCompose === 'function') window.closeCompose();
          if (typeof window.renderFeed === 'function') window.renderFeed();
        }).catch(error => {
          if (typeof window.showToast === 'function') window.showToast('Send failed: ' + error.message, '#dc2626');
        });
      };
    }

    if (originalRequestPush && typeof originalRequestPush === 'function') {
      window.__esiOriginalRequestPush = originalRequestPush;
    }
  }

  async function boot() {
    try {
      await loadMessagingSdk();
      installPushBridge();
      if (Notification.permission === 'granted') await registerWebPush().catch(() => {});
      const messaging = await getMessagingInstance();
      messaging.onMessage(payload => {
        const data = payload.data || {};
        const notification = payload.notification || {};
        const title = data.title || notification.title || 'Elite Scholar Institute';
        const body = data.body || notification.body || 'You have a new notification.';
        if (typeof window.showToast === 'function') window.showToast(title + '\n' + body, '#2563eb');
      });
    } catch (error) {
      console.warn('[ESI FCM] client initialization skipped', error);
      installPushBridge();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
