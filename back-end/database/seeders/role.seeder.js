import { RoleKey } from '../../src/modules/shared/enums/roles.js';
import { defaultPermissionsByRoleKey } from '../../src/core/security/rbac-placeholders.js';
import { roleRepository } from '../repositories/role.repository.js';

export async function seedRoles() {
  const roles = [
    {
      key: RoleKey.PUBLIC_USER,
      label: 'Public User',
      permissions: [...defaultPermissionsByRoleKey.public_user],
    },
    {
      key: RoleKey.INSPECTOR,
      label: 'Inspector',
      permissions: [...defaultPermissionsByRoleKey.inspector],
    },
    {
      key: RoleKey.SYSTEM_ADMIN,
      label: 'System Admin',
      permissions: [...defaultPermissionsByRoleKey.system_admin],
    },
    {
      key: RoleKey.DECREE_UPLOAD_DEPARTMENT,
      label: 'Decree Upload Department',
      permissions: [...defaultPermissionsByRoleKey.decree_upload_department],
    },
    {
      key: RoleKey.INSPECTOR_ADMIN,
      label: 'Inspector Admin',
      permissions: [...defaultPermissionsByRoleKey.inspector_admin],
    },
  ];

  return roleRepository.upsertMany(roles);
}
