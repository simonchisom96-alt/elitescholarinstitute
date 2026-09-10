const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const port = Number(process.env.PORT) || 10000;
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://elitescholarinstitute.onrender.com';

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function getFirebaseApp() {
  if (admin.apps.length) return admin.app();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://elite-notification-default-rtdb.firebaseio.com'
  });
}

async function requireAdmin(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) throw new Error('Missing bearer token');
  const idToken = header.slice(7).trim();
  if (!idToken) throw new Error('Missing bearer token');

  const decoded = await getFirebaseApp().auth().verifyIdToken(idToken);
  if (decoded.email !== 'admin@elitescholarinstitute.app') throw new Error('Admin account required');
  return decoded;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'esi-fcm', firebase: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) });
});

app.post('/send', async (req, res) => {
  try {
    await requireAdmin(req);

    const body = req.body || {};
    const title = String(body.title || 'Elite Scholar Institute').trim().slice(0, 160);
    const messageBody = String(body.body || 'You have a new notification.').trim().slice(0, 2000);
    const path = String(body.path || '/notification.html').trim() || '/notification.html';

    const messageId = await getFirebaseApp().messaging().send({
      topic: 'esi_all',
      android: {
        priority: 'high',
        data: { title, body: messageBody, path }
      },
      webpush: {
        notification: {
          title,
          body: messageBody,
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          data: { path }
        },
        fcmOptions: {
          link: 'https://elitescholarinstitute.onrender.com/notification.html'
        }
      }
    });

    res.json({ ok: true, messageId });
  } catch (error) {
    console.error('FCM send failed:', error && error.message);
    const forbidden = error && (error.message === 'Missing bearer token' || error.message === 'Admin account required');
    res.status(forbidden ? 403 : 500).json({ ok: false, error: forbidden ? 'Forbidden' : 'FCM send failed' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ESI FCM server listening on 0.0.0.0:${port}`);
});
