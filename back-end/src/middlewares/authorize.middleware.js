import { ForbiddenError, UnauthorizedError } from '../core/errors/app-error.js';

/**
 * Frontend / API role names → persisted `roleKey` on the User model.
 * @type {Readonly<Record<string, string>>}
 */
export const FRONTEND_ROLE_TO_ROLE_KEY = Object.freeze({
  public: 'public_user',
  inspector: 'inspector',
  dept_upload: 'decree_upload_department',
  system_admin: 'system_admin',
  inspector_admin: 'inspector_admin',
});

/**
 * When `RBAC_ENFORCED` is exactly the string `'false'`, role checks are skipped (local integration).
 * Any other value (including unset) enforces authorization.
 *
 * Safety: the boot check in {@link ../config/env.js} forbids `RBAC_ENFORCED=false` in production.
 * @returns {boolean}
 */
export function isRbacBypassed() {
  return process.env.RBAC_ENFORCED === 'false';
}

/**
 * Resolves allowed `roleKey` values from API-facing role names (or raw `roleKey` strings).
 * @param {readonly string[]} allowedRoles
 * @returns {Set<string>}
 */
function allowedRoleKeys(allowedRoles) {
  const set = new Set();
  for (const r of allowedRoles) {
    const mapped = FRONTEND_ROLE_TO_ROLE_KEY[r];
    set.add(mapped ?? r);
  }
  return set;
}

/**
 * Express middleware factory: requires `req.user.role` (JWT `roleKey`) to match one of the allowed roles.
 * Run after `authenticate()` (or global JWT resolution that sets `req.user`).
 *
 * @param {readonly string[]} allowedRoles API roles (`public`, `inspector`, …) or raw `roleKey` values.
 * @returns {import('express').RequestHandler}
 */
export function authorize(allowedRoles) {
  const allowed = allowedRoleKeys(allowedRoles);
  return (req, _res, next) => {
    if (isRbacBypassed()) return next();

    const role = req.user?.role;
    if (!role) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!allowed.has(role)) {
      return next(
        new ForbiddenError('Insufficient permissions', {
          requiredRoles: [...allowedRoles],
        }),
      );
    }
    return next();
  };
}
