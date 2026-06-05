import { createHmac, randomBytes } from 'node:crypto';
import { getEnv } from '../config/env.js';

/**
 * @returns {string}
 */
function resetHmacKey() {
  const env = getEnv();
  return env.PASSWORD_RESET_HMAC_SECRET ?? env.JWT_REFRESH_SECRET;
}

/**
 * @param {string} plainToken
 * @returns {string}
 */
export function hashPasswordResetToken(plainToken) {
  return createHmac('sha256', resetHmacKey()).update(`pwreset|${plainToken}`).digest('hex');
}

/**
 * @returns {string}
 */
export function generatePasswordResetPlainToken() {
  return randomBytes(32).toString('base64url');
}
