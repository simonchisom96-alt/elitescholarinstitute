import { cors, json, preflight, readJson, sendOneSignal, verifyFirebaseAdminToken, getConstants } from "../../_lib/onesignal.js";

export async function onRequest({ request, env }) {
  const early = preflight(request);
  if (early) return early;
  const headers = cors(request);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const admin = await verifyFirebaseAdminToken(request);
    const body = await readJson(request);
    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    const targetUrl = String(body.url || "/notification.html").trim();
    const subscriptionId = String(body.subscriptionId || "").trim();
    const externalId = String(body.externalId || "").trim();

    if (!title || !message) return json({ error: "Notification title and message are required" }, 400);
    if (title.length > 100 || message.length > 4000 || imageUrl.length > 2000 || targetUrl.length > 1000) {
      return json({ error: "Notification payload is too large" }, 400);
    }
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) return json({ error: "Notification image URL must be public HTTPS" }, 400);
    if (!targetUrl.startsWith("/") || targetUrl.startsWith("//")) return json({ error: "Notification URL must be a same-site path" }, 400);
    if (subscriptionId && !/^[0-9a-f-]{16,80}$/i.test(subscriptionId)) {
      return json({ error: "Invalid OneSignal subscription id" }, 400);
    }
    if (subscriptionId && externalId) {
      return json({ error: "Choose one device target: subscriptionId or externalId, not both." }, 400);
    }
    // External-ID targeting is restricted to the authenticated ESI admin's own
    // Firebase UID. The admin endpoint cannot be used to message arbitrary users.
    if (externalId && (externalId.length > 128 || externalId !== String(admin.sub))) {
      return json({ error: "External ID must match the signed-in admin account." }, 403);
    }

    const { WEBSITE_ORIGIN } = getConstants();
    const result = await sendOneSignal(env, {
      title, message, imageUrl, url: WEBSITE_ORIGIN + targetUrl, subscriptionId, externalId
    });
    return json({
      ok: true, id: result.id, recipients: result.recipients ?? null,
      targeted: subscriptionId ? "subscription" : externalId ? "admin external ID" : "Subscribed Users",
      imageAttached: Boolean(imageUrl)
    }, 200);
  } catch (error) {
    console.error("[ESI OneSignal]", error?.message || error);
    const status = error.statusCode && error.statusCode < 500 ? error.statusCode : 502;
    return json({ error: error.message || "Push delivery failed" }, status);
  }
}