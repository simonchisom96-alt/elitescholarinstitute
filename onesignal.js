/* Elite Scholar Institute — OneSignal Web SDK v16 */
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: "c7be3202-494e-43dd-b47d-d969d65dd96f",
    allowLocalhostAsSecureOrigin: false
  });
});

window.sendESIPush = async function(payload) {
  if (!window.auth || !auth.currentUser) throw new Error("Admin authentication required");
  const token = await auth.currentUser.getIdToken(true);
  const response = await fetch("/api/onesignal/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    body: JSON.stringify({
      title: payload.title || "Elite Scholar Institute",
      message: payload.message || "New announcement",
      url: payload.url || "/notification.html"
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Push delivery failed");
  return result;
};
