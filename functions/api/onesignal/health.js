import { cors, json, preflight, getConstants } from "../../_lib/onesignal.js";

export async function onRequest({ request, env }) {
  const early = preflight(request);
  if (early) return early;
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const { ONE_SIGNAL_APP_ID, FIREBASE_PROJECT_ID } = getConstants();
  return json({
    ok: true,
    configured: Boolean(env.ONESIGNAL_REST_API_KEY),
    appId: ONE_SIGNAL_APP_ID,
    firebaseProject: FIREBASE_PROJECT_ID,
    version: "2026-10-16-cloudflare-pages-functions",
    audience: "All currently subscribed push users",
    hostname: new URL(request.url).host
  });
}