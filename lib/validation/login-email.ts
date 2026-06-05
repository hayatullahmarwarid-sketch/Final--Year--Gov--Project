/** Normalizes login email for comparison (trim + lower case). */
export function normalizeLoginEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Pragmatic email check: allows subdomains (e.g. mail.university.edu, user@gov.af)
 * and common TLDs (.com, .edu, .gov, …). Not a full RFC parser.
 */
export function isLoginEmailValid(raw: string): boolean {
  const s = normalizeLoginEmail(raw);
  if (s.length < 5 || s.length > 254) return false;
  const at = s.lastIndexOf('@');
  if (at < 1 || at > s.length - 5) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (local.length > 64 || !/^[^\s@]+$/.test(local)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (!label || label.length > 63) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
    if (!/^[a-z0-9-]+$/i.test(label)) return false;
  }
  const tld = labels[labels.length - 1];
  return tld.length >= 2;
}
