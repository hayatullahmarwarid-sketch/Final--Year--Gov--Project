import { getEnv } from '../../config/env.js';
import { ExpoPushProvider } from './ExpoPushProvider.js';
import { PushProvider } from './PushProvider.js';

/** @type {PushProvider | null} */
let cached = null;

/**
 * Returns the active PushProvider. Today: Expo. Reserved seams: APNs + FCM.
 * @returns {PushProvider}
 */
export function getPushProvider() {
  if (cached) return cached;
  const env = getEnv();
  cached = new ExpoPushProvider({ accessToken: env.EXPO_ACCESS_TOKEN });
  return cached;
}

export function resetPushProviderForTests() {
  cached = null;
}
