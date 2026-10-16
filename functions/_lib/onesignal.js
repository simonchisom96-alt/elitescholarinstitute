const ONE_SIGNAL_APP_ID = "c7be3202-494e-43dd-b47d-d969d65dd96f";
const FIREBASE_PROJECT_ID = "elite-notification";
const ADMIN_EMAIL = "admin@elitescholarinstitute.app";
const WEBSITE_ORIGIN = "https://elitescholarinstitute.pages.dev";
const WEB_ICON = WEBSITE_ORIGIN + "/logo.jpg";
const MAX_BODY = 64 * 1024;

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function cors(request) {
  const origin = request.headers.get("Origin") || "";
  const headers = new Headers();
  if (origin === WEBSITE_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", WEBSITE_ORIGIN);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Access-Control-Max-Age", "600");
  }
  return headers;
}

export function preflight(request) {
  if (request.method !== "OPTIONS") return null;
  if (request.headers.get("Origin") !== WEBSITE_ORIGIN) {
    return json({ error: "Origin not allowed" }, 403);
  }
  const headers = cors(request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(null, { status: 204, headers });
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJsonPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

let jwksCache = { expiresAt: 0, keys: [] };

async function getGoogleSigningKeys() {
  if (Date.now() < jwksCache.expiresAt && jwksCache.keys.length) return jwksCache.keys;
  const response = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) }
  );
  if (!response.ok) throw new Error("Could not retrieve Firebase signing keys");
  const data = await response.json();
  if (!Array.isArray(data.keys)) throw new Error("Invalid Firebase signing-key response");
  jwksCache = { keys: data.keys, expiresAt: Date.now() + 50 * 60 * 1000 };
  return jwksCache.keys;
}

export async function verifyFirebaseAdminToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) throw Object.assign(new Error("Missing Firebase authorization"), { statusCode: 401 });

  const parts = match[1].split(".");
  if (parts.length !== 3) throw Object.assign(new Error("Invalid Firebase token"), { statusCode: 401 });

  let header, payload, signature;
  try {
    header = decodeJsonPart(parts[0]);
    payload = decodeJsonPart(parts[1]);
    signature = decodeBase64Url(parts[2]);
  } catch (_) {
    throw Object.assign(new Error("Invalid Firebase token"), { statusCode: 401 });
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw Object.assign(new Error("Invalid token algorithm"), { statusCode: 401 });
  }
  if (payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID) {
    throw Object.assign(new Error("Invalid token audience or issuer"), { statusCode: 401 });
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 128 ||
      typeof payload.exp !== "number" || payload.exp <= now ||
      typeof payload.iat !== "number" || payload.iat > now + 300) {
    throw Object.assign(new Error("Expired or invalid Firebase token"), { statusCode: 401 });
  }

  const jwks = await getGoogleSigningKeys();
  const jwk = jwks.find(key => key.kid === header.kid && key.alg === "RS256");
  if (!jwk) throw Object.assign(new Error("Unknown Firebase token signing key"), { statusCode: 401 });

  const publicKey = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature,
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!valid) throw Object.assign(new Error("Invalid Firebase token signature"), { statusCode: 401 });
  if (payload.email !== ADMIN_EMAIL) {
    throw Object.assign(new Error("Admin account required: sign in with the configured ESI admin email."), { statusCode: 403 });
  }
  return payload;
}

function apiAuthorization(rawKey) {
  return /^(Key|Basic)\s+/i.test(rawKey) ? rawKey : "Key " + rawKey;
}

function oneSignalError(data, status) {
  const errors = Array.isArray(data?.errors) ? data.errors.join("; ") :
    (data?.errors ? JSON.stringify(data.errors) : "");
  return errors || data?.message || ("OneSignal HTTP " + status);
}

export async function sendOneSignal(env, body) {
  const rawKey = env.ONESIGNAL_REST_API_KEY;
  if (!rawKey) throw new Error("ONESIGNAL_REST_API_KEY is not configured in Cloudflare Pages secrets");

  const payload = {
    app_id: ONE_SIGNAL_APP_ID,
    target_channel: "push",
    name: body.subscriptionId ? "ESI device test" : "ESI Announcement",
    headings: { en: body.title },
    contents: { en: body.message },
    // Set both URL fields so web push uses the intended click target across
    // OneSignal API response/schema variants. Keep a 28-day TTL so push services
    // can retain a message while a subscribed device is temporarily offline.
    url: body.url,
    web_url: body.url,
    ttl: 2419200,
    priority: 10,
    chrome_web_icon: WEB_ICON,
    firefox_icon: WEB_ICON,
    data: { url: body.url }
  };
  if (body.subscriptionId) {
    payload.include_subscription_ids = [body.subscriptionId];
  } else if (body.externalId) {
    // The SDK's subscription ID can briefly be stale while OneSignal is
    // merging a newly opted-in browser subscription. Targeting the verified
    // external user lets OneSignal select that user's active push subscription(s).
    payload.include_aliases = { external_id: [body.externalId] };
  } else {
    // Broadcasts always target OneSignal's canonical active push audience.
    payload.included_segments = ["Subscribed Users"];
  }
  if (body.imageUrl) {
    payload.chrome_web_image = body.imageUrl;
    payload.big_picture = body.imageUrl;
  }

  const authOptions = /^(Key|Basic)\s+/i.test(rawKey) ? [rawKey] : ["Key " + rawKey, "Basic " + rawKey];
  let lastError;
  for (let i = 0; i < authOptions.length; i++) {
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": authOptions[i]
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      if (typeof data.id !== "string" || !data.id.trim()) {
        throw new Error(oneSignalError(data, response.status) || "OneSignal returned no notification ID");
      }
      if (typeof data.recipients === "number" && data.recipients < 1) {
        throw new Error("OneSignal accepted the request but matched zero subscriptions.");
      }
      return data;
    }
    lastError = Object.assign(new Error(oneSignalError(data, response.status)), { statusCode: response.status });
    const authFailure = response.status === 401 || response.status === 403 ||
      /unauthorized|invalid api key|access denied/i.test(lastError.message);
    if (!authFailure || i === authOptions.length - 1) throw lastError;
  }
  throw lastError || new Error("OneSignal request failed");
}

export async function readJson(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY) {
    throw Object.assign(new Error("Request too large"), { statusCode: 413 });
  }
  try { return text ? JSON.parse(text) : {}; }
  catch (_) { throw Object.assign(new Error("Invalid JSON"), { statusCode: 400 }); }
}

export function getConstants() {
  return { ONE_SIGNAL_APP_ID, FIREBASE_PROJECT_ID, WEBSITE_ORIGIN };
}

export async function inspectOneSignalUser(env, externalId) {
  const rawKey = env.ONESIGNAL_REST_API_KEY;
  if (!rawKey) return { configured: false, api_reachable: false, error: "ONESIGNAL_REST_API_KEY is not configured in Cloudflare Pages secrets" };
  const endpoint = "https://api.onesignal.com/apps/" + encodeURIComponent(ONE_SIGNAL_APP_ID) +
    "/users/by/external_id/" + encodeURIComponent(externalId);
  try {
    const response = await fetch(endpoint, {
      headers: { "Authorization": apiAuthorization(rawKey), "Accept": "application/json" },
      signal: AbortSignal.timeout(12000)
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) {
      return { configured: true, api_reachable: true, found: false, active_push_subscriptions: 0, subscriptions: [] };
    }
    if (!response.ok) return { configured: true, api_reachable: false, error: oneSignalError(data, response.status) };
    const subscriptions = Array.isArray(data?.subscriptions) ? data.subscriptions : [];
    const active = subscriptions.filter(s => {
      const type = String(s.type || "").toLowerCase();
      return type.includes("push") && Boolean(s.enabled) && Boolean(s.token) &&
        (typeof s.notification_types !== "number" || s.notification_types > 0);
    });
    return {
      configured: true, api_reachable: true, found: true,
      active_push_subscriptions: active.length,
      subscriptions: subscriptions.map(s => ({
        id: String(s.id || ""), type: String(s.type || ""),
        enabled: Boolean(s.enabled), token_present: Boolean(s.token),
        notification_types: typeof s.notification_types === "number" ? s.notification_types : null
      }))
    };
  } catch (error) {
    return { configured: true, api_reachable: false, error: error.message || "OneSignal diagnostics request failed" };
  }
}
