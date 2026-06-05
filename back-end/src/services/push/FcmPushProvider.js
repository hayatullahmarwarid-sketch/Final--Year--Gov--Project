import admin from 'firebase-admin';
import { PushProvider } from './PushProvider.js';
import { getEnv } from '../../config/env.js';
import { getLogger } from '../../config/logger.js';

/** @type {boolean} */
let initialized = false;

function ensureApp() {
  if (initialized) return true;
  const env = getEnv();
  const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !String(raw).trim()) return false;
  try {
    const json = JSON.parse(String(raw));
    admin.initializeApp({
      credential: admin.credential.cert(json),
    });
    initialized = true;
    return true;
  } catch (err) {
    getLogger().warn({ err }, 'push.fcm.init_failed');
    return false;
  }
}

export function isFcmConfigured() {
  const env = getEnv();
  return Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON && String(env.FIREBASE_SERVICE_ACCOUNT_JSON).trim());
}

/**
 * Firebase Cloud Messaging (firebase-admin).
 *
 * @typedef {import('./PushProvider.js').PushMessage} PushMessage
 * @typedef {import('./PushProvider.js').PushResult} PushResult
 */

/**
 * @param {Record<string, unknown> | undefined} data
 */
function stringifyData(data) {
  if (!data || typeof data !== 'object') return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[String(k)] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

/**
 * @param {string} token
 * @param {unknown} err
 * @returns {import('./PushProvider.js').PushResult}
 */
function mapSendError(token, err) {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String(/** @type {{ code?: unknown }} */ (err).code)
      : 'unknown';
  const stale =
    code.includes('registration-token-not-registered') ||
    code.includes('invalid-registration-token') ||
    code.includes('invalid-argument');
  return {
    token,
    status: /** @type {'error'} */ ('error'),
    error: code,
    stale,
  };
}

export class FcmPushProvider extends PushProvider {
  get providerName() {
    return 'fcm';
  }

  /**
   * @param {PushMessage[]} messages
   * @returns {Promise<PushResult[]>}
   */
  async send(messages) {
    if (!ensureApp()) {
      return messages.map((m) => ({
        token: m.token,
        status: 'error',
        error: 'fcm_not_configured',
      }));
    }

    const messaging = admin.messaging();

    /** @type {Map<string, PushMessage[]>} */
    const groups = new Map();
    for (const m of messages) {
      const key = `${m.title}\u0000${m.body}\u0000${JSON.stringify(m.data ?? {})}`;
      const arr = groups.get(key);
      if (arr) arr.push(m);
      else groups.set(key, [m]);
    }

    /** @type {PushResult[]} */
    const out = [];

    for (const [, group] of groups) {
      const first = group[0];
      const dataPayload = stringifyData(first.data);
      const chunkSize = 500;
      for (let i = 0; i < group.length; i += chunkSize) {
        const slice = group.slice(i, i + chunkSize);
        try {
          const resp = await messaging.sendEachForMulticast({
            tokens: slice.map((m) => m.token),
            notification: { title: first.title, body: first.body },
            data: dataPayload,
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
            webpush: {
              notification: { title: first.title, body: first.body },
              headers: { Urgency: 'high' },
            },
          });
          resp.responses.forEach((r, idx) => {
            const tok = slice[idx].token;
            if (r.success) out.push({ token: tok, status: 'ok' });
            else out.push(mapSendError(tok, r.error));
          });
        } catch (err) {
          getLogger().warn({ err }, 'push.fcm.batch_failed');
          for (const m of slice) {
            out.push({ token: m.token, status: 'error', error: 'batch_failed' });
          }
        }
      }
    }

    return out;
  }
}
