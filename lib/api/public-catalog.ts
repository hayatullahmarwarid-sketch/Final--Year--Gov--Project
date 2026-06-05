/**
 * Public decree catalog (`GET /api/v1/public/decrees`) — no auth required.
 */
import { getApiBaseUrl } from '@/constants/api';

const PREFIX = '/api/v1/public';

type ApiSuccess<T> = { success: true; data: T; meta?: Record<string, unknown> };

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export type PaginatedMeta = { page: number; limit: number; total: number; totalPages: number };

export async function listPublicDecreesPage(query?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<
  { ok: true; items: unknown[]; meta: PaginatedMeta } | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  const q = new URLSearchParams();
  q.set('page', String(query?.page ?? 1));
  q.set('limit', String(query?.limit ?? 50));
  const kw = query?.search?.trim();
  if (kw) q.set('search', kw);
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/decrees?${q.toString()}`, { headers: { Accept: 'application/json' } });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (!json || typeof json !== 'object') return { ok: false, message: 'Invalid response', status: res.status };
  const o = json as ApiSuccess<unknown[]> & { meta?: PaginatedMeta };
  if (o.success !== true || !Array.isArray(o.data)) {
    return { ok: false, message: 'Invalid list response', status: res.status };
  }
  const meta = o.meta ?? { page: 1, limit: o.data.length, total: o.data.length, totalPages: 1 };
  return { ok: true, items: o.data, meta };
}
