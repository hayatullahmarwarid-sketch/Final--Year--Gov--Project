/**
 * Provider-agnostic push contract. A send returns one result per message so callers can
 * mark stale tokens (`BadDeviceToken`, `NotRegistered`, …) for pruning.
 *
 * @typedef {object} PushMessage
 * @property {string} token          Provider token (Expo push token, APNs device token, FCM token).
 * @property {string} title
 * @property {string} body
 * @property {Record<string, unknown>} [data]
 * @property {string} [sound]
 * @property {number} [badge]
 * @property {string} [categoryId]
 *
 * @typedef {object} PushResult
 * @property {string} token
 * @property {'ok' | 'error'} status
 * @property {string} [error]
 * @property {boolean} [stale]        When true, the token is permanently invalid — caller should delete.
 */
export class PushProvider {
  /**
   * @param {PushMessage[]} _messages
   * @returns {Promise<PushResult[]>}
   */
  async send(_messages) {
    throw new Error('PushProvider.send() must be implemented');
  }

  /** @returns {string} */
  get providerName() {
    return 'abstract';
  }
}
