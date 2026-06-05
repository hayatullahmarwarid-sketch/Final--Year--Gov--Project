import { createHmac, timingSafeEqual } from 'node:crypto';
import { getEnv } from '../../config/env.js';

/**
 * Short, URL-safe, stateless tokens for public certificate verification QR codes.
 *
 * Format: `<certId>.<issuedAtMs>.<sig>` where sig = base64url(HMAC-SHA256(secret, `${certId}.${issuedAtMs}`)).
 *
 * This is stateless — no DB lookup to validate the token itself; the caller only needs to
 * confirm the certificate still exists and is not revoked.
 */

function secret() {
  const env = getEnv();
  // Reuse the audit integrity secret (deterministic + already rotated as needed).
  return env.AUDIT_LOG_INTEGRITY_SECRET || env.JWT_REFRESH_SECRET;
}

/**
 * @param {string} certificateId Mongo ObjectId string.
 * @param {Date | number} issuedAt
 * @returns {string}
 */
export function createVerifyToken(certificateId, issuedAt) {
  const tsMs = issuedAt instanceof Date ? issuedAt.getTime() : Number(issuedAt);
  const base = `${certificateId}.${tsMs}`;
  const sig = createHmac('sha256', secret()).update(base).digest('base64url');
  return `${base}.${sig}`;
}

/**
 * @param {string} token
 * @returns {{ certificateId: string, issuedAtMs: number } | null}
 */
export function parseVerifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [certificateId, tsRaw, sig] = parts;
  const tsMs = Number(tsRaw);
  if (!certificateId || Number.isNaN(tsMs) || !sig) return null;

  const expected = createHmac('sha256', secret())
    .update(`${certificateId}.${tsMs}`)
    .digest('base64url');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(sig, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { certificateId, issuedAtMs: tsMs };
}
