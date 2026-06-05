/**
 * Reserved for JWT/RBAC phase. Controllers/services can import permission
 * constants today without wiring auth middleware.
 */

export const Permission = Object.freeze({
  PUBLIC_READ_DECREES: 'public:decrees:read',
  INSPECTOR_SELF_READ: 'inspector:self:read',
  INSPECTOR_TASKS_WRITE: 'inspector:tasks:write',
  INSPECTOR_ADMIN_MANAGE: 'inspector_admin:manage',
  DECREE_UPLOAD_PUBLISH: 'decree_upload:publish',
  SYSTEM_ADMIN_MANAGE: 'system_admin:manage',
});

/**
 * Maps role keys (see RoleKey in shared enums) to default permission sets.
 * Replace or extend when implementing real RBAC.
 */
export const defaultPermissionsByRoleKey = Object.freeze({
  public_user: [Permission.PUBLIC_READ_DECREES],
  inspector: [
    Permission.PUBLIC_READ_DECREES,
    Permission.INSPECTOR_SELF_READ,
    Permission.INSPECTOR_TASKS_WRITE,
  ],
  inspector_admin: [
    Permission.PUBLIC_READ_DECREES,
    Permission.INSPECTOR_ADMIN_MANAGE,
  ],
  decree_upload_department: [Permission.DECREE_UPLOAD_PUBLISH],
  system_admin: [Permission.SYSTEM_ADMIN_MANAGE],
});
