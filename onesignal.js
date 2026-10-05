/* Elite Scholar Institute — OneSignal Web SDK v16
   Public App ID only. The REST API key NEVER belongs in this file. */
(() => {
  const APP_ID = "c7be3202-494e-43dd-b47d-d969d65dd96f";

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
        serviceWorkerPath: "/onesignal/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/onesignal/" }
      });
      window.ESIOneSignal = OneSignal;

      // Foreground pop-downs are handled by ESI's own service worker in
      // password.js so Android/mobile browsers get a reliable native alert.
      // OneSignal remains responsible for background/closed-tab push delivery.

      readyResolve(OneSignal);
      scheduleESIPushReminderCheck();
    } catch (error) {
      console.error("[ESI OneSignal] initialization failed", error);
      readyReject(error);
    }
  });

  // Show a lightweight ESI reminder whenever push is not active.
  // The native browser permission prompt is requested only from the user's
  // click, because browsers can block unsolicited permission requests.
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
      text.textContent = "🔔 ESI notifications are blocked by your browser.";
      button.textContent = "Settings";
      button.addEventListener("click", () => {
        alert("Notifications are blocked for ESI. Re-enable Notifications for this site in your browser settings, then return to ESI.");
      });
    } else if (permission === "granted" && !optedIn) {
      // The browser permission is already granted. In this case there is
      // normally no browser permission popup to show; OneSignal can simply
      // opt the existing permission back in.
      text.textContent = "🔔 ESI notifications are turned off. Turn them back on?";
      button.textContent = "Enable";
      button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "Enabling…";
        try {
          const OneSignal = await window.ESIOneSignalReady;
          if (OneSignal?.User?.PushSubscription?.optIn) {
            await OneSignal.User.PushSubscription.optIn();
          }
          await refreshESIPushReminder();
        } catch (error) {
          console.error("[ESI OneSignal] re-subscribe failed", error);
          button.disabled = false;
          button.textContent = "Enable";
        }
      });
    } else {
      text.textContent = "🔔 Turn on ESI notifications so you don't miss announcements.";
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

      if (browserPermission === "granted" && optedIn) {
        removeESIPushReminder();
      } else {
        showESIPushReminder(browserPermission, optedIn);
      }
    } catch (error) {
      console.warn("[ESI OneSignal] push status check failed", error);
    }
  }

  function scheduleESIPushReminderCheck() {
    // Do not request permission automatically. Just re-check whenever the
    // user returns to/refreshes the page and offer a user-initiated prompt.
    setTimeout(refreshESIPushReminder, 1200);
    window.addEventListener("pageshow", refreshESIPushReminder);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshESIPushReminder();
    });
  }

  window.requestESIPushPermission = async function() {
    const OneSignal = await window.ESIOneSignalReady;
    if (!OneSignal.Notifications) throw new Error("OneSignal notifications are unavailable");
    await OneSignal.Notifications.requestPermission();
    return OneSignal.Notifications.permission;
  };

  window.sendESIPush = async function(payload = {}) {
    if (!window.auth || !auth.currentUser) {
      throw new Error("Admin authentication required");
    }

    const token = await auth.currentUser.getIdToken(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try{
      response = await fetch("https://elitescholarinstitute-api.onrender.com/api/onesignal/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify({
          title: String(payload.title || "Elite Scholar Institute").slice(0, 100),
          message: String(payload.message || "New announcement").slice(0, 4000),
          imageUrl: String(payload.imageUrl || "").slice(0, 2000),
          url: String(payload.url || "/notification.html").slice(0, 1000)
        })
      });
    }finally{
      clearTimeout(timeout);
    }

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Push delivery failed");
    }
    return result;
  };
})();
