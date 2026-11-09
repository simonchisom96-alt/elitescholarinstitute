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
  // One account prompt per website visit (tab session), shared by home, solo and multiplayer pages.
  const PROMPT_SESSION_KEY = 'esi_account_prompt_seen_v1';
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
    // Single-player uses its own Firebase project, but the same Google credential
    // is linked into this project and the central multiplayer project at sign-in.
    const soloApp = firebase.apps.find(item => item.name === 'esiLeaderboardAccount');
    if (soloApp) return soloApp.auth();
    const defaultApp = firebase.apps.find(item => item.name === '[DEFAULT]');
    if (defaultApp && defaultApp.options && defaultApp.options.projectId === 'leadersboard-7dacc') {
      return defaultApp.auth();
    }
    return getCentralAuth();
  }

  let pageScrollLockState = null;
  let pageScrollGuardsInstalled = false;
  function installPageScrollGuards() {
    if (pageScrollGuardsInstalled) return;
    pageScrollGuardsInstalled = true;
    // The overlay must not allow touch/wheel gestures to reach the page beneath it.
    // Gestures that start inside the sign-in panel remain available for panel scrolling.
    const isInsidePanel = target => !!(target && target.closest && target.closest('#esiGoogleAccount .esi-account-panel'));
    document.addEventListener('touchmove', event => {
      if (pageScrollLockState && !isInsidePanel(event.target)) event.preventDefault();
    }, { passive: false, capture: true });
    document.addEventListener('wheel', event => {
      if (pageScrollLockState && !isInsidePanel(event.target)) event.preventDefault();
    }, { passive: false, capture: true });
  }
  function lockPageScroll(locked) {
    if (locked) {
      if (pageScrollLockState || !document.body) return;
      const body = document.body;
      const html = document.documentElement;
      pageScrollLockState = {
        bodyOverflow: body.style.overflow,
        bodyPosition: body.style.position,
        bodyTop: body.style.top,
        bodyWidth: body.style.width,
        htmlOverflow: html.style.overflow,
        scrollY: window.scrollY || window.pageYOffset || 0
      };
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = '-' + pageScrollLockState.scrollY + 'px';
      body.style.width = '100%';
      return;
    }
    if (!pageScrollLockState || !document.body) return;
    const state = pageScrollLockState;
    pageScrollLockState = null;
    const body = document.body;
    const html = document.documentElement;
    html.style.overflow = state.htmlOverflow;
    body.style.overflow = state.bodyOverflow;
    body.style.position = state.bodyPosition;
    body.style.top = state.bodyTop;
    body.style.width = state.bodyWidth;
    window.scrollTo(0, state.scrollY);
  }

  function ensureUI() {
    if (document.getElementById('esiGoogleAccount')) return;
    const style = document.createElement('style');
    style.textContent = `
      #esiGoogleAccount{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(2,9,22,.82);backdrop-filter:blur(7px);font:500 14px/1.5 Poppins,Arial,sans-serif;color:#fff;overscroll-behavior:none;touch-action:none}
      #esiGoogleAccount[hidden]{display:none!important}
      #esiGoogleAccount .esi-account-panel{display:block;width:min(430px,100%);max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;padding:30px 24px 24px;border:1px solid #c9a43a;border-radius:22px;background:linear-gradient(155deg,#10284a,#04142f 72%);box-shadow:0 22px 80px #000a;text-align:center}
      #esiGoogleAccount .esi-account-mark{display:block;width:104px;height:104px;object-fit:cover;object-position:center;margin:0 auto 18px;border-radius:50%;background:transparent;padding:0;border:2px solid #c9a43a;box-shadow:0 5px 20px #0006;overflow:hidden}
      #esiGoogleAccount .esi-account-title{font-weight:800;color:#fff;font-size:19.05px;line-height:1.2;margin:0 0 9px;text-transform:uppercase}
      #esiGoogleAccount .esi-account-copy{font-weight:400;color:#c5d2e8;font-size:13px;line-height:1.6;margin:0 auto 20px;max-width:330px}
      #esiGoogleAccount .esi-account-action{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:50px;padding:13px 16px;border:0;border-radius:10px;background:#fff;color:#172033;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 3px 12px #0003}
      #esiGoogleAccount .esi-account-action:disabled{opacity:.7;cursor:wait}
      #esiGoogleAccount .esi-google-g{display:block;flex:0 0 22px;width:22px;height:22px;min-width:22px;min-height:22px;overflow:visible;position:relative;z-index:1} #esiGoogleAccount .esi-account-action:not(.secondary){display:flex;flex-direction:row;align-items:center;justify-content:center;gap:11px;overflow:visible;white-space:nowrap} #esiGoogleAccount .esi-account-action:not(.secondary) span:last-child{display:inline-block;line-height:1.25}
      #esiGoogleAccount .esi-account-action.secondary{margin-top:12px;min-height:42px;background:transparent;color:#c5d2e8;border:1px solid #526681;box-shadow:none;font-size:12px}
      #esiGoogleAccount .esi-account-status{font-size:12px;color:#c5d2e8;overflow-wrap:anywhere;margin:14px 0 0}
      @media(max-width:520px){#esiGoogleAccount{padding:16px}#esiGoogleAccount .esi-account-panel{padding:26px 19px 20px}#esiGoogleAccount .esi-account-title{font-size:17.39px}}
    `;
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'esiGoogleAccount';
    root.innerHTML = `
      <div class="esi-account-panel" role="dialog" aria-modal="true" aria-labelledby="esiAccountTitle">
        <img class="esi-account-mark" src="./logo.jpg" alt="Elite Scholar Institute logo" width="104" height="104">
        <h2 class="esi-account-title" id="esiAccountTitle">SIGN INTO ELITE SCHOLAR INSTITUTE</h2>
        <p class="esi-account-copy">Sign in to save and sync your ESI progress across devices.</p>
        <button class="esi-account-action" type="button"><svg class="esi-google-g" viewBox="0 0 48 48" role="img" aria-label="Google" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M43.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11c-.5 2.7-2 5-4.3 6.5l7 5.4c4.1-3.8 6.5-9.4 6.5-15.9z"/>
          <path fill="#34A853" d="M24 44c5.9 0 10.9-2 14.5-5.4l-7-5.4c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.5-9.1l-7.2 5.6C8.2 39 15.5 44 24 44z"/>
          <path fill="#FBBC05" d="M11.5 26.2c-.5-1.3-.8-2.7-.8-4.2s.3-2.9.8-4.2l-7.2-5.6C2.8 15.3 2 18.5 2 22s.8 6.7 2.3 9.8l7.2-5.6z"/>
          <path fill="#EA4335" d="M24 8.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 2.2 29.9 0 24 0 15.5 0 8.2 5 4.3 12.2l7.2 5.6C13.3 12.6 18.2 8.7 24 8.7z"/>
        </svg> <span class="esi-google-label">Continue with Google</span></button>
        <div class="esi-account-status" aria-live="polite">Preparing secure sign-in…</div>
        <button class="esi-account-action secondary" type="button">Continue without signing in</button>
        <button class="esi-account-action secondary esi-signout" type="button" style="display:none">Sign out</button>
      </div>`;
    document.body.appendChild(root);
    installPageScrollGuards();
    lockPageScroll(true);
    root.querySelector('.esi-account-action:not(.secondary)').addEventListener('click', signIn);
    root.querySelector('.esi-signout').addEventListener('click', signOut);
    root.querySelector('.secondary:not(.esi-signout)').addEventListener('click', () => {
      dismissedThisPage = true;
      root.hidden = true;
      lockPageScroll(false);
    });
  }


  function getCentralAuth() {
    if (!window.firebase || !firebase.auth) return null;
    // Use one stable named Firebase app for the shared ESI identity on every page.
    // The multiplayer page may also have a default app for legacy anonymous sessions;
    // sign-in credentials are bridged into this stable app by activateCentralIdentity().
    let app = firebase.apps.find(item => item.name === 'esiCentralAccount');
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
    return cloudValue !== null && cloudValue !== undefined ? cloudValue : localValue;
  }

  async function syncSinglePlayerData(centralAuth) {
    let soloApp = firebase.apps.find(item => item.name === 'esiLeaderboardAccount');
    if (!soloApp) {
      soloApp = firebase.initializeApp({
        apiKey: 'AIzaSyD4wzJZUn5RFMWaj1IP5r2cNWFupYWV0',
        authDomain: 'leadersboard-7dacc.firebaseapp.com',
        databaseURL: 'https://leadersboard-7dacc-default-rtdb.firebaseio.com',
        projectId: 'leadersboard-7dacc',
        storageBucket: 'leadersboard-7dacc.firebasestorage.app',
        messagingSenderId: '855741214857',
        appId: '1:855741214857:web:d943c7c24d78ec581d5658'
      }, 'esiLeaderboardAccount');
    }
    if (!soloApp.options || soloApp.options.projectId !== 'leadersboard-7dacc') return;
    if (!firebase.database || !centralAuth || !centralAuth.currentUser) return;
    const uid = centralAuth.currentUser.uid;
    // Back up all ESI-owned user state, not just the original quiz-history
    // whitelist. This includes solo settings (for example elite_theme_v7),
    // every versioned history/profile key, and ESI multiplayer preferences
    // stored locally. Exclude generated question/data caches: those are
    // rebuildable and should not inflate the account backup.
    const allowed = key => {
      if (!/^(elite_|esi_|mp_)/i.test(key)) return false;
      if (/^(elite_fb_cache_|elite_q_cache_)/i.test(key)) return false;
      return true;
    };
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
      // The globally reserved solo username belongs to the Google account,
      // not to whichever browser happens to be signing in. Prefer its cloud copy
      // when present; histories and ordinary settings still merge both ways.
      const value = key === 'elite_lb_user_v55' && cloudValue != null
        ? cloudValue : mergeSavedValue(localValue, cloudValue);
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

  // Capture a device's temporary anonymous profile BEFORE switching to an
  // already-existing Google account. Firebase rules can still authorize reads
  // while auth.currentUser is the anonymous owner of these UID-keyed records.
  async function captureLegacyProfile(auth) {
    const user = auth && auth.currentUser;
    const projectId = auth && auth.app && auth.app.options && auth.app.options.projectId;
    if (!user || !user.isAnonymous || !auth.app.database) return null;
    const uid = user.uid;
    const db = auth.app.database();
    const month = new Date().toISOString().slice(0, 7);
    const out = { projectId, uid, capturedAt: Date.now() };
    const read = async path => {
      try { const snap = await db.ref(path).get(); return snap.exists() ? snap.val() : null; }
      catch (error) { console.warn('[ESI Account] legacy read unavailable:', path, error && error.message); return null; }
    };
    if (projectId === 'project-76067') {
      out.mpUser = await read('mp_users/' + uid);
      out.mpHistory = await read('mp_match_history/' + uid);
      out.mpFriends = await read('mp_friends/' + uid);
      out.mpFriendRequests = await read('mp_friend_requests/' + uid);
      out.mpFriendRequestsSent = await read('mp_friend_requests_sent/' + uid);
      out.mpLeaderboard = await read('mp_global_lb/' + month + '/' + uid);
      const lower = out.mpUser && out.mpUser.usernameLower;
      if (lower) {
        const registry = await read('mp_usernames/' + lower);
        if (registry === uid) out.mpUsername = lower;
      }
    } else if (projectId === 'leadersboard-7dacc') {
      out.soloLeaderboard = await read('leaderboard/' + month + '/' + uid);
      let soloName = null;
      try { soloName = JSON.parse(localStorage.getItem('elite_lb_user_v55') || 'null'); } catch (_) {}
      const lower = soloName && soloName.name ? String(soloName.name).trim().toLowerCase() : '';
      if (lower) {
        const registry = await read('leaderboard_names/' + lower);
        if (registry && registry.uid === uid) out.soloName = { lower, value: registry };
      }
    }
    return out;
  }

  // Restore only into the newly authenticated Google UID. Existing Google
  // profile values win; missing fields and history rows are recovered from
  // the old anonymous profile without deleting the source record.
  async function restoreLegacyProfile(auth, legacy) {
    const user = auth && auth.currentUser;
    if (!legacy || !user || user.isAnonymous || legacy.uid === user.uid) return;
    const projectId = auth.app && auth.app.options && auth.app.options.projectId;
    if (legacy.projectId !== projectId) return;
    const db = auth.app.database();
    const uid = user.uid;
    const read = async path => {
      try { const snap = await db.ref(path).get(); return snap.exists() ? snap.val() : null; }
      catch (_) { return null; }
    };
    const writes = {};
    if (projectId === 'project-76067') {
      const current = await read('mp_users/' + uid);
      if (legacy.mpUser) {
        const profile = { ...legacy.mpUser, ...(current || {}), uid };
        if (current && current.username) profile.username = current.username;
        if (current && current.usernameLower) profile.usernameLower = current.usernameLower;
        writes['mp_users/' + uid] = profile;
      }
      if (legacy.mpHistory) {
        const currentHistory = await read('mp_match_history/' + uid) || {};
        writes['mp_match_history/' + uid] = { ...legacy.mpHistory, ...currentHistory };
      }
      if (legacy.mpFriends) {
        const currentFriends = await read('mp_friends/' + uid) || {};
        writes['mp_friends/' + uid] = { ...legacy.mpFriends, ...currentFriends };
      }
      if (legacy.mpFriendRequests) {
        const currentRequests = await read('mp_friend_requests/' + uid) || {};
        writes['mp_friend_requests/' + uid] = { ...legacy.mpFriendRequests, ...currentRequests };
      }
      if (legacy.mpFriendRequestsSent) {
        const currentSent = await read('mp_friend_requests_sent/' + uid) || {};
        writes['mp_friend_requests_sent/' + uid] = { ...legacy.mpFriendRequestsSent, ...currentSent };
      }
      if (legacy.mpLeaderboard && !(await read('mp_global_lb/' + new Date().toISOString().slice(0,7) + '/' + uid))) {
        writes['mp_global_lb/' + new Date().toISOString().slice(0,7) + '/' + uid] = { ...legacy.mpLeaderboard, uid };
      }
      if (legacy.mpUsername) {
        const existingNameOwner = await read('mp_usernames/' + legacy.mpUsername);
        const profile = writes['mp_users/' + uid] || current;
        if ((!existingNameOwner || existingNameOwner === legacy.uid || existingNameOwner === uid) &&
            profile && (!current || !current.usernameLower || current.usernameLower === legacy.mpUsername)) {
          writes['mp_usernames/' + legacy.mpUsername] = uid;
        }
      }
    } else if (projectId === 'leadersboard-7dacc') {
      const month = new Date().toISOString().slice(0,7);
      const current = await read('leaderboard/' + month + '/' + uid);
      if (legacy.soloLeaderboard && !current) {
        writes['leaderboard/' + month + '/' + uid] = { ...legacy.soloLeaderboard };
      }
      if (legacy.soloName) {
        const currentName = await read('leaderboard_names/' + legacy.soloName.lower);
        if (!currentName || currentName.uid === legacy.uid || currentName.uid === uid) {
          writes['leaderboard_names/' + legacy.soloName.lower] = { ...legacy.soloName.value, uid };
        }
      }
    }
    if (Object.keys(writes).length) await db.ref().update(writes);
    console.info('[ESI Account] legacy profile migration completed for', projectId);
  }

  async function connectCredentialToProject(auth, credential) {
    if (!auth || !credential) return null;
    const current = auth.currentUser;
    if (current && !current.isAnonymous) {
      const signed = await auth.signInWithCredential(credential);
      return signed.user;
    }
    let legacy = null;
    if (current && current.isAnonymous) {
      try {
        const linked = await current.linkWithCredential(credential);
        return linked.user;
      } catch (error) {
        if (!error || error.code !== 'auth/credential-already-in-use') throw error;
        // Preserve the anonymous user's recoverable profile data before the
        // credential sign-in replaces auth.currentUser with the Google UID.
        legacy = await captureLegacyProfile(auth);
      }
    }
    const signed = await auth.signInWithCredential(credential);
    if (legacy) {
      try { await restoreLegacyProfile(auth, legacy); }
      catch (error) {
        console.warn('[ESI Account] legacy profile restore needs rule support:', error);
        window.ESIAccount.legacyMigrationWarning = true;
      }
    }
    return signed.user;
  }

  async function activateCentralIdentity(credential, sourceAuth) {
    const centralAuth = getCentralAuth();
    if (!centralAuth || !credential) return;
    // Apply the same Google credential to both ESI identity stores. Linking preserves
    // an existing anonymous UID where possible; an already-used Google credential
    // resolves to its existing account instead of creating a duplicate.
    await connectCredentialToProject(centralAuth, credential);

    const soloApp = firebase.apps.find(item => item.name === 'esiLeaderboardAccount') ||
      firebase.initializeApp({
        apiKey: 'AIzaSyD4wzJZUn5RFMWaj1IP5r2cNWFupYWV0',
        authDomain: 'leadersboard-7dacc.firebaseapp.com',
        databaseURL: 'https://leadersboard-7dacc-default-rtdb.firebaseio.com',
        projectId: 'leadersboard-7dacc',
        storageBucket: 'leadersboard-7dacc.firebasestorage.app',
        messagingSenderId: '855741214857',
        appId: '1:855741214857:web:d943c7c24d78ec581d5658'
      }, 'esiLeaderboardAccount');
    const soloAuth = soloApp.auth();
    await connectCredentialToProject(soloAuth, credential);

    if (centralAuth.currentUser && centralAuth.currentUser.email) {
      try {
        await syncSinglePlayerData(centralAuth);
      } catch (error) {
        console.warn('[ESI Account] solo cloud backup needs database permission', error);
        window.ESIAccount.syncWarning = true;
      }
    }
  }

  function setGoogleButtonLabel(button, message) {
    const label = button && button.querySelector('.esi-google-label');
    if (label) label.textContent = message;
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
      lockPageScroll(false);
      return;
    }
    if (user && !user.isAnonymous) {
      const profileNameField = document.getElementById('lbName') || document.getElementById('mpNameInput');
      if (profileNameField && !profileNameField.value && user.displayName) {
        profileNameField.value = user.displayName.replace(/[^A-Za-z0-9_ ]/g, '').replace(/\s+/g, ' ').trim().slice(0, profileNameField.maxLength || 10);
      }
      const label = user.displayName || user.email || 'Google account';
      // A persisted Google session must still show the prompt on a fresh visit.
      // Once the user completes sign-in on this visit, dismiss the overlay and
      // restore page scrolling instead of trapping them on the sign-in screen.
      if (dismissedThisPage) {
        root.hidden = true;
        lockPageScroll(false);
      } else {
        root.hidden = false;
        lockPageScroll(true);
        setStatus((user.email || label) + ' is saved. Continue with Google to refresh your ESI information.');
      }
      setGoogleButtonLabel(signInButton, 'Continue with Google');
      signInButton.disabled = false;
      signOutButton.style.display = 'none';
    } else if (user && user.isAnonymous) {
      root.hidden = false;
      lockPageScroll(true);
      setStatus('Your current progress is using a temporary account. Connect Google to secure this identity.');
      setGoogleButtonLabel(signInButton, 'Continue with Google');
      signInButton.disabled = false;
      signOutButton.style.display = 'none';
    } else {
      root.hidden = false;
      lockPageScroll(true);
      setStatus('Sign in with Google to connect this ESI section to your account.');
      setGoogleButtonLabel(signInButton, 'Continue with Google');
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
    setGoogleButtonLabel(button, 'Connecting…');
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
      // Mark this visit as authenticated before refreshing UI. The sign-in
      // prompt is a fresh-entry gate, not a post-authentication destination.
      dismissedThisPage = true;
      try { sessionStorage.setItem(PROMPT_SESSION_KEY, '1'); } catch (_) {}
      refreshUI(auth.currentUser);
      lockPageScroll(false);
      setStatus(window.ESIAccount.syncWarning
        ? 'Google account connected, but single-player cloud sync was blocked. Your local records have not been deleted.'
        : window.ESIAccount.legacyMigrationWarning
          ? 'Google account connected. Some older profile records could not be migrated; they remain in the previous profile.'
          : 'Google account connected. Your saved ESI account data has been restored where available.');
    } catch (error) {
      console.error('[ESI Account]', error);
      setStatus(error && error.message ? error.message : 'Google sign-in could not be completed. Please try again.');
      button.disabled = false;
      setGoogleButtonLabel(button, 'Continue with Google');
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
    let promptAlreadyShown = false;
    try {
      // The homepage is the entry point for a fresh website visit and every
      // normal APK launch. Reset the per-visit prompt there; other page changes
      // during the same visit do not repeatedly interrupt navigation.
      if (isHomePage()) {
        sessionStorage.removeItem(PROMPT_SESSION_KEY);
      }
      promptAlreadyShown = sessionStorage.getItem(PROMPT_SESSION_KEY) === '1';
      if (!promptAlreadyShown) sessionStorage.setItem(PROMPT_SESSION_KEY, '1');
    } catch (_) {}
    dismissedThisPage = promptAlreadyShown;
    ensureUI();
    if (promptAlreadyShown) {
      const existingRoot = document.getElementById('esiGoogleAccount');
      if (existingRoot) existingRoot.hidden = true;
      lockPageScroll(false);
    }
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
        dismissedThisPage = true;
        try { sessionStorage.setItem(PROMPT_SESSION_KEY, '1'); } catch (_) {}
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
      const centralAuth = getCentralAuth();
      const centralUser = centralAuth ? await waitForAuthReady(centralAuth) : null;
      if (centralUser && !centralUser.isAnonymous) {
        dismissedThisPage = true;
        try { sessionStorage.setItem(PROMPT_SESSION_KEY, '1'); } catch (_) {}
        refreshUI(centralUser);
      } else {
        refreshUI(auth.currentUser);
      }
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