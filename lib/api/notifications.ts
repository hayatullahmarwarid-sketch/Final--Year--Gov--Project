/**
 * Global inbox — `GET|POST /api/v1/notifications/*` (Bearer JWT; recipient resolved server-side).
 * Public mobile uses `public_user` JWT so `notificationRecipientMiddleware` can resolve `ownerUserId`.
 */
import { getApiBaseUrl } from '@/constants/api';

import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import type { PaginatedMeta } from '@/lib/api/public-catalog';

const PREFIX = '/api/v1/notifications';

type ApiSuccess<T> = { success: true; data: T; meta?: PaginatedMeta };

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<{ base: string; headers: Record<string, string> } | { error: string }> {
  const base = getApiBaseUrl();
  if (!base) return { error: 'API is not configured.' };
  const token = await getJwtAccessToken();
  if (!token) return { error: 'Not signed in.' };
  return {
    base,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  };
}

function failMessage(json: unknown, fallback: string): string {
  if (json && typeof json === 'object' && 'message' in json) {
    const m = (json as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  return fallback;
}

export type InboxNotificationRow = Record<string, unknown>;

export async function listNotificationsPage(query?: {
  page?: number;
  limit?: number;
  search?: string;
  /** Defaults to `inbox` on the server when omitted. */
  view?: 'inbox' | 'directory';
}): Promise<
  | { ok: true; items: InboxNotificationRow[]; meta: PaginatedMeta }
  | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const q = new URLSearchParams();
  q.set('page', String(query?.page ?? 1));
  q.set('limit', String(query?.limit ?? 20));
  const kw = query?.search?.trim();
  if (kw) q.set('search', kw);
  if (query?.view) q.set('view', query.view);
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}?${q.toString()}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (!json || typeof json !== 'object') return { ok: false, message: 'Invalid response', status: res.status };
  const o = json as ApiSuccess<unknown[]> & { meta?: PaginatedMeta };
  if (o.success !== true || !Array.isArray(o.data)) {
    return { ok: false, message: failMessage(json, 'Invalid list response'), status: res.status };
  }
  const meta = o.meta ?? { page: 1, limit: o.data.length, total: o.data.length, totalPages: 1 };
  return { ok: true, items: o.data as InboxNotificationRow[], meta };
}

export async function getNotificationsBadgeCount(): Promise<
  { ok: true; count: number } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/badge-count`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<{ count?: number }> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    return { ok: false, message: failMessage(json, 'Invalid badge response'), status: res.status };
  }
  const c = (o.data as { count?: unknown }).count;
  const count = typeof c === 'number' && Number.isFinite(c) ? c : 0;
  return { ok: true, count };
}

export async function postNotificationMarkRead(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: { ...h.headers, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as { success?: boolean } | null;
  if (!o || o.success !== true) {
    return { ok: false, message: failMessage(json, 'Could not mark read'), status: res.status };
  }
  return { ok: true };
}

export async function postNotificationsMarkAllRead(): Promise<
  { ok: true } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/read-all`, {
      method: 'POST',
      headers: { ...h.headers, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as { success?: boolean } | null;
  if (!o || o.success !== true) {
    return { ok: false, message: failMessage(json, 'Could not mark all read'), status: res.status };
  }
  return { ok: true };
}
