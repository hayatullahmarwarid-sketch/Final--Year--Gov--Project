import type { AuthSessionRole } from '@/contexts/auth-session-context';

/**
 * Maps Mongo `roleKey` from JWT / login payload to the mobile app's `AuthSessionRole`.
 */
export function mapBackendRoleKeyToAuthSessionRole(roleKey: string): AuthSessionRole | null {
  switch (roleKey) {
    case 'public_user':
      return 'public';
    case 'decree_upload_department':
      return 'dept_upload';
    case 'inspector':
      return 'inspector';
    case 'system_admin':
      return 'system_admin';
    case 'inspector_admin':
      return 'inspector_admin';
    default:
      return null;
  }
}
