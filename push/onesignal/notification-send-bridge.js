(()=>{
  'use strict';
  if(!/notification\.html(?:$|\?)/i.test(location.pathname) || window.__esiOneSignalSendBridge) return;
  window.__esiOneSignalSendBridge = true;

  const ONESIGNAL_SEND_ORIGIN = 'https://elitescholarinstitute.pages.dev';

  function notify(text, color){
    if(typeof window.toast === 'function') window.toast(text, color);
  }

  async function sendOneSignal(data){
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
  }

  // password.js defines pushNotif before this isolated loader runs on notification.html.
  // Replace only that one composer entry point; all other notification functionality stays untouched.
  if(typeof window.pushNotif !== 'function'){
    console.warn('[ESI OneSignal] composer bridge loaded before pushNotif; no send hook installed');
    return;
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
      notify('Broadcast saved to ESI ✓','blue');
      if(window.cache) window.cache[ref.key] = { ...data, id: ref.key, timestamp: Date.now() };
      if(typeof window.renderFeed === 'function') window.renderFeed();

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
})();
