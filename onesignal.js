/* Elite Scholar Institute — OneSignal Web SDK v16
   Public App ID only. The REST API key NEVER belongs in this file. */
(() => {
  const APP_ID = "c7be3202-494e-43dd-b47d-d969d65dd96f";

  // Use only the verified gateway. The other historical hostnames are
  // not this backend; retrying them masks the first useful network/CORS error
  // and can turn a real gateway response into a generic "Failed to fetch".
  const PUSH_GATEWAYS = [
    "https://elitescholarinstitute-api.onrender.com"
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
        allowLocalhostAsSecureOrigin: false,
        // Subdirectory scope so this worker does not replace the PWA worker
        // registered at "/". Official v16 custom-path setup.
        serviceWorkerPath: "onesignal/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/onesignal/" }
      });
      window.ESIOneSignal = OneSignal;
      readyResolve(OneSignal);
      scheduleESIPushReminderCheck();
    } catch (error) {
      console.error("[ESI OneSignal] initialization failed", error);
      readyReject(error);
    }
  });

  function getBrowserPermission() {
    return ("Notification" in window) ? Notification.permission : "unsupported";
  }

  function removeESIPushReminder() {
    const el = document.getElementById("esiPushReminder");
    if (el) el.remove();
  }

  function showESIPushReminder(permission, optedIn) {
    if (permission === "granted" && optedIn) {
      removeESIPushReminder();
      return;
    }
    if (document.getElementById("esiPushReminder")) return;

    const wrap = document.createElement("div");
    wrap.id = "esiPushReminder";
    wrap.style.cssText =
      "position:fixed;left:12px;right:12px;bottom:88px;z-index:99999;" +
      "background:#0d1b3e;color:#f2f6ff;border:1px solid #2a4d8f;" +
      "border-radius:14px;padding:12px 14px;box-shadow:0 8px 28px rgba(0,0,0,.45);" +
      "font:600 12px Poppins,Arial,sans-serif;display:flex;align-items:center;gap:10px;";

    const text = document.createElement("div");
    text.style.cssText = "flex:1;line-height:1.35;";

    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText =
      "border:0;border-radius:9px;padding:8px 11px;background:#ff8a00;" +
      "color:#1a0e00;font:800 11px Poppins,Arial,sans-serif;white-space:nowrap;";

    if (permission === "denied") {
      text.textContent = "ESI notifications are blocked by your browser.";
      button.textContent = "Settings";
      button.addEventListener("click", () => {
        alert("Notifications are blocked for ESI. Re-enable Notifications for this site in your browser settings, then return to ESI.");
      });
    } else if (permission === "granted" && !optedIn) {
      text.textContent = "Browser permission is on, but this device is not subscribed for background push.";
      button.textContent = "Subscribe";
      button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Subscribing…";
        try {
          const OneSignal = await window.ESIOneSignalReady;
          if (OneSignal?.User?.PushSubscription?.optIn) {
            await OneSignal.User.PushSubscription.optIn();
          }
          await refreshESIPushReminder();
        } catch (error) {
          console.error("[ESI OneSignal] re-subscribe failed", error);
          button.disabled = false;
          button.textContent = "Subscribe";
        }
      });
    } else {
      text.textContent = "Turn on ESI notifications so announcements can arrive when the site is closed.";
      button.textContent = "Enable";
      button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Enabling…";
        try {
          const result = await window.requestESIPushPermission();
          if (result === true || result === "granted") {
            removeESIPushReminder();
          } else {
            button.disabled = false;
            button.textContent = "Enable";
          }
        } catch (error) {
          console.error("[ESI OneSignal] permission request failed", error);
          button.disabled = false;
          button.textContent = "Enable";
        }
      });
    }

    wrap.append(text, button);
    document.body.appendChild(wrap);
  }

  async function refreshESIPushReminder() {
    try {
      const OneSignal = await window.ESIOneSignalReady;
      const browserPermission = getBrowserPermission();
      const optedIn = !!OneSignal?.User?.PushSubscription?.optedIn;
      if (browserPermission === "granted" && optedIn) removeESIPushReminder();
      else showESIPushReminder(browserPermission, optedIn);
    } catch (error) {
      console.warn("[ESI OneSignal] push status check failed", error);
    }
  }

  function scheduleESIPushReminderCheck() {
    setTimeout(refreshESIPushReminder, 1200);
    window.addEventListener("pageshow", refreshESIPushReminder);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshESIPushReminder();
    });
  }

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