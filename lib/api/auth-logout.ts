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
 * `POST /api/v1/auth/logout` — revokes a single refresh token (does not require Bearer).
 */
export async function postBackendLogout(body: {
  refreshToken: string;
}): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.' };
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: body.refreshToken.trim() }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, status: 0, message: msg };
  }

  if (res.ok) return { ok: true };

  const json = (await readJson(res)) as Record<string, unknown> | null;
  const fail = json as ApiFailBody | null;
  return {
    ok: false,
    status: res.status,
    message: fail?.message || fail?.error?.message || `Request failed (${res.status})`,
  };
}

