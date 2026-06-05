/**
 * Refresh-token exchange (plain fetch). Lives in its own module so
 * `fetch-with-jwt-refresh` does not import `auth-jwt` (avoids a require cycle).
 */
import { getApiBaseUrl } from '@/constants/api';

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

/**
 * `POST /api/v1/auth/refresh` — exchanges refresh token for a new access + refresh pair.
 */
export async function postBackendTokenRefresh(body: {
  refreshToken: string;
}): Promise<
  | { ok: true; data: { accessToken: string; refreshToken: string } }
  | { ok: false; status: number; message: string }
> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.' };
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: body.refreshToken.trim() }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, message: msg };
  }
  const json = (await readJson(res)) as Record<string, unknown> | null;
  const success = json && typeof json === 'object' && json.success === true;
  if (success && json.data && typeof json.data === 'object') {
    const d = json.data as Record<string, unknown>;
    const accessToken =
      typeof d.accessToken === 'string'
        ? d.accessToken
        : typeof d.token === 'string'
          ? d.token
          : '';
    const refreshToken = typeof d.refreshToken === 'string' ? d.refreshToken : '';
    if (!accessToken || !refreshToken) {
      return { ok: false, status: res.status, message: 'Refresh response was incomplete.' };
    }
    return { ok: true, data: { accessToken, refreshToken } };
  }
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
  };
}
