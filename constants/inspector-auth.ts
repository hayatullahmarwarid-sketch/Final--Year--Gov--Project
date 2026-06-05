import { normalizeLoginEmail } from '@/lib/validation/login-email';

/** Demo field-inspector portal email (unified email login). */
export const INSPECTOR_LOGIN_EMAIL = 'inspector@field.sharia.gov';
export const INSPECTOR_LOGIN_PASSWORD = '123456';

export function isInspectorCredentials(email: string, password: string): boolean {
  return (
    normalizeLoginEmail(email) === normalizeLoginEmail(INSPECTOR_LOGIN_EMAIL) &&
    password === INSPECTOR_LOGIN_PASSWORD
  );
}
