import { Platform } from 'react-native';

import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

const PREFIX = '/api/v1/devices';

type ApiSuccess<T> = { success: true; data: T; message?: string };
type ApiFail = { success: false; message?: string; error?: { message?: string } };

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { success: false, message: text || 'Invalid JSON' };
  }
}

function failMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== 'object') return fallback;
  const o = json as ApiFail;
  return o.message || o.error?.message || fallback;
}

async function authHeaders(): Promise<{ base: string; headers: HeadersInit } | { error: string }> {
  const base = getApiBaseUrl();
  if (!base) return { error: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL.' };
  const token = await getJwtAccessToken();
  if (!token) return { error: 'Not signed in with API credentials.' };
  return {
    base,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

export type DeviceTokenRow = {
  id: string;
  platform: 'ios' | 'android' | 'web';
  provider: 'expo' | 'fcm' | 'apns';
  deviceName: string | null;
  appVersion: string | null;
  locale: string | null;
  lastSeenAt: string | null;
};

export async function listDevices(): Promise<
  { ok: true; data: DeviceTokenRow[] } | { ok: false; message: string; status: number }
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
  if (json && typeof json === 'object' && (json as ApiSuccess<DeviceTokenRow[]>).success === true) {
    return { ok: true, data: (json as ApiSuccess<DeviceTokenRow[]>).data };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export async function registerFcmDeviceToken(args: {
  token: string;
  deviceName?: string;
  appVersion?: string;
  locale?: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const platform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify({
        platform,
        provider: 'fcm',
        token: args.token,
        deviceName: args.deviceName,
        appVersion: args.appVersion,
        locale: args.locale,
      }),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (json && typeof json === 'object' && (json as ApiSuccess<{ id: string }>).success === true) {
    const id = String((json as ApiSuccess<{ id: string }>).data.id ?? '');
    if (id) return { ok: true, id };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export async function registerExpoDeviceToken(args: {
  token: string;
  deviceName?: string;
  appVersion?: string;
  locale?: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const platform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify({
        platform,
        provider: 'expo',
        token: args.token,
        deviceName: args.deviceName,
        appVersion: args.appVersion,
        locale: args.locale,
      }),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (json && typeof json === 'object' && (json as ApiSuccess<{ id: string }>).success === true) {
    const id = String((json as ApiSuccess<{ id: string }>).data.id ?? '');
    if (id) return { ok: true, id };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export async function unregisterAllDevices(): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/session/all`, {
      method: 'DELETE',
      headers: h.headers,
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (json && typeof json === 'object' && (json as ApiSuccess<{ ok: true }>).success === true) {
    return { ok: true };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export async function unregisterDevice(id: string): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: h.headers,
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (json && typeof json === 'object' && (json as ApiSuccess<{ ok: true }>).success === true) {
    return { ok: true };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

