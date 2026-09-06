/* Elite Scholar Institute — application controller 36.2404 */
(() => {
  'use strict';
  const BUILD='36.2404';
  const APK_URL='https://github.com/simonchisom96-alt/elitescholarinstitute/releases/latest/download/ESI.apk';
  const NOTIF_DB_URL='https://elite-notification-default-rtdb.firebaseio.com';
  const SW_URL='/sw.js?v='+BUILD;
  let installBox=null,hideTimer=null,installTimer=null,deferredInstall=null,notifications={};
  const isAndroid=/Android/i.test(navigator.userAgent);
  const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isInstalled=()=>!!window.matchMedia?.('(display-mode: standalone)').matches||!!window.matchMedia?.('(display-mode: window-controls-overlay)').matches||navigator.standalone===true||/ESIAndroid\//i.test(navigator.userAgent);
  window.__esiAppLoadTime=Date.now();window.__esiNotifDbUrl=NOTIF_DB_URL;window.__esiBuild=BUILD;
})();
