import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import type { BackendPreferredLanguage } from '@/lib/language-backend-map';

export type BackendLoginUser = {
  id: string;
  email: string;
  /** Persisted `roleKey` from API (e.g. `system_admin`, `public_user`). */
  role: string;
  preferredLanguage: BackendPreferredLanguage;
};

export type BackendLoginSuccess = {
  accessToken: string;
  refreshToken: string;
  user: BackendLoginUser;
};

type ApiFailBody = {
  success?: false;
  message?: string;
  error?: { code?: string; message?: string };
};

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { success: false, message: text || 'Invalid JSON from server' };
  }
}

function parseAuthTokensAndUser(d: Record<string, unknown>): BackendLoginSuccess | null {
  const accessToken =
    typeof d.accessToken === 'string'
      ? d.accessToken
      : typeof d.token === 'string'
        ? d.token
        : '';
  const refreshToken = typeof d.refreshToken === 'string' ? d.refreshToken : '';
  const u = d.user && typeof d.user === 'object' ? (d.user as Record<string, unknown>) : {};
  const prefRaw = u.preferredLanguage;
  const preferredLanguage: BackendPreferredLanguage =
    prefRaw === 'en' || prefRaw === 'ps' || prefRaw === 'fa' ? prefRaw : 'en';
  const user: BackendLoginUser = {
    id: typeof u.id === 'string' ? u.id : '',
    email: typeof u.email === 'string' ? u.email : '',
    role: typeof u.role === 'string' ? u.role : '',
    preferredLanguage,
  };
  if (!accessToken || !user.role) return null;
  return { accessToken, refreshToken, user };
}

/**
 * Real API login (`POST /api/v1/auth/login`). Use when `EXPO_PUBLIC_API_BASE_URL` points at the Node backend.
 */
export async function postBackendLogin(body: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; data: BackendLoginSuccess }
  | { ok: false; status: number; message: string; code?: string }
> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.' };
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: body.email.trim().toLowerCase(),
        password: body.password,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, message: msg };
  }
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data && typeof json.data === 'object') {
    const parsed = parseAuthTokensAndUser(json.data as Record<string, unknown>);
    if (!parsed) {
      return { ok: false, status: res.status, message: 'Login response was incomplete.' };
    }
    return { ok: true, data: parsed };
  }
  const fail = json as ApiFailBody | null;
  const message =
    fail?.message || fail?.error?.message || `Request failed (${res.status})`;
  return {
    ok: false,
    status: res.status,
    message,
    code: typeof fail?.error?.code === 'string' ? fail.error.code : undefined,
  };
}

export type BackendAuthMeUser = BackendLoginUser & {
  emailVerified?: boolean;
};

/**
 * `GET /api/v1/auth/me` — current user profile. Uses short-lived access JWT from
 * storage and refreshes once on 401 (same as other authenticated API clients).
 */
export async function getBackendAuthMe(): Promise<
  | { ok: true; data: { user: BackendAuthMeUser } }
  | { ok: false; status: number; message: string }
> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.' };
  }
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${base}/api/v1/auth/me`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, message: msg };
  }
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data && typeof json.data === 'object') {
    const d = json.data as Record<string, unknown>;
    const u = d.user && typeof d.user === 'object' ? (d.user as Record<string, unknown>) : {};
    const prefRaw = u.preferredLanguage;
    const preferredLanguage: BackendPreferredLanguage =
      prefRaw === 'en' || prefRaw === 'ps' || prefRaw === 'fa' ? prefRaw : 'en';
    const user: BackendAuthMeUser = {
      id: typeof u.id === 'string' ? u.id : '',
      email: typeof u.email === 'string' ? u.email : '',
      role: typeof u.role === 'string' ? u.role : '',
      emailVerified: typeof u.emailVerified === 'boolean' ? u.emailVerified : undefined,
      preferredLanguage,
    };
    if (!user.id || !user.role) {
      return { ok: false, status: res.status, message: 'Profile response was incomplete.' };
    }
    return { ok: true, data: { user } };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
  };
}

/**
 * `PATCH /api/v1/auth/me` — update profile (email, password, …). Returns fresh tokens when successful.
 * Uses session access token and one refresh+retry on 401.
 */
export async function patchBackendAuthMe(body: {
  email?: string;
  displayName?: string;
  password?: string;
  preferredLanguage?: BackendPreferredLanguage;
}): Promise<
  | { ok: true; data: BackendLoginSuccess }
  | { ok: false; status: number; message: string; code?: string }
> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.' };
  }
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${base}/api/v1/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, message: msg };
  }
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data && typeof json.data === 'object') {
    const parsed = parseAuthTokensAndUser(json.data as Record<string, unknown>);
    if (!parsed) {
      return { ok: false, status: res.status, message: 'Profile update response was incomplete.' };
    }
    return { ok: true, data: parsed };
  }
  const fail = json as ApiFailBody | null;
  const message = fail?.message || fail?.error?.message || `Request failed (${res.status})`;
  return {
    ok: false,
    status: res.status,
    message,
    code: typeof fail?.error?.code === 'string' ? fail.error.code : undefined,
  };
}

export { postBackendTokenRefresh } from '@/lib/api/auth-token-refresh';
