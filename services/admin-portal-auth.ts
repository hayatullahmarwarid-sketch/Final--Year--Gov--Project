/******************************************************************
--ADMIN_PORTAL_AUTH--
AsyncStorage-backed staff portal credentials for demo / local flows.
All sign-in resolution flows through here until a backend issues JWTs.
******************************************************************/
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AdminPortalRoleKind = 'system' | 'decree' | 'inspector';
export type InspectorPortalKind = 'inspector_admin' | 'field_inspector';

export type AdminPortalSession =
  | { role: 'system'; username: string }
  | { role: 'decree'; username: string }
  | { role: 'inspector'; username: string; inspectorPortal: InspectorPortalKind };

const STORAGE_SESSION = '@sharia_admin_portal_session_v1';
const DECREE_CREDS_KEY = '@sharia_admin_decree_credentials_v1';
const INSPECTOR_CREDS_KEY = '@sharia_admin_inspector_credentials_v1';
const SUPER_ADMIN_CREDS_KEY = '@sharia_admin_super_credentials_v1';
const FIELD_INSPECTOR_CREDS_KEY = '@sharia_field_inspector_portal_v1';

const RESERVED_DECREE_EMAILS = new Set(['inspectoradmin@ops.sharia.gov']);

/** Inspector admin portal default sign-in email (stored under `username` in JSON for compatibility). */
export const INSPECTOR_ADMIN_EMAIL = 'inspectoradmin@ops.sharia.gov';

const DEFAULT_SUPER_EMAIL = 'admin@system.sharia.gov';
const DEFAULT_SUPER_PASSWORD = '123456';
const LEGACY_PLACEHOLDER_PASSWORD = 'changeme';

function coerceDemoPassword(pw: string): string {
  return pw === LEGACY_PLACEHOLDER_PASSWORD ? DEFAULT_SUPER_PASSWORD : pw;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export async function getSuperAdminCredentials(): Promise<{ username: string; password: string }> {
  const fallback = { username: DEFAULT_SUPER_EMAIL, password: DEFAULT_SUPER_PASSWORD };
  const p = await readJson<Partial<{ username: string; password: string }>>(
    SUPER_ADMIN_CREDS_KEY,
    fallback,
  );
  if (typeof p.username !== 'string' || typeof p.password !== 'string') return fallback;
  const u = p.username.trim().toLowerCase();
  if (!u.includes('@')) {
    await writeJson(SUPER_ADMIN_CREDS_KEY, fallback);
    return fallback;
  }
  if (u.length < 5 || p.password.length < 1) return fallback;
  const pw = coerceDemoPassword(p.password);
  if (pw !== p.password) {
    await writeJson(SUPER_ADMIN_CREDS_KEY, { username: u, password: pw });
  }
  return { username: u, password: pw };
}

export async function getDecreeCredentials(): Promise<{ username: string; password: string }> {
  const fallback = { username: 'decree@upload.sharia.gov', password: '123456' };
  const p = await readJson<Partial<{ username: string; password: string }>>(DECREE_CREDS_KEY, fallback);
  if (typeof p.username !== 'string' || typeof p.password !== 'string') return fallback;
  const u = p.username.trim().toLowerCase();
  if (!u.includes('@')) {
    await writeJson(DECREE_CREDS_KEY, fallback);
    return fallback;
  }
  if (u.length < 5) return fallback;
  const pw = coerceDemoPassword(p.password);
  if (pw !== p.password) {
    await writeJson(DECREE_CREDS_KEY, { username: u, password: pw });
  }
  return { username: u, password: pw };
}

export async function getInspectorCredentials(): Promise<{ username: string; password: string }> {
  const fallback = { username: INSPECTOR_ADMIN_EMAIL, password: '123456' };
  const p = await readJson<Partial<{ username: string; password: string }>>(
    INSPECTOR_CREDS_KEY,
    fallback,
  );
  if (typeof p.username !== 'string' || typeof p.password !== 'string') return fallback;
  const u = p.username.trim().toLowerCase();
  if (!u.includes('@')) {
    await writeJson(INSPECTOR_CREDS_KEY, fallback);
    return fallback;
  }
  if (u.length < 5 || p.password.length < 1) return fallback;
  const pw = coerceDemoPassword(p.password);
  if (pw !== p.password) {
    await writeJson(INSPECTOR_CREDS_KEY, { username: u, password: pw });
  }
  return { username: u, password: pw };
}

export async function getFieldInspectorPortalCredentials(): Promise<{ username: string; password: string }> {
  const fallback = { username: 'inspector@field.sharia.gov', password: '123456' };
  const p = await readJson<Partial<{ username: string; password: string }>>(
    FIELD_INSPECTOR_CREDS_KEY,
    fallback,
  );
  if (typeof p.username !== 'string' || typeof p.password !== 'string') return fallback;
  const u = p.username.trim().toLowerCase();
  if (!u.includes('@')) {
    await writeJson(FIELD_INSPECTOR_CREDS_KEY, fallback);
    return fallback;
  }
  if (u.length < 5 || p.password.length < 1) return fallback;
  const pw = coerceDemoPassword(p.password);
  if (pw !== p.password) {
    await writeJson(FIELD_INSPECTOR_CREDS_KEY, { username: u, password: pw });
  }
  return { username: u, password: pw };
}

export async function setSuperAdminPortalCredentials(usernameRaw: string, password: string) {
  const u = usernameRaw.trim().toLowerCase();
  await writeJson(SUPER_ADMIN_CREDS_KEY, { username: u, password });
}

export async function setDecreePortalCredentials(usernameRaw: string, password: string) {
  const u = usernameRaw.trim().toLowerCase();
  await writeJson(DECREE_CREDS_KEY, { username: u, password });
}

export async function setInspectorPortalCredentials(usernameRaw: string, password: string) {
  const u = usernameRaw.trim().toLowerCase();
  await writeJson(INSPECTOR_CREDS_KEY, { username: u, password });
}

export async function syncAdminPortalsFromStaffUsers(
  users: Array<{ role: string; username: string; portalPassword: string }>,
) {
  const superRow = users.find((r) => r.role === 'super_admin');
  if (superRow?.username && superRow.portalPassword) {
    await setSuperAdminPortalCredentials(superRow.username, superRow.portalPassword);
  }
  const decreeRow = users.find((r) => r.role === 'decree_dept');
  if (decreeRow?.username && decreeRow.portalPassword) {
    await setDecreePortalCredentials(decreeRow.username, decreeRow.portalPassword);
  }
  const inspAdm = users.find((r) => r.role === 'inspector_admin');
  if (inspAdm?.username && inspAdm.portalPassword) {
    await setInspectorPortalCredentials(inspAdm.username, inspAdm.portalPassword);
  }
}

export async function tryPortalLogin(email: string, password: string): Promise<AdminPortalSession | null> {
  /** AsyncStorage-backed demo portals must not run in production app builds. */
  if (typeof __DEV__ === 'boolean' && !__DEV__) {
    return null;
  }
  const u = email.trim().toLowerCase();
  const p = password.trim();
  const superC = await getSuperAdminCredentials();
  if (u === superC.username && superC.password === p) {
    return { role: 'system', username: email.trim() };
  }
  const decree = await getDecreeCredentials();
  if (u === decree.username && decree.password === p) {
    return { role: 'decree', username: email.trim() };
  }
  const insp = await getInspectorCredentials();
  const field = await getFieldInspectorPortalCredentials();
  if (u === insp.username && insp.password === p) {
    return { role: 'inspector', username: email.trim(), inspectorPortal: 'inspector_admin' };
  }
  if (u === field.username && field.password === p) {
    return { role: 'inspector', username: email.trim(), inspectorPortal: 'field_inspector' };
  }
  return null;
}

export async function verifySuperAdminLogin(username: string, password: string): Promise<boolean> {
  const c = await getSuperAdminCredentials();
  return c.username === username.trim().toLowerCase() && c.password === password.trim();
}

export type UpdateDecreeCredentialsResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

export async function updateDecreeCredentials(
  sessionUsername: string,
  currentPassword: string,
  nextUsernameRaw: string,
  nextPassword: string,
): Promise<UpdateDecreeCredentialsResult> {
  const decree = await getDecreeCredentials();
  const su = sessionUsername.trim().toLowerCase();
  if (su !== decree.username) {
    return { ok: false, error: 'Session is out of date. Please sign out and sign in again.' };
  }
  if (currentPassword !== decree.password) {
    return { ok: false, error: 'Current password is incorrect.' };
  }

  const nextTrim = nextUsernameRaw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextTrim)) {
    return { ok: false, error: 'Enter a valid portal email address.' };
  }
  const nu = nextTrim.toLowerCase();
  if (RESERVED_DECREE_EMAILS.has(nu)) {
    return { ok: false, error: 'That email is reserved for another portal.' };
  }
  if (nu !== su) {
    if (nu === (await getSuperAdminCredentials()).username) {
      return { ok: false, error: 'That email is reserved for the system (Super Admin) portal.' };
    }
    if (nu === (await getInspectorCredentials()).username) {
      return { ok: false, error: 'That email is already used by the inspector admin portal.' };
    }
    if (nu === (await getFieldInspectorPortalCredentials()).username) {
      return { ok: false, error: 'That email is reserved for the field inspector portal login.' };
    }
  }

  const wantsNewPassword = nextPassword.length > 0;
  if (wantsNewPassword && nextPassword.length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters.' };
  }
  if (nu === su && !wantsNewPassword) {
    return { ok: false, error: 'Enter a new email or a new password.' };
  }

  const finalPassword = wantsNewPassword ? nextPassword : decree.password;
  await writeJson(DECREE_CREDS_KEY, { username: nu, password: finalPassword });
  return { ok: true, username: nu };
}

export type UpdateInspectorCredentialsResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

async function reservedForInspectorUsername(candidateLower: string): Promise<string | null> {
  if (candidateLower === (await getDecreeCredentials()).username) {
    return 'That email is already used by the decree upload portal.';
  }
  if (candidateLower === (await getSuperAdminCredentials()).username) {
    return 'That email is reserved for the system (Super Admin) portal.';
  }
  if (candidateLower === (await getFieldInspectorPortalCredentials()).username) {
    return 'That email is reserved for the field inspector portal login.';
  }
  return null;
}

export async function updateInspectorAdminCredentials(
  sessionUsername: string,
  currentPassword: string,
  nextUsernameRaw: string,
  nextPassword: string,
): Promise<UpdateInspectorCredentialsResult> {
  const insp = await getInspectorCredentials();
  const su = sessionUsername.trim().toLowerCase();
  if (su !== insp.username) {
    return { ok: false, error: 'Session is out of date. Please sign out and sign in again.' };
  }
  if (currentPassword !== insp.password) {
    return { ok: false, error: 'Current password is incorrect.' };
  }

  const nextTrim = nextUsernameRaw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextTrim)) {
    return { ok: false, error: 'Enter a valid portal email address.' };
  }
  const nu = nextTrim.toLowerCase();
  const reserved = await reservedForInspectorUsername(nu);
  if (reserved) {
    return { ok: false, error: reserved };
  }

  const wantsNewPassword = nextPassword.length > 0;
  if (wantsNewPassword && nextPassword.length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters.' };
  }
  if (nu === su && !wantsNewPassword) {
    return { ok: false, error: 'Enter a new email or a new password.' };
  }

  const finalPassword = wantsNewPassword ? nextPassword : insp.password;
  await writeJson(INSPECTOR_CREDS_KEY, { username: nu, password: finalPassword });
  return { ok: true, username: nu };
}

export async function getPersistedPortalSession(): Promise<AdminPortalSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_SESSION);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<AdminPortalSession & { inspectorPortal?: string }>;
    if (p.role === 'system' || p.role === 'decree' || p.role === 'inspector') {
      if (typeof p.username !== 'string' || p.username.length === 0) return null;
      const un = p.username.trim().toLowerCase();
      if (p.role === 'system') {
        if (un !== (await getSuperAdminCredentials()).username) return null;
        return { role: 'system', username: p.username.trim() };
      }
      if (p.role === 'decree') {
        if (un !== (await getDecreeCredentials()).username) return null;
        return { role: 'decree', username: p.username.trim() };
      }
      const adm = await getInspectorCredentials();
      const field = await getFieldInspectorPortalCredentials();
      const portal =
        p.inspectorPortal === 'inspector_admin' || p.inspectorPortal === 'field_inspector'
          ? p.inspectorPortal
          : undefined;
      if (portal === 'inspector_admin' && un === adm.username) {
        return { role: 'inspector', username: p.username.trim(), inspectorPortal: 'inspector_admin' };
      }
      if (portal === 'field_inspector' && un === field.username) {
        return { role: 'inspector', username: p.username.trim(), inspectorPortal: 'field_inspector' };
      }
      if (un === field.username) {
        return { role: 'inspector', username: p.username.trim(), inspectorPortal: 'field_inspector' };
      }
      if (un === adm.username) {
        return { role: 'inspector', username: p.username.trim(), inspectorPortal: 'inspector_admin' };
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function persistPortalSession(session: AdminPortalSession) {
  await AsyncStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
}

export async function clearPortalSession() {
  await AsyncStorage.removeItem(STORAGE_SESSION);
}
