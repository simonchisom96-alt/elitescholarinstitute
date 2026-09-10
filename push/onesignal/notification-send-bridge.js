(()=>{
  'use strict';
  if(!/notification\.html(?:$|\?)/i.test(location.pathname) || window.__esiOneSignalSendBridge) return;
  window.__esiOneSignalSendBridge = true;

  // The live ESI UI is served from Render. Prefer the same-origin API path so
  // a Render rewrite/web-service can handle the secure send without a browser
  // CORS hop. Keep the existing Pages sender as a controlled fallback so this
  // change does not break an already-working backend deployment.
  const SEND_ENDPOINTS = [
    '/api/onesignal/send',
    'https://elitescholarinstitute.pages.dev/api/onesignal/send'
  ];

  function notify(text, color){
    if(typeof toast === 'function') toast(text, color);
  }

  async function requestSend(endpoint, data, idToken){
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 15000);
    try{
      return await fetch(endpoint, {
        method:'POST',
        headers:{
          'content-type':'application/json',
          'authorization':'Bearer ' + idToken
        },
        body:JSON.stringify(data),
        credentials:'omit',
        signal:controller.signal
      });
    }finally{
      clearTimeout(timeout);
    }
  }

  async function sendOneSignal(data){
    if(typeof auth === 'undefined' || !auth.currentUser || auth.currentUser.email !== 'admin@elitescholarinstitute.app'){
      throw new Error('Admin Firebase session not available');
    }

    const idToken = await auth.currentUser.getIdToken(true);
    let lastError = null;

    for(const endpoint of SEND_ENDPOINTS){
      try{
        const response = await requestSend(endpoint, data, idToken);
        const result = await response.json().catch(()=>({}));

        // A real HTTP response means the endpoint is reachable. Do not hide a
        // useful backend error behind a generic "Failed to fetch" message.
        if(response.ok && result.ok) return result;

        const detail = typeof result.error === 'string'
          ? result.error
          : (result.error ? JSON.stringify(result.error) : `HTTP ${response.status}`);
        lastError = new Error(detail);

        // A same-origin 404/405/5xx means that Render has no usable sender
        // route; try the known secure fallback before giving up.
        if(endpoint === SEND_ENDPOINTS[0] && [404,405,500,502,503].includes(response.status)) continue;
        throw lastError;
      }catch(err){
        lastError = err;
        // Network/CORS failures on the same-origin route are also allowed to
        // fall through to the secure fallback. Other backend responses are
        // already actionable and should be surfaced immediately.
        if(endpoint === SEND_ENDPOINTS[0]) continue;
        throw err;
      }
    }

    if(lastError?.name === 'AbortError') throw new Error('OneSignal sender timed out');
    throw lastError || new Error('OneSignal sender unavailable');
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
