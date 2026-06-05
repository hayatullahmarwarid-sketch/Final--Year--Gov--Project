import { getLogger } from '../../config/logger.js';
import { PushProvider } from './PushProvider.js';

/**
 * Expo Push Service client. Uses the public HTTPS API described at
 * https://docs.expo.dev/push-notifications/sending-notifications/ so we don't need the
 * `expo-server-sdk` dependency. Supports batching (max 100 per request).
 *
 * This is the default provider because the mobile app is Expo-built and Expo's push gateway
 * forwards to APNs + FCM transparently.
 */
export class ExpoPushProvider extends PushProvider {
  /**
   * @param {{ accessToken?: string, endpoint?: string }} [options]
   */
  constructor(options = {}) {
    super();
    this.accessToken = options.accessToken ?? null;
    this.endpoint = options.endpoint ?? 'https://exp.host/--/api/v2/push/send';
  }

  get providerName() {
    return 'expo';
  }

  /**
   * @param {import('./PushProvider.js').PushMessage[]} messages
   * @returns {Promise<import('./PushProvider.js').PushResult[]>}
   */
  async send(messages) {
    if (messages.length === 0) return [];

    /** @type {import('./PushProvider.js').PushResult[]} */
    const out = [];

    // Expo accepts up to 100 messages per request. Chunk defensively.
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const slice = messages.slice(i, i + chunkSize);
      const body = slice.map((m) => ({
        to: m.token,
        title: m.title,
        body: m.body,
        data: m.data,
        sound: m.sound ?? 'default',
        badge: m.badge,
        categoryId: m.categoryId,
      }));

      try {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          getLogger().warn({ status: res.status, text: text.slice(0, 500) }, 'push.expo.http_error');
          for (const m of slice) {
            out.push({ token: m.token, status: 'error', error: `http_${res.status}` });
          }
          continue;
        }

        /** @type {{ data?: Array<{ status: string, message?: string, details?: { error?: string } }> }} */
        const json = /** @type {any} */ (await res.json());
        const data = Array.isArray(json.data) ? json.data : [];
        slice.forEach((m, idx) => {
          const tick = data[idx];
          if (!tick) {
            out.push({ token: m.token, status: 'error', error: 'no_ticket' });
            return;
          }
          if (tick.status === 'ok') {
            out.push({ token: m.token, status: 'ok' });
            return;
          }
          const errCode = tick.details?.error ?? tick.message ?? 'unknown';
          const stale = ['DeviceNotRegistered', 'InvalidCredentials', 'MessageRateExceeded'].includes(errCode);
          out.push({ token: m.token, status: 'error', error: errCode, stale });
        });
      } catch (err) {
        getLogger().warn({ err }, 'push.expo.fetch_failed');
        for (const m of slice) {
          out.push({ token: m.token, status: 'error', error: 'fetch_failed' });
        }
      }
    }

    return out;
  }
}
