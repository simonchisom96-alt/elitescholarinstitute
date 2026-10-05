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

let certCache = { expiresAt: 0, certs: {} };

const WEBSITE_ORIGIN = "https://elitescholarinstitute.onrender.com";

function applyCors(req, res) {
  const origin = req.headers.origin || "";
  if (origin === WEBSITE_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", WEBSITE_ORIGIN);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

  let maxAge = 3600;
  try {
    // The certificate endpoint normally supplies Cache-Control:max-age.
    // A conservative fallback is used if the header is unavailable.
    maxAge = 3600;
  } catch (_) {}

  certCache = {
    certs,
    expiresAt: Date.now() + Math.min(maxAge, 21600) * 1000
  };
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
  if (payload.email !== ADMIN_EMAIL || payload.email_verified !== true) {
    throw new Error("Admin account required");
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

function sendOneSignal(body) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) throw new Error("ONESIGNAL_REST_API_KEY is not configured on the server");

  const requestBody = JSON.stringify({
    app_id: ONE_SIGNAL_APP_ID,
    included_segments: ["All"],
    headings: { en: body.title },
    contents: { en: body.message },
    url: body.url,
    web_url: body.url
  });

  return new Promise((resolve, reject) => {
    const req = https.request("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Key " + apiKey,
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
          const detail = parsed.errors?.[0] || parsed.message || ("OneSignal HTTP " + res.statusCode);
          reject(new Error(String(detail)));
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
      firebaseProject: FIREBASE_PROJECT_ID
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
      const targetUrl = String(body.url || "/notification.html").trim();

      if (!title || !message) return json(res, 400, { error: "Notification title and message are required" });
      if (title.length > 100 || message.length > 4000 || targetUrl.length > 1000) {
        return json(res, 400, { error: "Notification payload is too large" });
      }

      // Only allow same-site relative destinations. This prevents the admin
      // broadcast endpoint from becoming a general external-link sender.
      if (!targetUrl.startsWith("/") || targetUrl.startsWith("//")) {
        return json(res, 400, { error: "Notification URL must be a same-site path" });
      }

      const absoluteUrl = WEBSITE_ORIGIN + targetUrl;
      const result = await sendOneSignal({ title, message, url: absoluteUrl });
      return json(res, 200, { ok: true, id: result.id || null, recipients: result.recipients ?? null });
    } catch (error) {
      console.error("[OneSignal]", error.message);
      return json(res, error.statusCode || 500, {
        error: error.message || "Push delivery failed"
      });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 404, { error: "Not found" });
  }

  const file = safePath(url.pathname);
  if (!file) return json(res, 400, { error: "Bad path" });

  fs.stat(file, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      return json(res, 404, { error: "File not found" });
    }
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

server.listen(PORT, HOST, () => {
  console.log("ESI server listening on " + HOST + ":" + PORT);
});
