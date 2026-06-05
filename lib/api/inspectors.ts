/**
 * Field inspector API — `GET/POST /api/v1/inspectors/*`.
 * JWT from `@/lib/api/jwt-session-storage`; base URL from `@/constants/api`.
 */
import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

const PREFIX = '/api/v1/inspectors';

type ApiSuccess<T> = { success: true; data: T; message?: string; meta?: Record<string, unknown> };
type ApiFail = { success: false; message?: string; error?: { message?: string; code?: string } };

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

async function authHeaders(): Promise<{ headers: HeadersInit; base: string } | { error: string }> {
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

async function parseSuccess<T>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; message: string; status: number }> {
  const json = await readJson(res);
  const success = json && typeof json === 'object' && (json as ApiSuccess<T>).success === true;
  if (success) {
    return { ok: true, data: (json as ApiSuccess<T>).data };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export type PaginatedMeta = { page: number; limit: number; total: number; totalPages: number };

function parsePaginated<T>(json: unknown): { items: T[]; meta: PaginatedMeta } | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as ApiSuccess<T[]> & { meta?: PaginatedMeta };
  if (o.success !== true || !Array.isArray(o.data)) return null;
  const meta = o.meta;
  if (!meta || typeof meta.page !== 'number') {
    return { items: o.data, meta: { page: 1, limit: o.data.length, total: o.data.length, totalPages: 1 } };
  }
  return { items: o.data, meta };
}

export async function getInspectorsDashboard(): Promise<
  { ok: true; data: unknown } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/dashboard`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess(res);
}

async function listPaged<T>(
  path: string,
  query: Record<string, string | number | undefined>,
): Promise<{ ok: true; items: T[]; meta: PaginatedMeta } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '') continue;
    q.set(k, String(v));
  }
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}${path}?${q.toString()}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const parsed = parsePaginated<T>(json);
  if (!parsed) {
    return { ok: false, message: failMessage(json, 'Invalid list response'), status: res.status };
  }
  return { ok: true, items: parsed.items, meta: parsed.meta };
}

async function getJson(path: string): Promise<{ ok: true; data: unknown } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}${path}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess(res);
}

async function postJson(
  path: string,
  body: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}${path}`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess(res);
}

export const inspectorsApi = {
  listAssignments: (q?: { page?: number; limit?: number; search?: string; sort?: string; status?: string }) =>
    listPaged<unknown>('/assignments', {
      page: q?.page ?? 1,
      limit: q?.limit ?? 50,
      search: q?.search,
      sort: q?.sort,
      status: q?.status,
    }),

  getAssignment: (id: string) => getJson(`/assignments/${encodeURIComponent(id)}`),

  saveDraft: (id: string, body: unknown) => postJson(`/assignments/${encodeURIComponent(id)}/save-draft`, body),

  submit: (id: string, body: unknown) => postJson(`/assignments/${encodeURIComponent(id)}/submit`, body),

  importOfflineInspection: (body: unknown) => postJson('/inspections/offline', body),

  syncOfflineInspections: () => postJson('/inspections/offline/sync', {}),

  attachEvidence: (id: string, body: unknown) =>
    postJson(`/assignments/${encodeURIComponent(id)}/evidence`, body),

  syncStatus: async (q?: { limit?: number; includeFinalized?: boolean }) => {
    const h = await authHeaders();
    if ('error' in h) return { ok: false, message: h.error, status: 0 };
    const qstr = new URLSearchParams();
    if (q?.limit) qstr.set('limit', String(q.limit));
    if (q?.includeFinalized === true) qstr.set('includeFinalized', 'true');
    let res: Response;
    try {
      res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/sync-status?${qstr.toString()}`, { headers: h.headers });
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
    }
    return parseSuccess(res);
  },

  profile: () => getJson('/profile'),
};
