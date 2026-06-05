import { z } from 'zod';

/**
 * Small denylist of well-known leaked / extremely common passwords.
 * This is a defence-in-depth backstop, not a replacement for HIBP/k-Anonymity.
 * Keep it short and all-lowercase (membership check lower-cases input).
 *
 * Source: compiled from the top of multiple public breach corpora (2020–2024).
 */
const COMMON_PASSWORD_DENYLIST = new Set([
  'password',
  'password1',
  'password123',
  'password1234',
  'password12345',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'abc123',
  'abcdef',
  'letmein',
  'welcome',
  'welcome1',
  'admin',
  'admin123',
  'administrator',
  'iloveyou',
  'monkey',
  'dragon',
  'sunshine',
  'princess',
  'master',
  'passw0rd',
  'p@ssw0rd',
  'p@ssword',
  'changeme',
  'trustno1',
  'football',
  'baseball',
  '000000',
  '111111',
  '121212',
  '112233',
  '00000000',
  'asdfghjkl',
  'zxcvbnm',
  'qazwsx',
]);

/**
 * Shared strong-password Zod schema used by register, password-reset, and patchMe.
 *
 * Policy (Phase 1):
 *  - min 10 chars (raised from 8)
 *  - at least one lowercase letter, uppercase letter, number, and symbol
 *  - not in the common-password denylist
 *  - not equal to the email local-part (enforced by caller when it has access to the email)
 */
export const strongPasswordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(200, 'Password is too long')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a symbol')
  .refine((v) => !COMMON_PASSWORD_DENYLIST.has(v.trim().toLowerCase()), {
    message: 'This password is too common — choose a less guessable one',
  });

/**
 * Caller-side helper: reject passwords that equal the email local-part (case-insensitive).
 * Zod can't reach across fields easily when the schema is a bare string, so consumers pass the
 * two values and get a boolean. Use inside `superRefine` on an object schema.
 *
 * @param {string} password
 * @param {string | undefined | null} email
 * @returns {boolean} true when password is acceptable relative to the email
 */
export function isPasswordAcceptableAgainstEmail(password, email) {
  if (!email) return true;
  const local = String(email).split('@')[0]?.trim().toLowerCase() ?? '';
  if (!local) return true;
  return password.trim().toLowerCase() !== local;
}
