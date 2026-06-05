import { RoleKey } from '../enums/roles.js';

/** English labels for API / admin surfaces (not localized copy). */
export const ROLE_NAME = Object.freeze({
  [RoleKey.PUBLIC_USER]: 'Public user',
  [RoleKey.INSPECTOR]: 'Inspector',
  [RoleKey.SYSTEM_ADMIN]: 'System administrator',
  [RoleKey.DECREE_UPLOAD_DEPARTMENT]: 'Decree upload department',
  [RoleKey.INSPECTOR_ADMIN]: 'Inspector administrator',
});
