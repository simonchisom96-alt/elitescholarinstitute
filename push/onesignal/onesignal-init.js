(() => {
  'use strict';
  if (window.__esiOneSignalInit) return;
  window.__esiOneSignalInit = true;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "6399359d-1281-4013-8914-b4ccb2e13382",
      serviceWorkerPath: "push/onesignal/OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/push/onesignal/" },
      notificationClickHandlerMatch: "exact",
      notificationClickHandlerAction: "navigate",
      autoResubscribe: true
    });
  });

  if (!document.querySelector('script[data-esi-onesignal-sdk]')) {
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.defer = true;
    s.dataset.esiOneSignalSdk = '1';
    document.head.appendChild(s);
  }

  if (/notification\.html(?:$|\?)/i.test(location.pathname)) {
    if (!document.querySelector('script[data-esi-composer-preview]')) {
      const preview = document.createElement('script');
      preview.src = '/push/onesignal/notification-preview.js';
      preview.defer = true;
      preview.dataset.esiComposerPreview = '1';
      document.head.appendChild(preview);
    }

    if (!document.querySelector('script[data-esi-composer-send]')) {
      const bridge = document.createElement('script');
      bridge.src = '/push/onesignal/notification-send-bridge.js';
      bridge.defer = true;
      bridge.dataset.esiComposerSend = '1';
      document.head.appendChild(bridge);
    }
  }
})();
