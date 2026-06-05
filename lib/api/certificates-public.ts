import { getApiBaseUrl } from '@/constants/api';

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function verifyCertificateByRef(certificateRef: string) {
  const base = getApiBaseUrl();
  if (!base) return { ok: false as const, message: 'API is not configured.', status: 0 };
  const ref = certificateRef.trim();
  let res: Response;
  try {
    res = await fetch(
      `${base}/api/v1/certificates/verify/${encodeURIComponent(ref)}`,
      { headers: { Accept: 'application/json' } },
    );
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as { success?: boolean; data?: unknown } | null;
  if (!o || o.success !== true) {
    return { ok: false as const, message: 'Verification failed', status: res.status };
  }
  return { ok: true as const, data: o.data as Record<string, unknown> };
}
