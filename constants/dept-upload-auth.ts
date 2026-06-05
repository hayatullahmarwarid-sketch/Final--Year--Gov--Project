/**
 * Optional dev-only shortcut matching the same email/password pair used in local API seeding docs.
 * Disabled in production builds (`__DEV__` is false) — production must use real JWT login.
 */
import { normalizeLoginEmail } from '@/lib/validation/login-email';

export const DEPT_UPLOAD_LOGIN_EMAIL = 'decreedept@upload.sharia.gov';
export const DEPT_UPLOAD_LOGIN_PASSWORD = '123456';

export function isDeptUploadCredentials(emailInput: string, password: string): boolean {
  if (typeof __DEV__ === 'boolean' && !__DEV__) {
    return false;
  }
  return (
    normalizeLoginEmail(emailInput) === normalizeLoginEmail(DEPT_UPLOAD_LOGIN_EMAIL) &&
    password === DEPT_UPLOAD_LOGIN_PASSWORD
  );
}
