import type { Href } from 'expo-router';

import type { AuthSessionRole } from '@/contexts/auth-session-context';

/** Primary home route per authenticated role (mobile shell entry). */
export function homeHrefForRole(role: AuthSessionRole): Href {
  switch (role) {
    case 'public':
      return '/(tabs)';
    case 'inspector':
      return '/inspector';
    case 'dept_upload':
      return '/dept-upload' as Href;
    case 'system_admin':
      return '/system-admin' as Href;
    case 'inspector_admin':
      return '/inspector-admin' as Href;
  }
}
