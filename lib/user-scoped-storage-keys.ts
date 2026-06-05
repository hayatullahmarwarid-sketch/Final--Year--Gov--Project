import { normalizeLoginEmail } from '@/lib/validation/login-email';

/** Stable scope id for onboarding before an account key exists. */
export const PREAUTH_ACCOUNT_SCOPE = '__preauth__';

/** Pre-scoping keys (migrated into per-account storage on first load). */
export const PROFILE_STORAGE_KEY_LEGACY = '@sharia_user_profile_v1';
export const PASSWORD_STORAGE_KEY_LEGACY = '@sharia_account_password_v1';

/** Public sessions keyed by verified email (login and registration). */
export function publicAccountKeyFromEmail(email: string): string {
  const e = normalizeLoginEmail(email);
  if (e.length < 5) return 'pub_unknown';
  return `pub_email_${e.replace(/[^a-z0-9@._-]/gi, '_')}`;
}

export function inspectorAccountKeyFromUsername(username: string): string {
  const u = username.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return u.length > 0 ? `insp_${u}` : 'insp_unknown';
}

export const DEPT_UPLOAD_ACCOUNT_KEY = 'dept_catalog_uploader';

/** Scoped storage id for decree-upload staff signed in with a real account email. */
export function deptUploadAccountKeyFromEmail(email: string): string {
  const e = normalizeLoginEmail(email);
  if (e.length < 3) return DEPT_UPLOAD_ACCOUNT_KEY;
  return `dept_email_${e.replace(/[^a-z0-9@._-]/gi, '_')}`;
}

export function systemAdminAccountKeyFromUsername(username: string): string {
  const u = username.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return u.length > 0 ? `sys_${u}` : 'sys_unknown';
}

export function inspectorAdminAccountKeyFromUsername(username: string): string {
  const u = username.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return u.length > 0 ? `inspadm_${u}` : 'inspadm_unknown';
}

export function profileStorageKey(scope: string): string {
  return `@sharia_user_profile_v2_${scope}`;
}

export function passwordStorageKey(scope: string): string {
  return `@sharia_account_password_v2_${scope}`;
}

export function notificationInboxStorageKey(scope: string): string {
  return `@sharia_inbox_v2_${scope}`;
}

export function notificationSettingsStorageKey(scope: string): string {
  return `@sharia_notification_settings_v2_${scope}`;
}

export function publicUserDataStorageKey(scope: string): string {
  return `@sharia_public_user_data_v1_${scope}`;
}
