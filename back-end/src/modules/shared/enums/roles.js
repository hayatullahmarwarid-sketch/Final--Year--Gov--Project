export const RoleKey = Object.freeze({
  PUBLIC_USER: 'public_user',
  INSPECTOR: 'inspector',
  SYSTEM_ADMIN: 'system_admin',
  DECREE_UPLOAD_DEPARTMENT: 'decree_upload_department',
  INSPECTOR_ADMIN: 'inspector_admin',
});

/** @type {readonly string[]} */
export const ROLE_KEYS = Object.freeze(Object.values(RoleKey));
