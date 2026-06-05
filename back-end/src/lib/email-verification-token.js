import { createHmac, randomBytes } from 'node:crypto';
import { getEnv } from '../config/env.js';

/**
 * @returns {string}
 */
function verificationHmacKey() {
  const env = getEnv();
  return env.EMAIL_VERIFICATION_HMAC_SECRET ?? env.JWT_REFRESH_SECRET;
}

/**
 * @param {string} plainToken
 * @returns {string}
 */
export function hashEmailVerificationToken(plainToken) {
  return createHmac('sha256', verificationHmacKey()).update(plainToken).digest('hex');
}

/**
 * @returns {string} Opaque URL-safe token (show once in email; only a hash is stored).
 */
export function generateEmailVerificationPlainToken() {
  return randomBytes(32).toString('base64url');
}
