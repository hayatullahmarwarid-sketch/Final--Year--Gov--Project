/**
 * Client-side checks aligned with `back-end/src/modules/auth/validationRules.js`
 * and `publicRegisterBodySchema` (length / charset only — E.164 is built separately).
 */

const INVISIBLE_OR_BIDI = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/u;

function hasEmoji(s: string): boolean {
  return /\p{Extended_Pictographic}/u.test(String(s));
}

export function hasInvisibleOrBidiFormatChars(s: string): boolean {
  return INVISIBLE_OR_BIDI.test(String(s));
}

export function isPublicUserPasswordAllowedClient(s: string): boolean {
  const t = String(s);
  if (hasEmoji(t)) return false;
  if (hasInvisibleOrBidiFormatChars(t)) return false;
  return true;
}

/** Letters (any script) + name punctuation; no digits; no emoji. */
export function isPublicUserFullNameAllowedClient(s: string): boolean {
  const t = String(s).trim();
  if (!t || hasEmoji(t)) return false;
  if (/\d/.test(t)) return false;
  if (!/^[\p{L}\p{M}]+(?:[\s'\u2019\-.]+[\p{L}\p{M}]+)*$/u.test(t)) return false;
  return true;
}

export function publicRegisterPasswordOk(password: string): boolean {
  return password.length >= 8 && password.length <= 128 && isPublicUserPasswordAllowedClient(password);
}

export function publicRegisterFullNameOk(fullName: string): boolean {
  const t = fullName.trim();
  return t.length >= 2 && t.length <= 120 && isPublicUserFullNameAllowedClient(t);
}
