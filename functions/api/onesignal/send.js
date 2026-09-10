const FIREBASE_API_KEY = 'AIzaSyDkjELsB4qeaumvsMAIDGIFZgNzl6eoBPM';
const FIREBASE_ADMIN_EMAIL = 'admin@elitescholarinstitute.app';
const ONESIGNAL_APP_ID = '6399359d-1281-4013-8914-b4ccb2e13382';

function json(data, status = 200, origin = '') {
  const headers = {
    'content-type': 'application/json; charset=UTF-8',
    'cache-control': 'no-store'
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-headers'] = 'content-type, authorization';
    headers['access-control-allow-methods'] = 'POST, OPTIONS';
    headers['vary'] = 'Origin';
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function allowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return [
    'https://elitescholarinstitute.onrender.com',
    'https://elitescholarinstitute.pages.dev'
  ].includes(origin) ? origin : '';
}

async function verifyFirebaseAdmin(idToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );

  if (!res.ok) return false;
  const data = await res.json();
  const user = Array.isArray(data.users) ? data.users[0] : null;
  return !!(user && user.email === FIREBASE_ADMIN_EMAIL && user.emailVerified !== false);
}

function buildMessage(data, origin) {
  const type = data && data.type;
  let body = '';

  if (type === 'poll') {
    body = `📊 ${data.poll?.question || 'New poll — vote now'}`;
  } else if (type === 'quiz') {
    body = `💡 ${data.quiz?.question || 'New quiz — answer now'}`;
  } else if (type === 'image') {
    body = data.text || '🖼️ New image update — view now';
  } else {
    body = data.text || 'New announcement — read now';
  }

  const message = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: 'push',
    included_segments: ['Subscribed Users'],
    headings: { en: 'Elite Scholar Institute' },
    contents: { en: body.slice(0, 4096) },
    url: type === 'poll' || type === 'quiz'
      ? `${origin}/notification.html`
      : `${origin}/index.html`,
    data: {
      esi_type: type || 'message'
    }
  };

  // OneSignal requires a publicly reachable image URL for Chrome web images.
  // Local data URLs from the composer are intentionally not sent as images.
  if (type === 'image' && typeof data.imageUrl === 'string' && /^https?:\/\//i.test(data.imageUrl)) {
    message.chrome_web_image = data.imageUrl;
  }

  return message;
}

export async function onRequestOptions(context) {
  const origin = allowedOrigin(context.request);
  return json({}, 204, origin);
}

export async function onRequestPost(context) {
  const origin = allowedOrigin(context.request);
  if (!origin) return json({ ok: false, error: 'Origin not allowed' }, 403);

  const authHeader = context.request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ ok: false, error: 'Missing Firebase admin token' }, 401, origin);
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken || !(await verifyFirebaseAdmin(idToken))) {
    return json({ ok: false, error: 'Admin authentication failed' }, 403, origin);
  }

  let data;
  try {
    data = await context.request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400, origin);
  }

  const payload = buildMessage(data, origin);
  const apiKey = context.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: 'OneSignal server key is not configured' }, 503, origin);
  }

  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'authorization': `Key ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { result = { raw: text }; }

  if (!response.ok) {
    return json({
      ok: false,
      error: result?.errors || result?.message || 'OneSignal rejected the notification'
    }, response.status, origin);
  }

  return json({
    ok: true,
    onesignalId: result?.id || null,
    warning: result?.id ? null : 'OneSignal accepted the request but created no message, usually because there are no valid subscribed recipients.'
  }, 200, origin);
}
