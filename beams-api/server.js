const http = require('node:http');

const PORT = Number(process.env.PORT || 10000);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://elitescholarinstitute.onrender.com';
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;
const BEAMS_INSTANCE_ID = process.env.BEAMS_INSTANCE_ID;
const BEAMS_SECRET_KEY = process.env.BEAMS_SECRET_KEY;
const ADMIN_EMAIL = 'admin@elitescholarinstitute.app';
const BEAMS_INTEREST = 'esi-announcements';
const DEEP_LINK = 'https://elitescholarinstitute.onrender.com/notification.html';
const MAX_BODY_BYTES = 64 * 1024;

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (_) {
        reject(Object.assign(new Error('Invalid JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

async function verifyFirebaseAdmin(idToken) {
  if (!FIREBASE_WEB_API_KEY) throw new Error('FIREBASE_WEB_API_KEY is not configured');

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data.users) || !data.users[0]) {
    const err = new Error('Firebase token verification failed');
    err.statusCode = 401;
    throw err;
  }

  const user = data.users[0];
  if (user.disabled) {
    const err = new Error('Firebase admin account is disabled');
    err.statusCode = 403;
    throw err;
  }
  if (String(user.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    const err = new Error('Admin access required');
    err.statusCode = 403;
    throw err;
  }
  return user;
}

async function publishToBeams(title, body, priority) {
  if (!BEAMS_INSTANCE_ID || !BEAMS_SECRET_KEY) {
    const err = new Error('Beams server credentials are not configured');
    err.statusCode = 503;
    throw err;
  }

  const response = await fetch(
    `https://${BEAMS_INSTANCE_ID}.pushnotifications.pusher.com/publish_api/v1/instances/${BEAMS_INSTANCE_ID}/publishes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BEAMS_SECRET_KEY}`
      },
      body: JSON.stringify({
        interests: [BEAMS_INTEREST],
        web: {
          notification: {
            title,
            body,
            deep_link: DEEP_LINK
          }
        },
        fcm: {
          notification: {
            title,
            body
          }
        },
        apns: {
          aps: {
            alert: { title, body },
            sound: 'default'
          }
        },
        data: {
          priority: priority || 'normal',
          deep_link: DEEP_LINK
        }
      })
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error('Pusher Beams publish failed');
    err.statusCode = response.status >= 500 ? 502 : 400;
    throw err;
  }
  return data;
}

async function handlePublish(req, res) {
  const authHeader = String(req.headers.authorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return json(res, 401, { ok: false, error: 'Authentication required' });

  try {
    await verifyFirebaseAdmin(match[1]);
    const input = await readJson(req);

    const title = String(input.title || 'Elite Scholar Institute').trim().slice(0, 120);
    const body = String(input.body || '').trim().slice(0, 500);
    const priority = String(input.priority || 'normal').trim().slice(0, 20);

    if (!body) return json(res, 400, { ok: false, error: 'Notification body is required' });

    const result = await publishToBeams(title, body, priority);
    return json(res, 200, {
      ok: true,
      publishId: result.publishId || null
    });
  } catch (error) {
    console.error('[beams-api]', error.message);
    return json(res, Number(error.statusCode || 500), {
      ok: false,
      error: error.statusCode && error.statusCode < 500 ? error.message : 'Notification service unavailable'
    });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, service: 'esi-beams-api' });
  if (req.method === 'POST' && req.url === '/publish') return handlePublish(req, res);
  return json(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ESI Beams API listening on ${PORT}`);
});
