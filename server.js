/* Elite Scholar Institute — secure OneSignal gateway
   Node 18+ / Render Web Service
   The OneSignal REST key is read ONLY from process.env.ONESIGNAL_REST_API_KEY.
*/
"use strict";

const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 10000);
const HOST = "0.0.0.0";
const ONE_SIGNAL_APP_ID = "c7be3202-494e-43dd-b47d-d969d65dd96f";
const FIREBASE_PROJECT_ID = "elite-notification";
const ADMIN_EMAIL = "admin@elitescholarinstitute.app";
const MAX_BODY = 64 * 1024;
const ROOT = __dirname;
const GATEWAY_VERSION = "2026-10-09-background-push";

let certCache = { expiresAt: 0, certs: {} };

const WEBSITE_ORIGIN = "https://elitescholarinstitute.onrender.com";
const WEB_ICON = WEBSITE_ORIGIN + "/logo.jpg";

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  if (origin === WEBSITE_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", WEBSITE_ORIGIN);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "600");
  }
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function getBearer(req) {
  const value = req.headers.authorization || "";
  return /^Bearer\s+(.+)$/i.exec(value)?.[1] || null;
}

function base64urlDecode(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4), "base64");
}

function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid Firebase token");
  return {
    header: JSON.parse(base64urlDecode(parts[0]).toString("utf8")),
    payload: JSON.parse(base64urlDecode(parts[1]).toString("utf8")),
    signingInput: parts[0] + "." + parts[1],
    signature: base64urlDecode(parts[2])
  };
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "ESI-OneSignal-Gateway/1.0" } }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error("Certificate service returned HTTP " + res.statusCode));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch (_) { reject(new Error("Invalid certificate response")); }
      });
    }).on("error", reject);
  });
}

async function getGoogleCerts() {
  if (Date.now() < certCache.expiresAt && Object.keys(certCache.certs).length) {
    return certCache.certs;
  }
  const certUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
  const certs = await httpsGetJson(certUrl);
  certCache = { certs, expiresAt: Date.now() + 3600 * 1000 };
  return certs;
}

async function verifyFirebaseAdminToken(token) {
  const { header, payload, signingInput, signature } = parseJwt(token);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Invalid token algorithm");
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error("Invalid token audience");
  if (payload.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID) throw new Error("Invalid token issuer");
  if (!payload.sub || typeof payload.sub !== "string" || payload.sub.length > 128) throw new Error("Invalid token subject");
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) throw new Error("Token expired");
  if (typeof payload.iat !== "number" || payload.iat > now + 300) throw new Error("Invalid token issue time");
  const certs = await getGoogleCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error("Unknown token signing key");
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();
  if (!verifier.verify(cert, signature)) throw new Error("Invalid token signature");
  // Keep authorization restricted to the exact configured Firebase email.
  // Email verification is intentionally not required for this admin account.
  if (payload.email !== ADMIN_EMAIL) {
    throw Object.assign(new Error("Admin account required: sign in with the configured ESI admin email."), { statusCode: 403 });
  }
  return payload;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.setEncoding("utf8");
    req.on("data", chunk => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("Request too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (_) { reject(Object.assign(new Error("Invalid JSON"), { statusCode: 400 })); }
    });
    req.on("error", reject);
  });
}

function onesignalError(parsed, statusCode) {
  const errors = Array.isArray(parsed.errors) ? parsed.errors.join("; ") : (parsed.errors ? JSON.stringify(parsed.errors) : "");
  return errors || parsed.message || ("OneSignal HTTP " + statusCode);
}

function postOneSignal(requestBody, authorization) {
  return new Promise((resolve, reject) => {
    const req = https.request("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": authorization,
        "Content-Length": Buffer.byteLength(requestBody)
      }
    }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        let parsed = {};
        try { parsed = data ? JSON.parse(data) : {}; } catch (_) {}
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(Object.assign(new Error(onesignalError(parsed, res.statusCode)), { statusCode: res.statusCode }));
          return;
        }
        resolve(parsed);
      });
    });
    req.on("error", reject);
    req.write(requestBody);
    req.end();
  });
}

function buildOneSignalPayload(body) {
  const payload = {
    app_id: ONE_SIGNAL_APP_ID,
    target_channel: "push",
    name: body.subscriptionId ? "ESI device test" : "ESI Announcement",
    headings: { en: body.title },
    contents: { en: body.message },
    url: body.url,
    web_url: body.url,
    ttl: 2419200,
    priority: 10,
    chrome_web_icon: WEB_ICON,
    firefox_icon: WEB_ICON,
    data: { url: body.url }
  };
  if (body.subscriptionId) {
    // Device tests must not broadcast. This field cannot be combined with segments.
    payload.include_subscription_ids = [body.subscriptionId];
  } else {
    // Official default segment for eligible push subscribers.
    // "All" is only a shorthand in some SDK docs and is not the documented segment.
    payload.included_segments = ["Subscribed Users"];
  }
  if (body.imageUrl) {
    payload.chrome_web_image = body.imageUrl;
    payload.big_picture = body.imageUrl;
  }
  return payload;
}

async function sendOneSignal(body) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) throw new Error("ONESIGNAL_REST_API_KEY is not configured on the server");
  const requestBody = JSON.stringify(buildOneSignalPayload(body));
  const schemes = /^(Key|Basic)\s+/i.test(apiKey)
    ? [apiKey]
    : ["Key " + apiKey, "Basic " + apiKey];
  let lastError = null;
  for (const authorization of schemes) {
    try {
      const parsed = await postOneSignal(requestBody, authorization);
      if (typeof parsed.id !== "string" || !parsed.id.trim()) {
        throw new Error(onesignalError(parsed, 200) || "OneSignal created no notification ID. Check Audience > Subscriptions.");
      }
      if (typeof parsed.recipients === "number" && parsed.recipients < 1) {
        throw new Error("OneSignal accepted the request but matched zero subscriptions. This device is not an eligible push subscriber yet.");
      }
      return parsed;
    } catch (error) {
      lastError = error;
      const authFailure = error.statusCode === 401 || error.statusCode === 403 || /unauthorized|invalid api key|access denied/i.test(error.message || "");
      if (!authFailure || authorization === schemes[schemes.length - 1]) throw error;
    }
  }
  throw lastError || new Error("OneSignal request failed");
}

function safePath(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch (_) { return null; }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const full = path.resolve(ROOT, relative);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
  return full;
}

const MIME = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8",
  ".xml":"application/xml; charset=utf-8", ".txt":"text/plain; charset=utf-8",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp",
  ".svg":"image/svg+xml", ".ico":"image/x-icon", ".pdf":"application/pdf",
  ".mp4":"video/mp4", ".woff":"font/woff", ".woff2":"font/woff2"
};

async function handle(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    if (req.headers.origin !== WEBSITE_ORIGIN) return json(res, 403, { error: "Origin not allowed" });
    return json(res, 204, {});
  }
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  if (req.method === "GET" && url.pathname === "/api/onesignal/health") {
    return json(res, 200, {
      ok: true,
      configured: Boolean(process.env.ONESIGNAL_REST_API_KEY),
      appId: ONE_SIGNAL_APP_ID,
      firebaseProject: FIREBASE_PROJECT_ID,
      version: GATEWAY_VERSION,
      audience: "Subscribed Users",
      hostname: req.headers.host || ""
    });
  }
  if (url.pathname === "/api/onesignal/send") {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    try {
      const token = getBearer(req);
      if (!token) return json(res, 401, { error: "Missing Firebase authorization" });
      await verifyFirebaseAdminToken(token);
      const body = await readBody(req);
      const title = String(body.title || "").trim();
      const message = String(body.message || "").trim();
      const imageUrl = String(body.imageUrl || "").trim();
      const targetUrl = String(body.url || "/notification.html").trim();
      const subscriptionId = String(body.subscriptionId || "").trim();
      if (!title || !message) return json(res, 400, { error: "Notification title and message are required" });
      if (title.length > 100 || message.length > 4000 || imageUrl.length > 2000 || targetUrl.length > 1000) {
        return json(res, 400, { error: "Notification payload is too large" });
      }
      if (imageUrl && !/^https:\/\//i.test(imageUrl)) return json(res, 400, { error: "Notification image URL must be public HTTPS" });
      if (!targetUrl.startsWith("/") || targetUrl.startsWith("//")) return json(res, 400, { error: "Notification URL must be a same-site path" });
      if (subscriptionId && !/^[0-9a-f-]{16,80}$/i.test(subscriptionId)) {
        return json(res, 400, { error: "Invalid OneSignal subscription id" });
      }
      const absoluteUrl = WEBSITE_ORIGIN + targetUrl;
      const result = await sendOneSignal({ title, message, imageUrl, url: absoluteUrl, subscriptionId });
      return json(res, 200, {
        ok: true,
        id: result.id,
        recipients: result.recipients ?? null,
        targeted: subscriptionId ? "subscription" : "Subscribed Users",
        imageAttached: Boolean(imageUrl)
      });
    } catch (error) {
      console.error("[OneSignal]", error.message);
      return json(res, error.statusCode && error.statusCode < 500 ? error.statusCode : 502, { error: error.message || "Push delivery failed" });
    }
  }
  if (req.method !== "GET" && req.method !== "HEAD") return json(res, 404, { error: "Not found" });
  const file = safePath(url.pathname);
  if (!file) return json(res, 400, { error: "Bad path" });
  fs.stat(file, (statErr, stat) => {
    if (statErr || !stat.isFile()) return json(res, 404, { error: "File not found" });
    const headers = {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    };
    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(error => {
    console.error("[server]", error);
    if (!res.headersSent) json(res, 500, { error: "Internal server error" });
    else res.end();
  });
});
server.listen(PORT, HOST, () => console.log("ESI server listening on " + HOST + ":" + PORT));