/******************************************************************
--USE_REDIRECT_NON_PUBLIC_FROM_PUBLIC_ROUTES--
Keeps inspector and decree-upload sessions off public-only experiences (tabs, decrees, exams).
******************************************************************/
import { type Href, router } from 'expo-router';
import { useEffect } from 'react';

import { useAuthSession } from '@/contexts/auth-session-context';
import { homeHrefForRole } from '@/lib/auth-routing';

/**
 * When a logged-in inspector or decree-upload session hits a **public-only** flow
 * (exams, certificates, decree reader, etc.), send them to the correct home.
 */
export function useRedirectNonPublicFromPublicRoutes() {
  const { hydrated, role } = useAuthSession();

  useEffect(() => {
    if (!hydrated) return;
    if (role === 'inspector') {
      router.replace('/inspector' as Href);
      return;
    }
    if (role === 'dept_upload') {
      router.replace('/dept-upload' as Href);
      return;
    }
    if (role === 'system_admin') {
      router.replace(homeHrefForRole('system_admin'));
      return;
    }
    if (role === 'inspector_admin') {
      router.replace(homeHrefForRole('inspector_admin'));
    }
  }, [hydrated, role]);
}
