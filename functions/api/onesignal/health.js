import { cors, json, preflight, getConstants } from "../../_lib/onesignal.js";

export async function onRequest({ request, env }) {
  const early = preflight(request);
  if (early) return early;
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const { ONE_SIGNAL_APP_ID, FIREBASE_PROJECT_ID } = getConstants();
  const rawKey = String(env.ONESIGNAL_REST_API_KEY || "").trim();
  let apiKeyValid = false;
  let apiKeyCheck = "missing";
  let apiKeyError = null;

  // A configured secret is not necessarily a valid OneSignal REST API key.
  // Verify it against the same OneSignal app without ever returning the key.
  if (rawKey) {
    apiKeyCheck = "checking";
    try {
      const authorization = /^(Key|Basic)\\s+/i.test(rawKey) ? rawKey : "Key " + rawKey;
      const response = await fetch(
        "https://api.onesignal.com/apps/" + encodeURIComponent(ONE_SIGNAL_APP_ID),
        {
          method: "GET",
          headers: { "Authorization": authorization, "Accept": "application/json" },
          signal: AbortSignal.timeout(10000)
        }
      );
      apiKeyValid = response.ok;
      apiKeyCheck = response.ok ? "valid" : "rejected";
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errors = Array.isArray(data?.errors) ? data.errors.join("; ") :
          (data?.errors ? JSON.stringify(data.errors) : "");
        apiKeyError = errors || data?.message || ("OneSignal credential check returned HTTP " + response.status);
      }
    } catch (error) {
      apiKeyCheck = "unreachable";
      apiKeyError = error?.message || "Could not contact OneSignal to validate the REST API key";
    }
  }

  return json({
    ok: true,
    configured: Boolean(rawKey),
    apiKeyValid,
    apiKeyCheck,
    apiKeyError,
    appId: ONE_SIGNAL_APP_ID,
    firebaseProject: FIREBASE_PROJECT_ID,
    version: "2026-10-16-cloudflare-pages-functions-key-check",
    audience: "All currently subscribed push users",
    hostname: new URL(request.url).host
  });
}