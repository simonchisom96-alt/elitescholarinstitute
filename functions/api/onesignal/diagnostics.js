import { cors, json, preflight, verifyFirebaseAdminToken, inspectOneSignalUser } from "../../_lib/onesignal.js";

export async function onRequest({ request, env }) {
  const early = preflight(request);
  if (early) return early;
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const admin = await verifyFirebaseAdminToken(request);
    return json(await inspectOneSignalUser(env, String(admin.sub)));
  } catch (error) {
    const status = error.statusCode && error.statusCode < 500 ? error.statusCode : 502;
    return json({
      configured: Boolean(env.ONESIGNAL_REST_API_KEY),
      api_reachable: false,
      error: error.message || "OneSignal diagnostics failed"
    }, status);
  }
}