/* Elite Scholar Institute — Google account layer.
   The Google identity is linked to each Firebase app's existing anonymous user
   whenever possible, preserving that app's UID and all UID-keyed records.
   This file never copies or deletes user data.
*/
(function () {
  'use strict';
  if (window.ESIAccount) return;

  const CENTRAL_CONFIG = {
    apiKey: "AIzaSyCj-zqKRfpcGVRvfq6vJtk9OXLp0G4n7BU",
    authDomain: "project-76067.firebaseapp.com",
    databaseURL: "https://project-76067-default-rtdb.firebaseio.com",
    projectId: "project-76067",
    storageBucket: "project-76067.firebasestorage.app",
    messagingSenderId: "625734125340",
    appId: "1:625734125340:web:66f843e0b1e41f7baa5cd9"
  };

  function isHomePage() {
    const p = location.pathname;
    return p === '/' || /\/index\.html$/i.test(p);
  }

  let firebaseSDKPromise = null;
  // A skip is temporary: it lasts only until this document is reloaded.
  let dismissedThisPage = false;
  function ensureFirebaseSDK() {
    if (window.firebase && firebase.auth && firebase.database) return Promise.resolve();
    if (firebaseSDKPromise) return firebaseSDKPromise;
    firebaseSDKPromise = new Promise((resolve, reject) => {
      const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
      const urls = [];
      if (!window.firebase) urls.push(base + 'firebase-app-compat.js');
      if (!window.firebase || !firebase.auth) urls.push(base + 'firebase-auth-compat.js');
      if (!window.firebase || !firebase.database) urls.push(base + 'firebase-database-compat.js');
      let index = 0;
      const next = () => {
        if (window.firebase && firebase.auth && firebase.database) return resolve();
        if (index >= urls.length) return reject(new Error('Firebase sign-in libraries could not be loaded. Check your connection and refresh.'));
        const url = urls[index++];
        if (document.querySelector('script[data-esi-firebase-sdk="' + url + '"]')) {
          const wait = () => window.firebase && firebase.auth && firebase.database ? resolve() : setTimeout(wait, 100);
          wait();
          return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.async = false;
        script.dataset.esiFirebaseSdk = url;
        script.onload = next;
        script.onerror = next;
        document.head.appendChild(script);
      };
      next();
    });
    return firebaseSDKPromise;
  }

  function getAuth() {
    if (!window.firebase || !firebase.auth) return null;
    if (isHomePage()) {
      let app = firebase.apps.find(item => item.name === '[DEFAULT]');
      if (!app) app = firebase.initializeApp(CENTRAL_CONFIG);
      return app.auth();
    }
    if (!firebase.apps.length) return null;
    return firebase.app().auth();
  }

  function ensureUI() {
    if (document.getElementById('esiGoogleAccount')) return;
    const style = document.createElement('style');
    style.textContent = `
      #esiGoogleAccount{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(2,9,22,.82);backdrop-filter:blur(7px);font:500 14px/1.5 Poppins,Arial,sans-serif;color:#fff}
      #esiGoogleAccount[hidden]{display:none!important}
      #esiGoogleAccount .esi-account-panel{display:block;width:min(430px,100%);padding:30px 24px 24px;border:1px solid #c9a43a;border-radius:22px;background:linear-gradient(155deg,#10284a,#04142f 72%);box-shadow:0 22px 80px #000a;text-align:center}
      #esiGoogleAccount .esi-account-mark{display:block;width:104px;height:104px;object-fit:contain;margin:0 auto 18px;border-radius:18px;background:#fff;padding:5px;box-shadow:0 5px 20px #0004}
      #esiGoogleAccount .esi-account-title{font-weight:800;color:#fff;font-size:23px;line-height:1.2;margin:0 0 9px}
      #esiGoogleAccount .esi-account-copy{font-weight:400;color:#c5d2e8;font-size:13px;line-height:1.6;margin:0 auto 20px;max-width:330px}
      #esiGoogleAccount .esi-account-action{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:50px;padding:13px 16px;border:0;border-radius:10px;background:#fff;color:#172033;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 3px 12px #0003}
      #esiGoogleAccount .esi-account-action:disabled{opacity:.7;cursor:wait}
      #esiGoogleAccount .esi-google-g{display:block;flex:0 0 21px;width:21px;height:21px}
      #esiGoogleAccount .esi-account-action.secondary{margin-top:12px;min-height:42px;background:transparent;color:#c5d2e8;border:1px solid #526681;box-shadow:none;font-size:12px}
      #esiGoogleAccount .esi-account-status{font-size:12px;color:#c5d2e8;overflow-wrap:anywhere;margin:14px 0 0}
      @media(max-width:520px){#esiGoogleAccount{padding:16px}#esiGoogleAccount .esi-account-panel{padding:26px 19px 20px}#esiGoogleAccount .esi-account-title{font-size:21px}}
    `;
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'esiGoogleAccount';
    root.innerHTML = `
      <div class="esi-account-panel" role="dialog" aria-modal="true" aria-labelledby="esiAccountTitle">
        <img class="esi-account-mark" src="./logo.jpg" alt="Elite Scholar Institute logo" width="104" height="104">
        <h2 class="esi-account-title" id="esiAccountTitle">Sign in to Elite Scholar Institute</h2>
        <p class="esi-account-copy">Use your Google account to secure your ESI profile and keep your learning progress connected across devices.</p>
        <button class="esi-account-action" type="button"><svg class="esi-google-g" viewBox="0 0 48 48" role="img" aria-label="Google" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M43.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11c-.5 2.7-2 5-4.3 6.5l7 5.4c4.1-3.8 6.5-9.4 6.5-15.9z"/>
          <path fill="#34A853" d="M24 44c5.9 0 10.9-2 14.5-5.4l-7-5.4c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.5-9.1l-7.2 5.6C8.2 39 15.5 44 24 44z"/>
          <path fill="#FBBC05" d="M11.5 26.2c-.5-1.3-.8-2.7-.8-4.2s.3-2.9.8-4.2l-7.2-5.6C2.8 15.3 2 18.5 2 22s.8 6.7 2.3 9.8l7.2-5.6z"/>
          <path fill="#EA4335" d="M24 8.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 2.2 29.9 0 24 0 15.5 0 8.2 5 4.3 12.2l7.2 5.6C13.3 12.6 18.2 8.7 24 8.7z"/>
        </svg> <span>Continue with Google</span></button>
        <div class="esi-account-status" aria-live="polite">Preparing secure sign-in…</div>
        <button class="esi-account-action secondary" type="button">Continue without signing in</button>
        <button class="esi-account-action secondary esi-signout" type="button" style="display:none">Sign out</button>
      </div>`;
    document.body.appendChild(root);
    root.querySelector('.esi-account-action:not(.secondary)').addEventListener('click', signIn);
    root.querySelector('.esi-signout').addEventListener('click', signOut);
    root.querySelector('.secondary:not(.esi-signout)').addEventListener('click', () => {
      dismissedThisPage = true;
      root.hidden = true;
    });
  }


  function getCentralAuth() {
    if (!window.firebase || !firebase.auth) return null;
    let app = firebase.apps.find(item => item.options && item.options.projectId === CENTRAL_CONFIG.projectId);
    if (!app) app = firebase.initializeApp(CENTRAL_CONFIG, 'esiCentralAccount');
    return app.auth();
  }

  function mergeSavedValue(localValue, cloudValue) {
    if (Array.isArray(localValue) && Array.isArray(cloudValue)) {
      const seen = new Set();
      return [...localValue, ...cloudValue].filter(item => {
        const key = JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (localValue && cloudValue && typeof localValue === 'object' && typeof cloudValue === 'object' &&
        !Array.isArray(localValue) && !Array.isArray(cloudValue)) {
      const merged = { ...cloudValue };
      Object.keys(localValue).forEach(key => {
        merged[key] = Object.prototype.hasOwnProperty.call(cloudValue, key)
          ? mergeSavedValue(localValue[key], cloudValue[key]) : localValue[key];
      });
      return merged;
    }
    return localValue !== null && localValue !== undefined ? localValue : cloudValue;
  }

  async function syncSinglePlayerData(centralAuth) {
    const defaultApp = firebase.apps.find(item => item.name === '[DEFAULT]');
    if (!defaultApp || !defaultApp.options || defaultApp.options.projectId !== 'leadersboard-7dacc') return;
    if (!firebase.database || !centralAuth || !centralAuth.currentUser) return;
    const uid = centralAuth.currentUser.uid;
    const allowed = key => key === 'elite_store_v55' || key === 'elite_flagged_v55' ||
      key === 'elite_seen_qs_v55' || key === 'elite_active_session_v55' ||
      key === 'elite_lb_user_v55' || key === 'esi_recent_topics_v1' ||
      key.startsWith('elite_qs_history_v55_');
    const local = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && allowed(key)) local[key] = localStorage.getItem(key);
    }
    const ref = centralAuth.app.database().ref('esi_account_data/' + uid + '/singlePlayer');
    const snap = await ref.get();
    const cloud = snap.exists() ? snap.val() || {} : {};
    const merged = {};
    const keys = new Set([...Object.keys(local), ...Object.keys(cloud)]);
    keys.forEach(key => {
      let localValue = null, cloudValue = null;
      try { if (local[key] != null) localValue = JSON.parse(local[key]); } catch (_) { localValue = local[key]; }
      try { if (cloud[key] != null) cloudValue = JSON.parse(cloud[key]); } catch (_) { cloudValue = cloud[key]; }
      const value = mergeSavedValue(localValue, cloudValue);
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      merged[key] = serialized;
      if (serialized != null) localStorage.setItem(key, serialized);
    });
    await ref.set(merged);
    if (!window.__esiSoloStorageSyncInstalled) {
      window.__esiSoloStorageSyncInstalled = true;
      const originalSetItem = Storage.prototype.setItem;
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.setItem = function (key, value) {
        const result = originalSetItem.call(this, key, value);
        if (this === window.localStorage && allowed(String(key)) && centralAuth.currentUser) {
          const target = centralAuth.app.database().ref('esi_account_data/' + centralAuth.currentUser.uid + '/singlePlayer/' + key);
          target.set(String(value)).catch(error => console.warn('[ESI Account] solo data sync failed', error));
        }
        return result;
      };
      Storage.prototype.removeItem = function (key) {
        const result = originalRemoveItem.call(this, key);
        if (this === window.localStorage && allowed(String(key)) && centralAuth.currentUser) {
          const target = centralAuth.app.database().ref('esi_account_data/' + centralAuth.currentUser.uid + '/singlePlayer/' + key);
          target.remove().catch(error => console.warn('[ESI Account] solo data removal sync failed', error));
        }
        return result;
      };
    }
    window.ESIAccount.syncWarning = false;
    setStatus('Google account connected. Single-player history and saved performance have been backed up and will keep syncing.');
    return true;
  }

  async function activateCentralIdentity(credential, sourceAuth) {
    const centralAuth = getCentralAuth();
    if (!centralAuth) return;
    const alreadyCentral = sourceAuth && sourceAuth.app && sourceAuth.app.options &&
      sourceAuth.app.options.projectId === CENTRAL_CONFIG.projectId && sourceAuth.currentUser && !sourceAuth.currentUser.isAnonymous;
    if (credential && !alreadyCentral) {
      await centralAuth.signInWithCredential(credential);
    }
    if (centralAuth.currentUser && centralAuth.currentUser.email) {
      try {
        await syncSinglePlayerData(centralAuth);
      } catch (error) {
        console.warn('[ESI Account] Google identity connected; solo cloud backup needs database permission', error);
        window.ESIAccount.syncWarning = true;
      }
    }
  }

  function setStatus(message) {
    const el = document.querySelector('#esiGoogleAccount .esi-account-status');
    if (el) el.textContent = message;
  }

  function refreshUI(user) {
    const root = document.getElementById('esiGoogleAccount');
    if (!root) return;
    const signInButton = root.querySelector('.esi-account-action:not(.secondary)');
    const signOutButton = root.querySelector('.esi-signout');
    if ((!user || user.isAnonymous) && dismissedThisPage) {
      root.hidden = true;
      return;
    }
    if (user && !user.isAnonymous) {
      const profileNameField = document.getElementById('lbName') || document.getElementById('mpNameInput');
      if (profileNameField && !profileNameField.value && user.displayName) {
        profileNameField.value = user.displayName.replace(/[^A-Za-z0-9_ ]/g, '').replace(/\s+/g, ' ').trim().slice(0, profileNameField.maxLength || 10);
      }
      const label = user.displayName || user.email || 'Google account connected';
      root.hidden = true;
      setStatus((user.email || label) + ' is connected to this ESI section.');
      signInButton.textContent = 'Google account connected';
      signInButton.disabled = true;
      signOutButton.style.display = 'flex';
    } else if (user && user.isAnonymous) {
      root.hidden = false;
      setStatus('Your current progress is using a temporary account. Connect Google to secure this identity.');
      signInButton.textContent = 'Continue with Google';
      signInButton.disabled = false;
      signOutButton.style.display = 'none';
    } else {
      root.hidden = false;
      setStatus('Sign in with Google to connect this ESI section to your account.');
      signInButton.textContent = 'Continue with Google';
      signInButton.disabled = false;
      signOutButton.style.display = 'none';
    }
  }

  async function waitForAuth() {
    await ensureFirebaseSDK();
    if (isHomePage()) {
      let app = firebase.apps.find(item => item.name === '[DEFAULT]');
      if (!app) app = firebase.initializeApp(CENTRAL_CONFIG);
      return app.auth();
    }
    for (let i = 0; i < 100; i++) {
      const auth = getAuth();
      if (auth) return auth;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('ESI account service is still loading. Please refresh and try again.');
  }

  async function waitForAuthReady(auth) {
    const firstUser = await new Promise(resolve => {
      let unsubscribe = () => {};
      unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe();
        resolve(user || null);
      }, () => {
        unsubscribe();
        resolve(null);
      });
    });
    if (firstUser || isHomePage()) return firstUser;
    for (let i = 0; i < 30; i++) {
      if (auth.currentUser) return auth.currentUser;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return auth.currentUser || null;
  }

  async function signIn() {
    const button = document.querySelector('#esiGoogleAccount .esi-account-action');
    if (!button || button.disabled) return;
    dismissedThisPage = false;
    const root = document.getElementById('esiGoogleAccount');
    if (root) root.hidden = false;
    button.disabled = true;
    button.textContent = 'Connecting…';
    try {
      const auth = await waitForAuth();
      await waitForAuthReady(auth);
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const current = auth.currentUser;
      if (current && current.isAnonymous) {
        try {
          const linked = await current.linkWithPopup(provider);
          const linkedCredential = firebase.auth.GoogleAuthProvider.credentialFromResult(linked);
          if (linkedCredential) await activateCentralIdentity(linkedCredential, auth);
        } catch (error) {
          if (error && error.code === 'auth/credential-already-in-use') {
            const existingSignIn = await auth.signInWithPopup(provider);
            const existingCredential = firebase.auth.GoogleAuthProvider.credentialFromResult(existingSignIn);
            if (existingCredential) await activateCentralIdentity(existingCredential, auth);
            window.ESIAccount.legacyTempDataWarning = true;
          } else if (error && (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment')) {
            await current.linkWithRedirect(provider);
            return;
          } else {
            throw error;
          }
        }
      } else {
        try {
          const signedIn = await auth.signInWithPopup(provider);
          const googleCredential = firebase.auth.GoogleAuthProvider.credentialFromResult(signedIn);
          if (googleCredential) await activateCentralIdentity(googleCredential, auth);
        } catch (error) {
          if (error && (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment')) {
            await auth.signInWithRedirect(provider);
            return;
          }
          throw error;
        }
      }
      refreshUI(auth.currentUser);
      setStatus(window.ESIAccount.syncWarning
        ? 'Google account connected. Your current profile is safe, but single-player cloud backup was blocked by database permissions.'
        : window.ESIAccount.legacyTempDataWarning
          ? 'Google account connected. Existing account loaded. Any records from this device’s separate temporary profile still need migration; they have not been deleted.'
          : 'Google account connected. Your existing ESI identity has been retained where linking succeeded.');
    } catch (error) {
      console.error('[ESI Account]', error);
      setStatus(error && error.message ? error.message : 'Google sign-in could not be completed. Please try again.');
      button.disabled = false;
      button.textContent = 'Continue with Google';
    }
  }

  async function signOut() {
    try {
      await waitForAuth();
      const accountApps = firebase.apps.filter(app =>
        app.name === '[DEFAULT]' || (app.options && app.options.projectId === CENTRAL_CONFIG.projectId)
      );
      await Promise.all(accountApps.map(app => app.auth().signOut()));
      setStatus('Signed out of your ESI Google account on this page. Your cloud records have not been deleted.');
    } catch (error) {
      console.error('[ESI Account] sign-out failed', error);
      setStatus('Could not sign out. Please try again.');
    }
  }

  async function init() {
    ensureUI();
    try {
      const auth = await waitForAuth();
      const result = await auth.getRedirectResult().catch(error => {
        console.error('[ESI Account] redirect result failed', error);
        setStatus('Google sign-in did not finish. Please try again.');
        return null;
      });
      if (result && result.user) {
        const redirectCredential = firebase.auth.GoogleAuthProvider.credentialFromResult(result);
        if (redirectCredential) await activateCentralIdentity(redirectCredential, auth);
        setStatus('Google account connected.');
      } else if (auth.currentUser && !auth.currentUser.isAnonymous) {
        const centralAuth = getCentralAuth();
        if (centralAuth && centralAuth.currentUser && centralAuth.currentUser.email === auth.currentUser.email) {
          await syncSinglePlayerData(centralAuth).catch(error => {
            console.warn('[ESI Account] solo sync unavailable', error);
            window.ESIAccount.syncWarning = true;
          });
        }
      }
      refreshUI(auth.currentUser);
      if (window.ESIAccount.syncWarning) {
        setStatus('Google account connected, but single-player cloud backup needs the private database rule from FIREBASE_ACCOUNT_DATA_RULES.md.');
      }
      auth.onAuthStateChanged(refreshUI);
    } catch (error) {
      setStatus('Account service is loading. Open this panel again in a moment.');
      console.warn('[ESI Account]', error);
    }
  }

  window.ESIAccount = { init, signIn };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();