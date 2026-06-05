import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

const PATH = '/api/v1/decree-upload/settings';

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

export type DeptUploadSettingsDto = {
  schemaVersion: number;
  department: {
    deptName: string;
    deptCode: string;
    refPrefix: string;
    contactEmail: string;
  };
  system: {
    sessionTimeoutMinutes: number;
    /** When true, decree / certificate / report sequences reset each Kabul calendar year. */
    sequenceYearlyReset: boolean;
    interfaceLanguage: 'en' | 'fa' | 'ps';
    timezone: 'Asia/Kabul';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  };
  notifications: Record<string, unknown>;
  storage: Record<string, unknown>;
  updatedAt: string | null;
};

export type PatchDeptUploadSettingsBody = Partial<{
  department: Partial<DeptUploadSettingsDto['department']>;
  system: Partial<Omit<DeptUploadSettingsDto['system'], 'timezone'>> & { timezone?: 'Asia/Kabul' };
  notifications: Record<string, unknown>;
  storage: Record<string, unknown>;
}>;

const REPORT_REF_PATH = '/api/v1/decree-upload/reports/reference';

export type AnalyticsReportReferenceDto = {
  reference: string;
  refPrefix: string;
  year: number;
  sequence: number;
};

export async function postAllocateAnalyticsReportReference(): Promise<
  { ok: true; data: AnalyticsReportReferenceDto } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${REPORT_REF_PATH}`, { method: 'POST', headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (json && typeof json === 'object' && (json as ApiSuccess<AnalyticsReportReferenceDto>).success === true) {
    return { ok: true, data: (json as ApiSuccess<AnalyticsReportReferenceDto>).data };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export async function getDeptUploadSettings(): Promise<
  { ok: true; data: DeptUploadSettingsDto } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PATH}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (json && typeof json === 'object' && (json as ApiSuccess<DeptUploadSettingsDto>).success === true) {
    return { ok: true, data: (json as ApiSuccess<DeptUploadSettingsDto>).data };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export async function patchDeptUploadSettings(
  body: PatchDeptUploadSettingsBody,
): Promise<{ ok: true; data: DeptUploadSettingsDto } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PATH}`, {
      method: 'PATCH',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (json && typeof json === 'object' && (json as ApiSuccess<DeptUploadSettingsDto>).success === true) {
    return { ok: true, data: (json as ApiSuccess<DeptUploadSettingsDto>).data };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

