/**
 * Authenticated public persona — `GET /api/v1/public/*` (Bearer `public_user` JWT).
 * Identity is resolved server-side from `sub`; do not send `X-Public-User-Id` when using JWT.
 */
import { getApiBaseUrl } from '@/constants/api';

import { rotateStoredRefreshToken } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';
import type { PaginatedMeta } from '@/lib/api/public-catalog';

const PREFIX = '/api/v1/public';

/** Matches `list-query.schema.js` (`limit` max 100) for `/public` list routes. */
const PUBLIC_LIST_MAX_LIMIT = 100;

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

async function authHeader(): Promise<Record<string, string>> {
  const token = await getJwtAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** One rotation attempt after HTTP 401 (e.g. expired access token). */
async function tryRotateJwtAfter401(): Promise<boolean> {
  return rotateStoredRefreshToken();
}

/**
 * `GET /public/*` list calls: retry once with fresh tokens when the access JWT expired.
 */
async function publicFetchWithOptionalJwtRefresh(url: string, init: RequestInit): Promise<Response> {
  let res = await fetch(url, init);
  if (res.status === 401 && (await tryRotateJwtAfter401())) {
    const nextHeaders = new Headers(init.headers);
    const ah = await authHeader();
    if (ah.Authorization) nextHeaders.set('Authorization', ah.Authorization);
    res = await fetch(url, { ...init, headers: nextHeaders });
  }
  return res;
}

/** Parses `{ success: false, message, error }` from the API error envelope. */
function parseApiErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  if (o.success !== false) return null;
  const msg = typeof o.message === 'string' ? o.message.trim() : '';
  const err = o.error;
  if (err && typeof err === 'object') {
    const em = (err as Record<string, unknown>).message;
    if (typeof em === 'string' && em.trim()) return em.trim();
  }
  return msg || null;
}

export type PublicHomePayload = Record<string, unknown>;

export type PublicHomeSettingsHints = {
  defaultLocale: string;
  supportedLocales: string[];
  publicSiteName: string;
};

/** Extracts portal language hints from `GET /api/v1/public/home` payload. */
export function parsePublicHomeSettingsHints(data: PublicHomePayload): PublicHomeSettingsHints | null {
  const hints = data.settingsHints;
  if (!hints || typeof hints !== 'object' || Array.isArray(hints)) return null;
  const h = hints as Record<string, unknown>;
  const defaultLocale =
    typeof h.defaultLocale === 'string' && h.defaultLocale.trim() ? h.defaultLocale.trim() : 'ps';
  const publicSiteName =
    typeof h.publicSiteName === 'string' && h.publicSiteName.trim()
      ? h.publicSiteName.trim()
      : 'Sharia Decrees';
  let supportedLocales: string[] = [];
  if (Array.isArray(h.supportedLocales)) {
    supportedLocales = h.supportedLocales.map((x) => String(x).trim()).filter(Boolean);
  }
  return { defaultLocale, supportedLocales, publicSiteName };
}

export async function getPublicHome(query?: {
  locale?: string;
}): Promise<{ ok: true; data: PublicHomePayload } | { ok: false; message: string; status: number }> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  const q = new URLSearchParams();
  if (query?.locale?.trim()) q.set('locale', query.locale.trim());
  const qs = q.toString();
  let res: Response;
  try {
    // Anonymous only: a stale `Authorization` header triggers 401 ("Access token expired")
    // before public routes run; home must work for onboarding before login.
    res = await fetch(`${base}${PREFIX}/home${qs ? `?${qs}` : ''}`, {
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const envelope = json as { success?: boolean; message?: string; data?: unknown } | null;
  if (envelope && typeof envelope === 'object' && envelope.success === false) {
    const msg =
      typeof envelope.message === 'string' && envelope.message.trim()
        ? envelope.message.trim()
        : 'Request failed';
    return { ok: false, message: `${msg} (HTTP ${res.status})`, status: res.status };
  }
  const o = json as ApiSuccess<PublicHomePayload> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    if (!json) {
      return {
        ok: false,
        message:
          res.status >= 400
            ? `Home request failed (HTTP ${res.status})`
            : `Home response was not valid JSON (HTTP ${res.status})`,
        status: res.status,
      };
    }
    return { ok: false, message: 'Invalid home response', status: res.status };
  }
  return { ok: true, data: o.data };
}

export type PublicProfilePayload = Record<string, unknown>;

export async function getPublicUserProfile(): Promise<
  { ok: true; data: PublicProfilePayload } | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/profile`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<PublicProfilePayload> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    return { ok: false, message: 'Invalid profile response', status: res.status };
  }
  return { ok: true, data: o.data };
}

export type PublicDecreeCategoryRow = Record<string, unknown>;

export async function listPublicDecreeCategoriesPage(query?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<
  | { ok: true; items: PublicDecreeCategoryRow[]; meta: PaginatedMeta }
  | { ok: false; message: string; status: number }
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
    res = await fetch(`${base}${PREFIX}/decree-categories?${q.toString()}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
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
  return { ok: true, items: o.data as PublicDecreeCategoryRow[], meta };
}

export type PublicDashboardPayload = Record<string, unknown>;

/** Role-gated summary cards — requires `public` session JWT + same Bearer. */
export async function getPublicRoleDashboard(): Promise<
  { ok: true; data: PublicDashboardPayload } | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/dashboards/public`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<PublicDashboardPayload> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    return { ok: false, message: 'Invalid dashboard response', status: res.status };
  }
  return { ok: true, data: o.data };
}

export type PublicDecreeRow = Record<string, unknown>;

export async function listPublicDecreesPage(query?: {
  page?: number;
  limit?: number;
  search?: string;
  keyword?: string;
  categoryId?: string;
  language?: string;
  status?: string;
  from?: string | Date;
  to?: string | Date;
  dateField?: 'publishedAt' | 'createdAt' | 'creationDate';
}): Promise<
  | { ok: true; items: PublicDecreeRow[]; meta: PaginatedMeta }
  | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  const q = new URLSearchParams();
  q.set('page', String(query?.page ?? 1));
  q.set('limit', String(query?.limit ?? 20));
  const kw = query?.search?.trim() || query?.keyword?.trim();
  if (kw) q.set('search', kw);
  if (query?.categoryId?.trim()) q.set('categoryId', query.categoryId.trim());
  if (query?.language?.trim()) q.set('language', query.language.trim());
  if (query?.status?.trim()) q.set('status', query.status.trim());
  if (query?.dateField) q.set('dateField', query.dateField);
  if (query?.from) q.set('from', query.from instanceof Date ? query.from.toISOString() : String(query.from));
  if (query?.to) q.set('to', query.to instanceof Date ? query.to.toISOString() : String(query.to));
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/decrees?${q.toString()}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
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
  return { ok: true, items: o.data as PublicDecreeRow[], meta };
}

export async function getPublicDecreeById(
  id: string,
): Promise<{ ok: true; data: PublicDecreeRow } | { ok: false; message: string; status: number }> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/decrees/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<PublicDecreeRow> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    return { ok: false, message: 'Decree not found', status: res.status };
  }
  return { ok: true, data: o.data };
}

/**
 * POST after ~30s on the decree reader (signed-in public users). Each qualifying session adds one
 * `decree_views` row and increments the decree’s view count; uploader category charts use the decree’s
 * primary category.
 */
export async function postPublicDecreeRecordView(
  decreeId: string,
): Promise<
  | { ok: true; data: { recorded: boolean; note?: string } }
  | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  const id = String(decreeId).trim();
  if (!id) return { ok: false, message: 'Invalid decree id', status: 0 };
  let res: Response;
  try {
    res = await publicFetchWithOptionalJwtRefresh(`${base}${PREFIX}/decrees/${encodeURIComponent(id)}/view`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(await authHeader()),
      },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (!json || typeof json !== 'object') {
    return { ok: false, message: 'Invalid response', status: res.status };
  }
  const errMsg = parseApiErrorMessage(json);
  if (errMsg) {
    return { ok: false, message: errMsg, status: res.status };
  }
  const o = json as ApiSuccess<{ recorded: boolean; note?: string }> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    return { ok: false, message: parseApiErrorMessage(json) ?? 'Invalid response', status: res.status };
  }
  return { ok: true, data: o.data };
}

export function buildPublicDecreePdfUrl(decreeId: string, opts?: { locale?: string }): string | null {
  const base = getApiBaseUrl();
  if (!base) return null;
  const id = String(decreeId).trim();
  if (!id) return null;
  const q = new URLSearchParams();
  const locale = String(opts?.locale ?? '').trim().toLowerCase();
  if (locale === 'ps' || locale === 'en' || locale === 'fa') q.set('locale', locale);
  const qs = q.toString();
  return `${base}${PREFIX}/decrees/${encodeURIComponent(id)}/pdf${qs ? `?${qs}` : ''}`;
}

export type PublicBookmarkRow = Record<string, unknown>;

export async function listPublicBookmarksPage(query?: {
  page?: number;
  limit?: number;
}): Promise<
  | { ok: true; items: PublicBookmarkRow[]; meta: PaginatedMeta }
  | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  const q = new URLSearchParams();
  q.set('page', String(query?.page ?? 1));
  const rawLimit = query?.limit ?? PUBLIC_LIST_MAX_LIMIT;
  const limit = Math.min(PUBLIC_LIST_MAX_LIMIT, Math.max(1, Math.floor(Number(rawLimit)) || PUBLIC_LIST_MAX_LIMIT));
  q.set('limit', String(limit));
  let res: Response;
  try {
    res = await publicFetchWithOptionalJwtRefresh(`${base}${PREFIX}/bookmarks?${q.toString()}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  if (!json || typeof json !== 'object') {
    return {
      ok: false,
      message:
        res.status >= 400
          ? `Bookmarks request failed (HTTP ${res.status})`
          : 'Bookmarks response was not valid JSON',
      status: res.status,
    };
  }
  const failMsg = parseApiErrorMessage(json);
  if (failMsg) {
    return { ok: false, message: failMsg, status: res.status };
  }
  const o = json as ApiSuccess<unknown[]> & { meta?: PaginatedMeta };
  if (o.success !== true || !Array.isArray(o.data)) {
    return {
      ok: false,
      message: parseApiErrorMessage(json) ?? 'Invalid list response',
      status: res.status,
    };
  }
  const meta = o.meta ?? { page: 1, limit: o.data.length, total: o.data.length, totalPages: 1 };
  return { ok: true, items: o.data as PublicBookmarkRow[], meta };
}

export async function postPublicBookmark(body: {
  decreeId: string;
}): Promise<
  { ok: true; data: PublicBookmarkRow } | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await publicFetchWithOptionalJwtRefresh(`${base}${PREFIX}/bookmarks`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(await authHeader()),
      },
      body: JSON.stringify({ decreeId: body.decreeId.trim() }),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const errMsg = parseApiErrorMessage(json);
  if (errMsg) {
    return { ok: false, message: errMsg, status: res.status };
  }
  const o = json as ApiSuccess<PublicBookmarkRow> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    const fail = json as { message?: string } | null;
    return { ok: false, message: fail?.message || 'Bookmark failed', status: res.status };
  }
  return { ok: true, data: o.data };
}

export async function deletePublicBookmark(
  bookmarkId: string,
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await publicFetchWithOptionalJwtRefresh(
      `${base}${PREFIX}/bookmarks/${encodeURIComponent(bookmarkId)}`,
      {
        method: 'DELETE',
        headers: { Accept: 'application/json', ...(await authHeader()) },
      },
    );
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const errMsg = parseApiErrorMessage(json);
  if (errMsg) {
    return { ok: false, message: errMsg, status: res.status };
  }
  const o = json as ApiSuccess<unknown> | null;
  if (!o || o.success !== true) {
    const fail = json as { message?: string } | null;
    return { ok: false, message: fail?.message || 'Remove bookmark failed', status: res.status };
  }
  return { ok: true };
}

export type PublicNotificationRow = Record<string, unknown>;

export async function listPublicNotificationsPage(query?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<
  | { ok: true; items: PublicNotificationRow[]; meta: PaginatedMeta }
  | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  const q = new URLSearchParams();
  q.set('page', String(query?.page ?? 1));
  q.set('limit', String(query?.limit ?? 20));
  const kw = query?.search?.trim();
  if (kw) q.set('search', kw);
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/notifications?${q.toString()}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
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
  return { ok: true, items: o.data as PublicNotificationRow[], meta };
}

export type PublicExamRow = Record<string, unknown>;

export async function listPublicExamsPage(query?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<
  | { ok: true; items: PublicExamRow[]; meta: PaginatedMeta }
  | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  const q = new URLSearchParams();
  q.set('page', String(query?.page ?? 1));
  q.set('limit', String(query?.limit ?? 50));
  const kw = query?.search?.trim();
  if (kw) q.set('search', kw);
  if (query?.status?.trim()) q.set('status', query.status.trim());
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/exams?${q.toString()}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
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
  return { ok: true, items: o.data as PublicExamRow[], meta };
}

export async function getPublicExamById(
  id: string,
): Promise<{ ok: true; data: PublicExamRow } | { ok: false; message: string; status: number }> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/exams/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<PublicExamRow> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    return { ok: false, message: 'Exam not found', status: res.status };
  }
  return { ok: true, data: o.data };
}

export type PublicExamAttemptStartPayload = Record<string, unknown>;

export async function postPublicExamAttempt(body: {
  examId: string;
  locale?: string;
}): Promise<
  { ok: true; data: PublicExamAttemptStartPayload } | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/exam-attempts`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(await authHeader()),
      },
      body: JSON.stringify({ examId: body.examId.trim(), locale: body.locale?.trim() || undefined }),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<PublicExamAttemptStartPayload> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    const fail = json as { message?: string } | null;
    return { ok: false, message: fail?.message || 'Could not start exam', status: res.status };
  }
  return { ok: true, data: o.data };
}

export type PublicExamSubmitPayload = Record<string, unknown>;

export async function postPublicExamAttemptSubmit(
  attemptId: string,
  body: { answers: Record<string, unknown>[] },
): Promise<
  { ok: true; data: PublicExamSubmitPayload } | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/exam-attempts/${encodeURIComponent(attemptId)}/submit`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(await authHeader()),
      },
      body: JSON.stringify({ answers: body.answers }),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<PublicExamSubmitPayload> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    const fail = json as { message?: string } | null;
    return { ok: false, message: fail?.message || 'Submit failed', status: res.status };
  }
  return { ok: true, data: o.data };
}

export async function getPublicExamAttemptById(
  attemptId: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string; status: number }> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await publicFetchWithOptionalJwtRefresh(
      `${base}${PREFIX}/exam-attempts/${encodeURIComponent(attemptId)}`,
      { headers: { Accept: 'application/json', ...(await authHeader()) } },
    );
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as ApiSuccess<Record<string, unknown>> | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    const fail = json as { message?: string } | null;
    return { ok: false, message: fail?.message || 'Attempt not found', status: res.status };
  }
  return { ok: true, data: o.data };
}

export type PublicExamResultRow = Record<string, unknown>;

export async function listPublicResultsPage(query?: {
  page?: number;
  limit?: number;
}): Promise<
  | { ok: true; items: PublicExamResultRow[]; meta: PaginatedMeta }
  | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  const q = new URLSearchParams();
  q.set('page', String(query?.page ?? 1));
  q.set('limit', String(query?.limit ?? 100));
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/results?${q.toString()}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
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
  return { ok: true, items: o.data as PublicExamResultRow[], meta };
}

export type PublicCertificateRow = Record<string, unknown>;

export async function listPublicCertificatesPage(query?: {
  page?: number;
  limit?: number;
}): Promise<
  | { ok: true; items: PublicCertificateRow[]; meta: PaginatedMeta }
  | { ok: false; message: string; status: number }
> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  const q = new URLSearchParams();
  q.set('page', String(query?.page ?? 1));
  q.set('limit', String(query?.limit ?? 50));
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/certificates?${q.toString()}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
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
  return { ok: true, items: o.data as PublicCertificateRow[], meta };
}

export async function getPublicCertificateById(
  id: string,
): Promise<{ ok: true; data: PublicCertificateRow } | { ok: false; message: string; status: number }> {
  const base = getApiBaseUrl();
  if (!base) return { ok: false, message: 'API is not configured.', status: 0 };
  let res: Response;
  try {
    res = await fetch(`${base}${PREFIX}/certificates/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const o = json as (ApiSuccess<PublicCertificateRow> & { message?: string }) | null;
  if (!o || o.success !== true || !o.data || typeof o.data !== 'object') {
    const msg =
      o && typeof o.message === 'string' && o.message.trim() ? o.message.trim() : 'Certificate not found';
    return { ok: false, message: msg, status: res.status };
  }
  return { ok: true, data: o.data };
}
