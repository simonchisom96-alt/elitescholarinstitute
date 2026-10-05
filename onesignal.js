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

      // OneSignal can receive a push while the ESI tab is in the foreground.
      // Explicitly display it so the notification still pops up on-screen.
      if (OneSignal.Notifications?.addEventListener) {
        OneSignal.Notifications.addEventListener("foregroundWillDisplay", event => {
          try {
            event?.notification?.display?.();
          } catch (e) {
            console.warn("[ESI OneSignal] foreground display failed", e);
          }
        });
      }

      readyResolve(OneSignal);
    } catch (error) {
      console.error("[ESI OneSignal] initialization failed", error);
      readyReject(error);
    }
  });

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
    const response = await fetch("https://elitescholarinstitute-api.onrender.com/api/onesignal/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      credentials: "same-origin",
      body: JSON.stringify({
        title: String(payload.title || "Elite Scholar Institute").slice(0, 100),
        message: String(payload.message || "New announcement").slice(0, 4000),
        url: String(payload.url || "/notification.html").slice(0, 1000)
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Push delivery failed");
    }
    return result;
  };
})();
