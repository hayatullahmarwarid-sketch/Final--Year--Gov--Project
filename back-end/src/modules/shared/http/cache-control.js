/**
 * Cache-Control policy helpers. All API responses flow through `sendSuccess`; wiring
 * Cache-Control is a route-level concern (middleware) because only the route knows whether
 * the response is personalized.
 *
 * Rules (Phase 3):
 *   - Public reads (anonymous-safe, no per-user state): `public, max-age=60, stale-while-revalidate=300`.
 *   - Short public cache for hot reads (categories, banners, platform info): `public, max-age=300`.
 *   - Private reads (per-user): `private, no-store` (default).
 *   - Writes: always `no-store`.
 */

const POLICY = Object.freeze({
  PUBLIC_SHORT: 'public, max-age=60, stale-while-revalidate=300',
  PUBLIC_MEDIUM: 'public, max-age=300, stale-while-revalidate=600',
  PRIVATE_NO_STORE: 'private, no-store',
});

/**
 * Middleware factory — sets `Cache-Control` on successful GET/HEAD responses only.
 * Writes and error statuses are never cached.
 *
 * @param {keyof typeof POLICY | string} policyOrRaw
 * @returns {import('express').RequestHandler}
 */
export function cacheControl(policyOrRaw) {
  const header = POLICY[/** @type {keyof typeof POLICY} */ (policyOrRaw)] ?? String(policyOrRaw);
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.on('headers', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        res.setHeader('Cache-Control', header);
      }
    });
    // `res.on('headers', fn)` is not native; use `writeHead` shim:
    const origWriteHead = res.writeHead.bind(res);
    res.writeHead = (...args) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && !res.getHeader('Cache-Control')) {
        res.setHeader('Cache-Control', header);
      }
      return origWriteHead(...args);
    };
    next();
  };
}

export const CACHE_POLICY = POLICY;
