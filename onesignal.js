/* Elite Scholar Institute — OneSignal Web SDK v16
   Public App ID only. The REST API key NEVER belongs in this file. */
(() => {
  const APP_ID = "c7be3202-494e-43dd-b47d-d969d65dd96f";

  // Use only the verified gateway. The other historical hostnames are
  // not this backend; retrying them masks the first useful network/CORS error
  // and can turn a real gateway response into a generic "Failed to fetch".
  const PUSH_GATEWAYS = [
    "https://esi-beams-api.onrender.com"
  ];
  window.ESI_PUSH_GATEWAYS = PUSH_GATEWAYS.slice();

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  let readyResolve, readyReject;
  window.ESIOneSignalReady = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  window.OneSignalDeferred.push(async function(OneSignal) {
    try {
      await OneSignal.init({
        appId: APP_ID,
        autoResubscribe: true,
        allowLocalhostAsSecureOrigin: false,
        // Subdirectory scope so this worker does not replace the PWA worker
        // registered at "/". Official v16 custom-path setup.
        serviceWorkerPath: "onesignal/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/onesignal/" }
      });
      window.ESIOneSignal = OneSignal;
      readyResolve(OneSignal);

      // HaniLearn pattern adapted to ESI's Firebase Auth: keep OneSignal's
      // external identity aligned with the currently signed-in Firebase user.
      // No HaniLearn app IDs, credentials, APIs, or backend are used here.
      const syncESIOneSignalIdentity = async user => {
        try {
          if (!user) {
            if (OneSignal.User?.externalId && typeof OneSignal.logout === "function") {
              await OneSignal.logout();
            }
            return;
          }
          const externalId = String(user.uid || "");
          if (externalId && OneSignal.User?.externalId !== externalId &&
              typeof OneSignal.login === "function") {
            await OneSignal.login(externalId);
          }
        } catch (identityError) {
          console.warn("[ESI OneSignal] identity sync failed", identityError);
        }
      };
      const bindESIFirebaseIdentity = () => {
        const firebaseAuth = window.auth;
        if (!firebaseAuth || typeof firebaseAuth.onAuthStateChanged !== "function") return false;
        firebaseAuth.onAuthStateChanged(user => { void syncESIOneSignalIdentity(user); });
        if (firebaseAuth.currentUser) void syncESIOneSignalIdentity(firebaseAuth.currentUser);
        return true;
      };
      // password.js exposes window.auth after Firebase initialization; retry
      // briefly rather than racing deferred script execution.
      let identityAttempts = 0;
      const identityTimer = setInterval(() => {
        identityAttempts++;
        if (bindESIFirebaseIdentity() || identityAttempts >= 40) clearInterval(identityTimer);
      }, 250);
    } catch (error) {
      console.error("[ESI OneSignal] initialization failed", error);
      readyReject(error);
    }
  });

  function getBrowserPermission() {
    return ("Notification" in window) ? Notification.permission : "unsupported";
  }

  // The automatic orange push-reminder banner has been removed. OneSignal
  // initialization and the explicit push helpers below remain available.

  async function waitForESIPushSubscription(OneSignal, timeoutMs = 20000) {
    const started = Date.now();
    let last = { optedIn: false, id: null, token: null };
    while (Date.now() - started < timeoutMs) {
      const sub = OneSignal?.User?.PushSubscription;
      last = {
        optedIn: !!sub?.optedIn,
        id: sub?.id || null,
        token: sub?.token || null
      };
      // Permission alone is not enough: OneSignal must have created a real
      // push subscription and issued its push token before we call this device subscribed.
      if (last.optedIn && last.id && last.token) return last;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return last;
  }

  window.requestESIPushPermission = async function() {
    const OneSignal = await window.ESIOneSignalReady;
    if (!OneSignal.Notifications) throw new Error("OneSignal notifications are unavailable");
    await OneSignal.Notifications.requestPermission();
    if (OneSignal.User?.PushSubscription?.optIn) {
      await OneSignal.User.PushSubscription.optIn();
    }
    const permission = OneSignal.Notifications.permission;
    if (permission !== true && permission !== "granted") return permission;
    const status = await waitForESIPushSubscription(OneSignal);
    if (!status.optedIn || !status.id || !status.token) {
      throw new Error("Browser permission is granted, but OneSignal has not created an active push subscription/token yet. Keep this ESI page open, check your connection, then tap Re-establish Push Subscription again.");
    }
    return permission;
  };

  window.getESIPushSubscription = async function() {
    const OneSignal = await window.ESIOneSignalReady;
    const sub = OneSignal?.User?.PushSubscription;
    return {
      permission: OneSignal?.Notifications?.permission || getBrowserPermission(),
      optedIn: !!sub?.optedIn,
      id: sub?.id || null,
      token: sub?.token || null
    };
  };

  window.sendESIPush = async function(payload = {}) {
    if (!window.auth || !auth.currentUser) {
      throw new Error("Admin authentication required");
    }

    const token = await auth.currentUser.getIdToken(true);
    const requestBody = JSON.stringify({
      title: String(payload.title || "Elite Scholar Institute").slice(0, 100),
      message: String(payload.message || "New announcement").slice(0, 4000),
      imageUrl: String(payload.imageUrl || "").slice(0, 2000),
      url: String(payload.url || "/notification.html").slice(0, 1000),
      subscriptionId: String(payload.subscriptionId || "").slice(0, 80)
    });

    let lastError = null;
    for (const baseUrl of PUSH_GATEWAYS) {
      const controller = new AbortController();
      // Render free-tier cold starts often exceed 8 seconds. Aborting early
      // made the feed look successful while OneSignal was never called.
      const timeout = setTimeout(() => controller.abort(), 55000);
      try {
        const response = await fetch(baseUrl + "/api/onesignal/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          credentials: "omit",
          signal: controller.signal,
          body: requestBody
        });

        const contentType = response.headers.get("content-type") || "";
        const result = contentType.includes("application/json")
          ? await response.json().catch(() => ({}))
          : {};

        if (response.ok && result.ok === true && result.id) {
          result.gateway = new URL(baseUrl).host;
          return result;
        }

        const detail = result.error ||
          (!response.ok ? ("HTTP " + response.status) : "Endpoint did not return a OneSignal notification id");
        const error = new Error("Push gateway " + baseUrl + ": " + detail);
        lastError = error;
        if (!response.ok && [404, 502, 503, 504].includes(response.status)) continue;
        if (!response.ok) throw error;
      } catch (error) {
        if (error.name === "AbortError") {
          lastError = new Error("Push gateway " + new URL(baseUrl).host + " timed out after 55s");
        } else if (error instanceof TypeError) {
          lastError = new Error("Could not reach " + new URL(baseUrl).host +
            ". Browser fetch failed before an HTTP response (possible CORS/preflight, network, or server connection failure). Check the gateway health result and Render logs.");
        } else {
          lastError = error;
        }
        if (error && error.message && /HTTP \d+/.test(error.message) &&
            !/HTTP (404|502|503|504)/.test(error.message)) throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new Error("Push gateway is unreachable");
  };
})();