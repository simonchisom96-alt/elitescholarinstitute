const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const port = Number(process.env.PORT) || 10000;
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://elitescholarinstitute.onrender.com';
const TARGET_PROJECT_ID = 'elite-notification';
const TOPIC = 'esi_all';

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

  if (serviceAccount.project_id && serviceAccount.project_id !== TARGET_PROJECT_ID) {
    throw new Error('Firebase service account belongs to project ' + serviceAccount.project_id + ', expected ' + TARGET_PROJECT_ID);
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: TARGET_PROJECT_ID,
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

function safeError(error) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || 'Unknown FCM error').trim();
  return { code, message };
}

app.get('/health', (_req, res) => {
  try {
    const appInstance = getFirebaseApp();
    const serviceAccount = appInstance.options.credential?.clientEmail || '';
    res.json({
      ok: true,
      service: 'esi-fcm',
      firebase: true,
      projectId: TARGET_PROJECT_ID,
      credentialConfigured: Boolean(serviceAccount)
    });
  } catch (error) {
    const detail = safeError(error);
    res.status(500).json({
      ok: false,
      service: 'esi-fcm',
      firebase: false,
      errorCode: detail.code || 'firebase-config-error',
      message: detail.message
    });
  }
});

app.post('/register', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token || token.length < 20) {
    return res.status(400).json({ ok: false, errorCode: 'invalid-token', message: 'Invalid FCM registration token' });
  }

  try {
    const response = await getFirebaseApp().messaging().subscribeToTopic([token], TOPIC);
    res.json({ ok: true, topic: TOPIC, successCount: response.successCount, failureCount: response.failureCount });
  } catch (error) {
    const detail = safeError(error);
    console.error('FCM registration failed:', detail);
    res.status(500).json({ ok: false, errorCode: detail.code || 'registration-failed', message: detail.message });
  }
});

app.post('/send', async (req, res) => {
  try {
    await requireAdmin(req);

    const body = req.body || {};
    const title = String(body.title || 'Elite Scholar Institute').trim().slice(0, 160);
    const messageBody = String(body.body || 'You have a new notification.').trim().slice(0, 2000);
    const path = String(body.path || '/notification.html').trim() || '/notification.html';

    let notificationData = body.notification;
    if (!notificationData || typeof notificationData !== 'object' || Array.isArray(notificationData)) {
      notificationData = {};
    }

    const type = String(notificationData.type || 'announcement').slice(0, 32);
    const notificationId = String(notificationData.id || notificationData.key || '').slice(0, 128);

    const fcmData = {
      title,
      body: messageBody,
      path,
      type,
      notificationId
    };

    const messageId = await getFirebaseApp().messaging().send({
      topic: TOPIC,
      android: {
        priority: 'high',
        notification: {
          title,
          body: messageBody,
          channelId: 'esi_fcm_notifications',
          sound: 'default'
        },
        data: fcmData
      },
      webpush: {
        data: fcmData,
        notification: {
          title,
          body: messageBody,
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          data: { path, type, notificationId }
        },
        fcmOptions: {
          link: 'https://elitescholarinstitute.onrender.com/notification.html'
        }
      }
    });

    res.json({ ok: true, messageId, topic: TOPIC });
  } catch (error) {
    const detail = safeError(error);
    console.error('FCM send failed:', detail);
    const forbidden = detail.message === 'Missing bearer token' || detail.message === 'Admin account required';
    res.status(forbidden ? 403 : 500).json({
      ok: false,
      errorCode: forbidden ? 'forbidden' : (detail.code || 'fcm-send-failed'),
      message: forbidden ? 'Forbidden' : detail.message
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ESI FCM server listening on 0.0.0.0:${port}`);
});
