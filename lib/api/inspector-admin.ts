/**
 * Inspector Admin API — `GET/POST/PATCH/DELETE /api/v1/inspector-admin/*`.
 * Inspector-admin HTTP contract; use JWT from `@/lib/api/jwt-session-storage`.
 */
import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

const PREFIX = '/api/v1/inspector-admin';

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

function parseContentDispositionFilename(v: string | null): string | null {
  if (!v) return null;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(v);
  const raw = m?.[1] || m?.[2] || m?.[3];
  if (!raw) return null;
  try {
    return decodeURIComponent(String(raw).trim());
  } catch {
    return String(raw).trim();
  }
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

/** Public route (mounted before `authenticate`). */
export async function getInspectorAdminMeta(): Promise<
  { ok: true; data: unknown } | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/_meta`, { headers: { Accept: 'application/json' } });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess(res);
}

export async function getInspectorDashboard(): Promise<
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

export const inspectorAdminApi = {
  listTemplates: (q?: { page?: number; limit?: number; search?: string; sort?: string; isActive?: 'true' | 'false' }) =>
    listPaged<unknown>('/templates', { page: q?.page ?? 1, limit: q?.limit ?? 50, search: q?.search, sort: q?.sort, isActive: q?.isActive }),
  listTemplateCatalog: () => getJson('/template-catalog'),

  createTemplate: (body: unknown) => postJson('/templates', body),
  getTemplate: (id: string) => getJson(`/templates/${encodeURIComponent(id)}`),
  patchTemplate: (id: string, body: unknown) => patchJson(`/templates/${encodeURIComponent(id)}`, body),
  deleteTemplate: (id: string) => deleteJson(`/templates/${encodeURIComponent(id)}`),

  listAssignments: (q?: { page?: number; limit?: number; search?: string; sort?: string; status?: string }) =>
    listPaged<unknown>('/assignments', { page: q?.page ?? 1, limit: q?.limit ?? 50, search: q?.search, sort: q?.sort, status: q?.status }),

  createAssignment: (body: unknown) => postJson('/assignments', body),
  getAssignment: (id: string) => getJson(`/assignments/${encodeURIComponent(id)}`),
  patchAssignment: (id: string, body: unknown) => patchJson(`/assignments/${encodeURIComponent(id)}`, body),

  listSubmissions: (q?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    assignmentId?: string;
    submissionKind?: 'autosave_draft' | 'manual_draft' | 'final';
  }) =>
    listPaged<unknown>('/submissions', {
      page: q?.page ?? 1,
      limit: q?.limit ?? 50,
      search: q?.search,
      sort: q?.sort,
      assignmentId: q?.assignmentId,
      submissionKind: q?.submissionKind,
    }),

  getSubmission: (id: string) => getJson(`/submissions/${encodeURIComponent(id)}`),
  returnSubmission: (id: string, body: unknown) => postJson(`/submissions/${encodeURIComponent(id)}/return`, body),
  finalizeSubmission: (id: string, body: unknown) => postJson(`/submissions/${encodeURIComponent(id)}/finalize`, body),

  listExams: (q?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    status?: string;
    decreeCategoryId?: string;
  }) =>
    listPaged<unknown>('/exams', {
      page: q?.page ?? 1,
      limit: q?.limit ?? 50,
      search: q?.search,
      sort: q?.sort,
      status: q?.status,
      decreeCategoryId: q?.decreeCategoryId,
    }),

  /** Server list query enforces `limit` max 100 (see `listQueryBaseObjectSchema`). */
  listQuestionBank: (q?: { page?: number; limit?: number; sort?: string; decreeCategoryId?: string }) =>
    listPaged<unknown>('/question-bank', {
      page: q?.page ?? 1,
      limit: q?.limit != null ? Math.min(100, q.limit) : 100,
      sort: q?.sort,
      decreeCategoryId: q?.decreeCategoryId,
    }),

  createQuestionBankEntry: (body: unknown) => postJson('/question-bank', body),
  patchQuestionBankEntry: (id: string, body: unknown) =>
    patchJson(`/question-bank/${encodeURIComponent(id)}`, body),
  deleteQuestionBankEntry: (id: string) => deleteJson(`/question-bank/${encodeURIComponent(id)}`),

  createExam: (body: unknown) => postJson('/exams', body),
  getExam: (id: string) => getJson(`/exams/${encodeURIComponent(id)}`),
  patchExam: (id: string, body: unknown) => patchJson(`/exams/${encodeURIComponent(id)}`, body),

  listExamQuestions: (examId: string) => getJson(`/exams/${encodeURIComponent(examId)}/questions`),
  createExamQuestion: (examId: string, body: unknown) =>
    postJson(`/exams/${encodeURIComponent(examId)}/questions`, body),
  patchExamQuestion: (examId: string, questionId: string, body: unknown) =>
    patchJson(`/exams/${encodeURIComponent(examId)}/questions/${encodeURIComponent(questionId)}`, body),
  deleteExamQuestion: (examId: string, questionId: string) =>
    deleteJson(`/exams/${encodeURIComponent(examId)}/questions/${encodeURIComponent(questionId)}`),

  cloneBankQuestionsToExam: (examId: string, body: unknown) =>
    postJson(`/exams/${encodeURIComponent(examId)}/questions/clone-from-bank`, body),

  listExamAttempts: (q?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    examId?: string;
    status?: string;
  }) =>
    listPaged<unknown>('/exam-attempts', {
      page: q?.page ?? 1,
      limit: q?.limit ?? 50,
      search: q?.search,
      sort: q?.sort,
      examId: q?.examId,
      status: q?.status,
    }),

  listInspectors: (q?: { page?: number; limit?: number; search?: string; sort?: string; status?: string }) =>
    listPaged<unknown>('/inspectors', {
      page: q?.page ?? 1,
      limit: q?.limit ?? 100,
      search: q?.search,
      sort: q?.sort,
      status: q?.status,
    }),

  patchInspector: (id: string, body: unknown) =>
    patchJson(`/inspectors/${encodeURIComponent(id)}`, body),

  listOperationalReports: (q?: { page?: number; limit?: number; search?: string; sort?: string }) =>
    listPaged<unknown>('/operational-reports', {
      page: q?.page ?? 1,
      limit: q?.limit ?? 50,
      search: q?.search,
      sort: q?.sort,
    }),

  listCertificates: (q?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    status?: 'issued' | 'revoked';
    holderUserId?: string;
    holderName?: string;
    from?: string;
    to?: string;
  }) =>
    listPaged<unknown>('/certificates', {
      page: q?.page ?? 1,
      limit: q?.limit ?? 50,
      search: q?.search,
      sort: q?.sort,
      status: q?.status,
      holderUserId: q?.holderUserId,
      holderName: q?.holderName,
      from: q?.from,
      to: q?.to,
    }),

  revokeCertificate: (id: string, body: unknown) =>
    postJson(`/certificates/${encodeURIComponent(id)}/revoke`, body),

  getImplementationReport: async (q?: {
    startDate?: string;
    endDate?: string;
    region?: string;
    decreeId?: string;
    categoryId?: string;
  }) => {
    const h = await authHeaders();
    if ('error' in h) return { ok: false as const, message: h.error, status: 0 };
    const params = new URLSearchParams();
    if (q?.startDate) params.set('startDate', q.startDate);
    if (q?.endDate) params.set('endDate', q.endDate);
    if (q?.region) params.set('region', q.region);
    if (q?.decreeId) params.set('decreeId', q.decreeId);
    if (q?.categoryId) params.set('categoryId', q.categoryId);
    const qs = params.toString();
    let res: Response;
    try {
      res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/reports/implementation${qs ? `?${qs}` : ''}`, {
        headers: h.headers,
      });
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : 'Network error', status: 0 };
    }
    return parseSuccess(res);
  },

  downloadReportsCsv: async (q: {
    type: 'inspection_summary' | 'implementation_audit' | 'certification_registry' | 'evaluation_performance';
    startDate?: string;
    endDate?: string;
    region?: string;
    anonymize?: boolean;
  }): Promise<
    | { ok: true; csv: string; filename: string }
    | { ok: false; message: string; status: number }
  > => {
    const h = await authHeaders();
    if ('error' in h) return { ok: false as const, message: h.error, status: 0 };
    const params = new URLSearchParams();
    params.set('type', q.type);
    if (q.startDate) params.set('startDate', q.startDate);
    if (q.endDate) params.set('endDate', q.endDate);
    if (q.region) params.set('region', q.region);
    if (q.anonymize) params.set('anonymize', 'true');

    let res: Response;
    try {
      res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/reports/export-csv?${params.toString()}`, {
        headers: { ...h.headers, Accept: 'text/csv' },
      });
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : 'Network error', status: 0 };
    }
    if (!res.ok) {
      const json = await readJson(res);
      return { ok: false as const, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
    }
    const csv = await res.text();
    const cd = res.headers.get('content-disposition');
    const filename = parseContentDispositionFilename(cd) || 'report.csv';
    return { ok: true as const, csv, filename };
  },

  getTrackingSummary: (q?: { startDate?: string; endDate?: string; incidentThreshold?: number }) =>
    getJson(
      `/tracking/summary${
        q
          ? `?${new URLSearchParams(
              Object.entries(q)
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => [k, String(v)]),
            ).toString()}`
          : ''
      }`,
    ),

  getTrackingZone: (zoneKey: string, q?: { startDate?: string; endDate?: string; incidentThreshold?: number }) =>
    getJson(
      `/tracking/zones/${encodeURIComponent(zoneKey)}${
        q
          ? `?${new URLSearchParams(
              Object.entries(q)
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => [k, String(v)]),
            ).toString()}`
          : ''
      }`,
    ),
};

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

async function patchJson(
  path: string,
  body: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}${path}`, {
      method: 'PATCH',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess(res);
}

async function deleteJson(path: string): Promise<{ ok: true; data: unknown } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}${path}`, { method: 'DELETE', headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess(res);
}
