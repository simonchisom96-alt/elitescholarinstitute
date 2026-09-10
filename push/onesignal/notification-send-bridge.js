(()=>{
  'use strict';
  if(!/notification\.html(?:$|\?)/i.test(location.pathname) || window.__esiOneSignalSendBridge) return;
  window.__esiOneSignalSendBridge = true;

  // The OneSignal sender is a server-side Cloudflare Pages Function.
  // Render serves the ESI frontend, but must not be treated as the API runtime.
  // Calling the sender directly avoids a dead Render /api route and keeps the
  // OneSignal REST key off the browser.
  const SEND_ENDPOINT = 'https://elitescholarinstitute.pages.dev/api/onesignal/send';

  function notify(text, color){
    if(typeof toast === 'function') toast(text, color);
  }

  async function sendOneSignal(data){
    if(typeof auth === 'undefined' || !auth.currentUser || auth.currentUser.email !== 'admin@elitescholarinstitute.app'){
      throw new Error('Admin Firebase session not available');
    }

    const idToken = await auth.currentUser.getIdToken(true);
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 15000);

    try{
      const response = await fetch(SEND_ENDPOINT, {
        method:'POST',
        headers:{
          'content-type':'application/json',
          'authorization':'Bearer ' + idToken
        },
        body:JSON.stringify(data),
        credentials:'omit',
        signal:controller.signal
      });

      const result = await response.json().catch(()=>({}));
      if(response.ok && result.ok) return result;

      const detail = typeof result.error === 'string'
        ? result.error
        : (result.error ? JSON.stringify(result.error) : `HTTP ${response.status}`);
      throw new Error(detail);
    }catch(err){
      if(err?.name === 'AbortError') throw new Error('OneSignal sender timed out');
      throw err;
    }finally{
      clearTimeout(timeout);
    }
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

  if(!installBridge()){
    let attempts = 0;
    const timer = setInterval(()=>{
      attempts++;
      if(installBridge() || attempts >= 100) clearInterval(timer);
    }, 100);
  }
})();
