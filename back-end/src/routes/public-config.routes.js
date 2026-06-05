import { Router } from 'express';
import { getEnv } from '../config/env.js';
import { sendSuccess } from '../modules/shared/http/index.js';

export const publicConfigRouter = Router();

/**
 * Public Firebase web client configuration (not a secret; restricted by domain in Firebase console).
 */
publicConfigRouter.get('/firebase-web', (req, res) => {
  const env = getEnv();
  if (!env.FIREBASE_WEB_API_KEY || !env.FIREBASE_WEB_APP_ID) {
    return res.status(404).json({ success: false, message: 'Firebase web is not configured on this server' });
  }
  return sendSuccess(
    res,
    {
      apiKey: env.FIREBASE_WEB_API_KEY,
      authDomain: env.FIREBASE_WEB_AUTH_DOMAIN ?? null,
      projectId: env.FIREBASE_WEB_PROJECT_ID ?? null,
      storageBucket: env.FIREBASE_WEB_STORAGE_BUCKET ?? null,
      messagingSenderId: env.FIREBASE_WEB_MESSAGING_SENDER_ID ?? null,
      appId: env.FIREBASE_WEB_APP_ID,
      vapidKey: env.FIREBASE_WEB_VAPID_KEY ?? null,
    },
    { message: 'Firebase web configuration' },
  );
});
