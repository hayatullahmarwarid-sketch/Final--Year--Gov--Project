import { RoleKey } from '../shared/enums/roles.js';

/**
 * Internal / operational personas that appear in the system staff directory.
 * Public end-users are intentionally excluded from this surface.
 */
export const STAFF_DIRECTORY_ROLE_KEYS = Object.freeze([
  RoleKey.SYSTEM_ADMIN,
  RoleKey.INSPECTOR_ADMIN,
  RoleKey.INSPECTOR,
  RoleKey.DECREE_UPLOAD_DEPARTMENT,
]);

/** @type {ReadonlySet<string>} */
export const STAFF_DIRECTORY_ROLE_KEY_SET = new Set(STAFF_DIRECTORY_ROLE_KEYS);
