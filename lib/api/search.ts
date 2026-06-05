import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

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

export async function getUnifiedSearch(q: string, opts?: { type?: 'all' | 'decrees' | 'exams'; limit?: number }) {
  const base = getApiBaseUrl();
  if (!base) return { ok: false as const, message: 'API is not configured.', status: 0 };
  const token = await getJwtAccessToken();
  if (!token) return { ok: false as const, message: 'Not signed in.', status: 401 };
  const params = new URLSearchParams();
  params.set('q', q.trim());
  params.set('type', opts?.type ?? 'all');
  if (opts?.limit) params.set('limit', String(opts.limit));
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${base}/api/v1/search?${params.toString()}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<Record<string, unknown>> | null;
  if (!o || o.success !== true || !o.data) {
    return { ok: false as const, message: 'Search failed', status: res.status };
  }
  return { ok: true as const, data: o.data };
}
