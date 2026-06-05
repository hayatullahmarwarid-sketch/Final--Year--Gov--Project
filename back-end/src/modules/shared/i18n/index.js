import en from './catalog/en.json' with { type: 'json' };
import ps from './catalog/ps.json' with { type: 'json' };
import fa from './catalog/fa.json' with { type: 'json' };

/** @type {Readonly<Record<'en' | 'ps' | 'fa', Record<string, unknown>>>} */
export const CATALOGS = Object.freeze({ en, ps, fa });

/** @type {readonly string[]} */
export const SUPPORTED_LOCALES = Object.freeze(['en', 'ps', 'fa']);

const DEFAULT_LOCALE = 'en';

/**
 * @param {string | null | undefined} raw
 * @returns {'en' | 'ps' | 'fa'}
 */
export function normalizeLocale(raw) {
  if (typeof raw !== 'string') return DEFAULT_LOCALE;
  const short = raw.trim().toLowerCase().slice(0, 2);
  if (short === 'ps') return 'ps';
  if (short === 'fa' || short === 'da') return 'fa';
  return DEFAULT_LOCALE;
}

/**
 * @param {Record<string, unknown>} cat
 * @param {string} key Dot-path, e.g. `auth.login.invalid_credentials`
 * @returns {string | null}
 */
function dig(cat, key) {
  const parts = key.split('.');
  let cur = /** @type {unknown} */ (cat);
  // Accept either nested `auth.login.invalid_credentials` or flattened `auth.login.invalid_credentials`
  // as a single leaf key under the top namespace. We first try the full path, then try
  // splitting only at the first dot so `"auth.login.invalid_credentials"` under `auth:{"login.invalid_credentials":...}`
  // also resolves.
  for (let i = 0; i < parts.length; i += 1) {
    if (cur && typeof cur === 'object' && parts[i] in cur) {
      cur = /** @type {Record<string, unknown>} */ (cur)[parts[i]];
    } else {
      const remainder = parts.slice(i).join('.');
      if (cur && typeof cur === 'object' && remainder in cur) {
        return String(/** @type {Record<string, unknown>} */ (cur)[remainder]);
      }
      return null;
    }
  }
  return typeof cur === 'string' ? cur : null;
}

/**
 * Translate `key` to the given locale, falling back to English. Returns the key itself when
 * no translation exists so missing keys are visible in the UI during development.
 *
 * @param {string} locale
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 * @returns {string}
 */
export function t(locale, key, vars) {
  const normalized = normalizeLocale(locale);
  const primary = dig(CATALOGS[normalized], key);
  const str = primary ?? dig(CATALOGS[DEFAULT_LOCALE], key) ?? key;
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : `{{${k}}}`));
}

/**
 * Parse an `Accept-Language` header value (very tolerant).
 * @param {string | null | undefined} header
 */
export function pickAcceptLanguage(header) {
  if (!header) return null;
  const primary = header.split(',')[0]?.trim();
  if (!primary) return null;
  return normalizeLocale(primary.split(';')[0]);
}

/**
 * Express middleware that injects `req.locale` + `req.t` on every request.
 * Precedence: explicit `?lang=` query → user.preferredLanguage (future) → Accept-Language → 'en'.
 *
 * @returns {import('express').RequestHandler}
 */
export function i18nMiddleware() {
  return (req, _res, next) => {
    const q = req.query?.lang;
    const header = req.get('accept-language');
    const user = /** @type {{ preferredLanguage?: string } | undefined} */ (/** @type {any} */ (req).user);
    const locale =
      typeof q === 'string' && q.trim()
        ? normalizeLocale(q)
        : user?.preferredLanguage
          ? normalizeLocale(user.preferredLanguage)
          : pickAcceptLanguage(header) ?? DEFAULT_LOCALE;
    /** @type {any} */ (req).locale = locale;
    /** @type {any} */ (req).t = (key, vars) => t(locale, key, vars);
    next();
  };
}
