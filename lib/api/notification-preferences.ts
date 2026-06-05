import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

const PREFIX = '/api/v1/notifications/preferences';

type ApiSuccess<T> = { success: true; data: T };

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<{ base: string; headers: HeadersInit } | { error: string }> {
  const base = getApiBaseUrl();
  if (!base) return { error: 'API is not configured.' };
  const token = await getJwtAccessToken();
  if (!token) return { error: 'Not signed in.' };
  return {
    base,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

export type NotificationPreferencesDto = {
  pushEnabled: boolean;
  newUploads: boolean;
  statusChanges: boolean;
  systemAlerts: boolean;
  updatedAt: string | null;
};

export async function getNotificationPreferences(): Promise<
  { ok: true; data: NotificationPreferencesDto } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (json && typeof json === 'object' && (json as ApiSuccess<NotificationPreferencesDto>).success === true) {
    return { ok: true, data: (json as ApiSuccess<NotificationPreferencesDto>).data };
  }
  return { ok: false, message: 'Could not load preferences', status: res.status };
}

export async function patchNotificationPreferences(
  body: Partial<
    Pick<NotificationPreferencesDto, 'pushEnabled' | 'newUploads' | 'statusChanges' | 'systemAlerts'>
  >,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}`, {
      method: 'PATCH',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (json && typeof json === 'object' && (json as ApiSuccess<unknown>).success === true) {
    return { ok: true, data: (json as ApiSuccess<unknown>).data };
  }
  return { ok: false, message: 'Could not save preferences', status: res.status };
}
