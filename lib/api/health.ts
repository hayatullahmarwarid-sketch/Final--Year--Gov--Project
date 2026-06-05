/**
 * API liveness (`GET /health`) + readiness (`GET /health/ready`) — no auth required.
 *
 * Phase 9 split:
 *   - `/health`        liveness only; 200 while the process is alive.
 *   - `/health/ready`  readiness; 200 when Mongo (+ Redis if configured) are healthy, 503 otherwise.
 */
import { getApiBaseUrl } from '@/constants/api';

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

export type HealthPayload = {
  service?: string;
  /**
   * Liveness status — present on the new `/health` endpoint (Phase 9).
   * Older builds of the API returned a `mongo: 'up' | 'down'` field instead; both shapes are tolerated.
   */
  status?: string;
  mongo?: string;
  uptimeSec?: number;
};

export async function getHealth(): Promise<
  { ok: true; data: HealthPayload } | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}/health`, { headers: { Accept: 'application/json' } });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  if (res.status >= 500) {
    return { ok: false, message: 'Service is temporarily unavailable.', status: res.status };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<HealthPayload> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    return { ok: false, message: 'Invalid health response', status: res.status };
  }
  // `/health` is now a pure liveness probe. A 2xx with an envelope means the API is alive.
  // Callers that need dependency state should use `getReadiness()` below.
  return { ok: true, data: o.data };
}

export type ReadinessPayload = {
  service?: string;
  status?: 'ready' | 'not_ready';
  checks?: {
    mongo?: 'up' | 'down';
    redis?: 'up' | 'down' | 'disabled';
    smtp?: 'configured' | 'disabled';
  };
};

/**
 * Deep readiness check. Returns `{ ok: false, status: 503 }` when any required backing service
 * (Mongo, Redis when configured) is down. Use this instead of `getHealth()` when the UI needs
 * to decide whether to show an outage banner.
 */
export async function getReadiness(): Promise<
  { ok: true; data: ReadinessPayload } | { ok: false; message: string; status: number; data?: ReadinessPayload }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}/health/ready`, { headers: { Accept: 'application/json' } });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (res.status === 503) {
    const body = json as { error?: { details?: ReadinessPayload } } | null;
    return {
      ok: false,
      message: 'Service is temporarily unavailable.',
      status: 503,
      data: body?.error?.details,
    };
  }
  const o = json as ApiSuccess<ReadinessPayload> | null;
  if (!o || o.success !== true || !o.data) {
    return { ok: false, message: 'Invalid readiness response', status: res.status };
  }
  return { ok: true, data: o.data };
}
