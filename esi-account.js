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

  function getAuth() {
    if (!window.firebase || !firebase.auth) return null;
    if (!firebase.apps.length && isHomePage()) {
      firebase.initializeApp(CENTRAL_CONFIG);
    }
    if (!firebase.apps.length) return null;
    return firebase.app().auth();
  }

  function ensureUI() {
    if (document.getElementById('esiGoogleAccount')) return;
    const style = document.createElement('style');
    style.textContent = `
      #esiGoogleAccount{position:fixed;right:12px;top:calc(12px + env(safe-area-inset-top,0px));z-index:99990;font:600 11px/1.35 Poppins,Arial,sans-serif;color:#fff}
      #esiGoogleAccount .esi-account-toggle{border:1px solid #d8b43b;background:#04142f;color:#fff;border-radius:22px;padding:9px 13px;box-shadow:0 4px 16px #0005;cursor:pointer;max-width:190px}
      #esiGoogleAccount .esi-account-panel{display:none;margin-top:7px;width:min(270px,calc(100vw - 24px));padding:13px;border:1px solid #b99732;border-radius:13px;background:#071831;box-shadow:0 8px 28px #0008}
      #esiGoogleAccount.open .esi-account-panel{display:block}
      #esiGoogleAccount .esi-account-title{font-weight:800;color:#ffd85a;font-size:13px;margin-bottom:5px}
      #esiGoogleAccount .esi-account-copy{font-weight:400;color:#c5d2e8;font-size:10px;margin:0 0 10px}
      #esiGoogleAccount .esi-account-action{width:100%;padding:10px;border:0;border-radius:8px;background:#ffd700;color:#071831;font-weight:800;font-size:11px;cursor:pointer}
      #esiGoogleAccount .esi-account-action.secondary{margin-top:7px;background:#203452;color:#fff}
      #esiGoogleAccount .esi-account-status{font-size:10px;color:#c5d2e8;overflow-wrap:anywhere;margin:5px 0 10px}
      @media(max-width:520px){#esiGoogleAccount{right:8px;top:calc(8px + env(safe-area-inset-top,0px))}#esiGoogleAccount .esi-account-toggle{padding:8px 10px;font-size:10px}}
    `;
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'esiGoogleAccount';
    root.innerHTML = `
      <button class="esi-account-toggle" type="button" aria-expanded="false">👤 Google Account</button>
      <div class="esi-account-panel">
        <div class="esi-account-title">Your ESI Account</div>
        <p class="esi-account-copy">Use your Google account to keep your ESI identity connected across devices.</p>
        <div class="esi-account-status" aria-live="polite">Checking account…</div>
        <button class="esi-account-action" type="button">Continue with Google</button>
        <button class="esi-account-action secondary" type="button" style="display:none">Sign out</button>
      </div>`;
    document.body.appendChild(root);
    const toggle = root.querySelector('.esi-account-toggle');
    toggle.addEventListener('click', () => {
      root.classList.toggle('open');
      toggle.setAttribute('aria-expanded', root.classList.contains('open') ? 'true' : 'false');
    });
    root.querySelector('.esi-account-action').addEventListener('click', signIn);
    root.querySelector('.secondary').addEventListener('click', signOut);
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
    setStatus('Google account connected. Single-player history and saved performance have been backed up and will keep syncing.');
    return true;
  }

  async function activateCentralIdentity(credential) {
    const centralAuth = getCentralAuth();
    if (!centralAuth) return;
    if (credential) {
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
    const signInButton = root.querySelector('.esi-account-action');
    const signOutButton = root.querySelector('.secondary');
    const toggle = root.querySelector('.esi-account-toggle');
    if (user && !user.isAnonymous) {
      const profileNameField = document.getElementById('lbName') || document.getElementById('mpNameInput');
      if (profileNameField && !profileNameField.value && user.displayName) {
        profileNameField.value = user.displayName.replace(/[^A-Za-z0-9_ ]/g, '').replace(/\\s+/g, ' ').trim().slice(0, profileNameField.maxLength || 10);
      }
      const label = user.displayName || user.email || 'Google account connected';
      toggle.textContent = '✓ ' + label;
      setStatus((user.email || label) + ' is connected to this ESI section.');
      signInButton.textContent = 'Google account connected';
      signInButton.disabled = true;
      signOutButton.style.display = 'block';
    } else if (user && user.isAnonymous) {
      toggle.textContent = '👤 Secure your ESI account';
      setStatus('Your current progress is using a temporary account. Connect Google to secure this identity.');
      signInButton.textContent = 'Continue with Google';
      signInButton.disabled = false;
      signOutButton.style.display = 'none';
    } else {
      toggle.textContent = '👤 Google Account';
      setStatus('Sign in with Google to connect this ESI section to your account.');
      signInButton.textContent = 'Continue with Google';
      signInButton.disabled = false;
      signOutButton.style.display = 'none';
    }
  }

  async function waitForAuth() {
    for (let i = 0; i < 100; i++) {
      const auth = getAuth();
      if (auth) return auth;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('ESI account service is still loading. Please refresh and try again.');
  }

  async function signIn() {
    const button = document.querySelector('#esiGoogleAccount .esi-account-action');
    if (!button || button.disabled) return;
    button.disabled = true;
    button.textContent = 'Connecting…';
    try {
      const auth = await waitForAuth();
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const current = auth.currentUser;
      if (current && current.isAnonymous) {
        try {
          const linked = await current.linkWithPopup(provider);
          const linkedCredential = firebase.auth.GoogleAuthProvider.credentialFromResult(linked);
          if (linkedCredential) await activateCentralIdentity(linkedCredential);
        } catch (error) {
          if (error && error.code === 'auth/credential-already-in-use') {
            const existingSignIn = await auth.signInWithPopup(provider);
            const existingCredential = firebase.auth.GoogleAuthProvider.credentialFromResult(existingSignIn);
            if (existingCredential) await activateCentralIdentity(existingCredential);
            window.ESIAccount.legacyTempDataWarning = true;
          }
          if (error && (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment')) {
            await current.linkWithRedirect(provider);
            return;
          }
          throw error;
        }
      } else {
        try {
          const signedIn = await auth.signInWithPopup(provider);
          const googleCredential = firebase.auth.GoogleAuthProvider.credentialFromResult(signedIn);
          if (googleCredential) await activateCentralIdentity(googleCredential);
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
      const auth = await waitForAuth();
      await auth.signOut();
      setStatus('Signed out of this ESI section. Your cloud records have not been deleted.');
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
        if (redirectCredential) await activateCentralIdentity(redirectCredential);
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