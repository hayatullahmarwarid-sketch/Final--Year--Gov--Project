/**
 * Person display name: letters (any script), spaces, apostrophes, hyphens — no digits, emoji, or other symbols.
 */
export function isFullPersonNameValid(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 2 || s.length > 120) return false;
  if (/\p{N}/u.test(s)) return false;
  return /^[\p{L}][\p{L}\s'\u2019-]*$/u.test(s);
}
