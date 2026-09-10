(() => {
  'use strict';
  if (window.__esiOneSignalInit) return;
  window.__esiOneSignalInit = true;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "6399359d-1281-4013-8914-b4ccb2e13382"
    });
  });

  if (!document.querySelector('script[data-esi-onesignal-sdk]')) {
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.defer = true;
    s.dataset.esiOneSignalSdk = '1';
    document.head.appendChild(s);
  }
})();
