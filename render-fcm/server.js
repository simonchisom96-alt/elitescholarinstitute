const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const port = Number(process.env.PORT) || 10000;
const adminKey = process.env.ESI_NOTIFICATION_ADMIN_KEY || '';

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

function authorized(req) {
  return Boolean(adminKey) && req.get('x-esi-admin-key') === adminKey;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'esi-fcm', firebase: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) });
});

app.post('/send', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const body = req.body || {};
  const title = String(body.title || 'Elite Scholar Institute').trim().slice(0, 160);
  const messageBody = String(body.body || 'You have a new notification.').trim().slice(0, 2000);
  const path = String(body.path || '/notification.html').trim() || '/notification.html';

  try {
    getFirebaseApp();
    const messageId = await admin.messaging().send({
      topic: 'esi_all',
      data: {
        title,
        body: messageBody,
        path
      },
      webpush: {
        fcmOptions: {
          link: 'https://elitescholarinstitute.onrender.com/notification.html'
        }
      },
      android: {
        priority: 'high'
      }
    });

    res.json({ ok: true, messageId });
  } catch (error) {
    console.error('FCM send failed:', error);
    res.status(500).json({ ok: false, error: 'FCM send failed' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ESI FCM server listening on 0.0.0.0:${port}`);
});
