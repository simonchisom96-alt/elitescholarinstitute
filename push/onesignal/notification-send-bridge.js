(()=>{
  'use strict';
  if(!/notification\.html(?:$|\?)/i.test(location.pathname) || window.__esiOneSignalSendBridge) return;
  window.__esiOneSignalSendBridge = true;

  const ONESIGNAL_SEND_ORIGIN = 'https://elitescholarinstitute.pages.dev';
  const originalPushNotif = window.pushNotif;

  function notify(text, color){
    if(typeof window.toast === 'function') window.toast(text, color);
  }

  async function sendOneSignal(data){
    try{
      const currentUser = window.auth && window.auth.currentUser;
      if(!currentUser || currentUser.email !== 'admin@elitescholarinstitute.app'){
        throw new Error('Admin Firebase session not available');
      }

      const idToken = await currentUser.getIdToken();
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
    }catch(err){
      console.error('[ESI OneSignal] send failed:', err);
      throw err;
    }
  }

  window.pushNotif = function(data){
    if(!data || typeof data !== 'object') return;

    if(!window.db || typeof window.db.ref !== 'function'){
      notify('Send failed: Firebase is not ready','orange');
      return;
    }

    const ref = window.db.ref('notifications').push(data);

    ref.then(async ()=>{
      closeCompose();
      cache[ref.key] = { ...data, id: ref.key, timestamp: Date.now() };
      renderFeed();

      try{
        const result = await sendOneSignal(data);
        if(result.onesignalId){
          notify('Broadcast sent + push notification sent ✓','blue');
        }else{
          notify('Broadcast saved, but no OneSignal subscribers were eligible','orange');
        }
      }catch(err){
        notify('Broadcast saved, but OneSignal push failed: '+err.message,'orange');
      }
    }).catch(e=>notify('Send failed: '+e.message,'orange'));
  };

  // If the normal script loads after this bridge, wrap it as soon as it appears.
  // notification.html currently loads password.js before app.js/OneSignal init,
  // so this observer is only a safety net and does not touch any other page.
  if(!originalPushNotif){
    let tries = 0;
    const timer = setInterval(()=>{
      tries++;
      if(typeof window.pushNotif === 'function' && window.pushNotif !== window.__esiOriginalPushNotif){
        clearInterval(timer);
        window.__esiOriginalPushNotif = window.pushNotif;
        window.pushNotif = arguments.callee;
      }
      if(tries > 80) clearInterval(timer);
    },250);
  }
})();
