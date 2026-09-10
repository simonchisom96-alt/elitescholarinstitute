(()=>{
  'use strict';
  if(!/notification\.html(?:$|\?)/i.test(location.pathname) || window.__esiOneSignalSendBridge) return;
  window.__esiOneSignalSendBridge = true;

  const ONESIGNAL_SEND_ORIGIN = 'https://elitescholarinstitute.pages.dev';

  function notify(text, color){
    if(typeof toast === 'function') toast(text, color);
  }

  async function sendOneSignal(data){
    if(typeof auth === 'undefined' || !auth.currentUser || auth.currentUser.email !== 'admin@elitescholarinstitute.app'){
      throw new Error('Admin Firebase session not available');
    }

    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch(ONESIGNAL_SEND_ORIGIN + '/api/onesignal/send', {
      method:'POST',
      headers:{
        'content-type':'application/json',
        'authorization':'Bearer ' + idToken
      },
      body:JSON.stringify(data),
      credentials:'omit'
    });

    const result = await response.json().catch(()=>({}));
    if(!response.ok || !result.ok){
      const detail = typeof result.error === 'string' ? result.error : 'OneSignal send failed';
      throw new Error(detail);
    }
    return result;
  }

  function installBridge(){
    if(window.__esiOneSignalPushBridgeInstalled) return true;
    if(typeof pushNotif !== 'function') return false;
    window.__esiOneSignalPushBridgeInstalled = true;

    pushNotif = function(data){
      if(!data || typeof data !== 'object') return;

      if(typeof db === 'undefined' || !db || typeof db.ref !== 'function'){
        notify('Send failed: Firebase is not ready','orange');
        return;
      }

      const ref = db.ref('notifications').push(data);
      ref.then(async ()=>{
        closeCompose();
        notify('Broadcast saved to ESI ✓','blue');
        cache[ref.key] = { ...data, id: ref.key, timestamp: Date.now() };
        renderFeed();

        try{
          const result = await sendOneSignal(data);
          if(result.onesignalId){
            notify('OneSignal push sent ✓','blue');
          }else{
            notify('Broadcast saved, but no OneSignal subscribers were eligible','orange');
          }
        }catch(err){
          console.error('[ESI OneSignal] send failed:', err);
          notify('Broadcast saved, but OneSignal push failed: '+err.message,'orange');
        }
      }).catch(e=>notify('Send failed: '+e.message,'orange'));
    };
    return true;
  }

  // notification.html/app.js/password.js can finish loading after this
  // dynamically injected bridge. Do not permanently abandon the bridge just
  // because pushNotif is not defined on the first tick.
  if(!installBridge()){
    let attempts = 0;
    const timer = setInterval(()=>{
      attempts++;
      if(installBridge() || attempts >= 100) clearInterval(timer);
    }, 100);
  }
})();
