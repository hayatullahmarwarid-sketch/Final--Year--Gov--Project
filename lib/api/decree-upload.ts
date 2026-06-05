/**
 * Decree Upload Department API — `GET/POST/PATCH /api/v1/decree-upload/*` and dashboard aggregate.
 */
import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

const PREFIX = '/api/v1/decree-upload';
const DASH = '/api/v1/dashboards/decree-upload';

type ApiSuccess<T> = { success: true; data: T; message?: string; meta?: Record<string, unknown> };
type ApiFail = {
  success: false;
  message?: string;
  error?: {
    message?: string;
    code?: string;
    details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
  };
};

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
  const base = o.message || o.error?.message || fallback;
  const parts: string[] = [];
  const fe = o.error?.details?.fieldErrors;
  if (fe && typeof fe === 'object') {
    for (const msgs of Object.values(fe)) {
      if (!Array.isArray(msgs)) continue;
      for (const m of msgs) {
        if (typeof m === 'string' && m.trim()) parts.push(m.trim());
      }
    }
  }
  const form = o.error?.details?.formErrors;
  if (Array.isArray(form)) {
    for (const m of form) {
      if (typeof m === 'string' && m.trim()) parts.push(m.trim());
    }
  }
  if (parts.length) return `${base} ${parts.join(' ')}`;
  return base;
}

async function authHeaders(): Promise<{ headers: HeadersInit; base: string } | { error: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { error: 'API is not configured. Set EXPO_PUBLIC_API_BASE_URL.' };
  }
  const token = await getJwtAccessToken();
  if (!token) {
    return { error: 'Not signed in with API credentials.' };
  }
  return {
    base,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

async function parseSuccess<T>(res: Response): Promise<{ ok: true; data: T } | { ok: false; message: string; status: number }> {
  const json = await readJson(res);
  const success = json && typeof json === 'object' && (json as ApiSuccess<T>).success === true;
  if (success) {
    return { ok: true, data: (json as ApiSuccess<T>).data };
  }
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function parsePaginated<T>(json: unknown): { items: T[]; meta: PaginatedMeta } | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as ApiSuccess<T[]> & { meta?: PaginatedMeta };
  if (o.success !== true || !Array.isArray(o.data)) return null;
  const meta = o.meta;
  if (!meta || typeof meta.page !== 'number') {
    return {
      items: o.data,
      meta: { page: 1, limit: o.data.length, total: o.data.length, totalPages: 1 },
    };
  }
  return { items: o.data, meta };
}

export type DecreeCategory = {
  id: string;
  slug: string;
  name: string;
  namePs: string | null;
  nameFa: string | null;
  description: string | null;
  parentCategoryId: string | null;
  sortOrder: number;
  isActive: boolean;
  tenantId: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type LocalizedContentBlock = {
  locale: string;
  title?: string | null;
  bodyRich?: string | null;
  bodyPlain?: string | null;
};

export type DecreeVersionSummary = {
  id?: string;
  changeSummary?: string | null;
  localizedContent?: LocalizedContentBlock[];
  publicationStatus?: string;
  [key: string]: unknown;
};

export type SerializedDecree = {
  id: string;
  decreeNumber: string;
  /** User-facing `#1`…`#n` (per category) or legacy text. */
  decreeNumberLabel?: string;
  /** Immutable official reference when using department prefix numbering. */
  officialReference?: string | null;
  /** Denormalized department code at creation time (filtering / audit). */
  departmentCode?: string | null;
  categorySequence?: number | null;
  numberingCategoryId?: string | null;
  titleSummary: string;
  titlePs?: string;
  titleFa?: string;
  titleEn?: string;
  categoryIds: string[];
  categories: DecreeCategory[];
  tagKeys: string[];
  status: 'draft' | 'pending' | 'active' | 'archived' | 'superseded';
  viewCount?: number;
  downloadCount?: number;
  /** User-provided creation/issuance date (distinct from upload timestamp). */
  creationDate?: string | null;
  /** Username / display name of the uploader (when available). */
  uploadedBy?: string | null;
  visibility: string;
  metadata: Record<string, unknown> | null;
  metadataCompleteness: { score: number; missingKeys: string[]; evaluatedAt: string | null } | null;
  currentPublishedVersionId: string | null;
  activeDraftVersionId: string | null;
  currentPublishedVersion: DecreeVersionSummary | null;
  activeDraftVersion: DecreeVersionSummary | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MonthCount = { month: string; count: number };

export type DecreeUploadDashboardDto = {
  generatedAt: string;
  newDecreesThisMonth?: number;
  newDecreesLastMonth?: number;
  newDecreesMonthOverMonth?: {
    changePct: number;
    up: boolean;
    currentMonth: number;
    previousMonth: number;
  } | null;
  viewsMonthOverMonth?: {
    changePct: number;
    up: boolean;
    currentMonth: number;
    previousMonth: number;
    currentMonthLabel: string | null;
    previousMonthLabel: string | null;
  } | null;
  /** Last 12 UTC months of unique public views (from decree_views) for this uploader's decrees. */
  viewsByMonth12?: MonthCount[];
  uploadsByMonth12?: MonthCount[];
  topCategoriesByViews?: {
    categoryId: string;
    slug: string | null;
    name: string;
    viewSum: number;
    sharePct: number;
  }[];
  topViewedCategoryId?: string | null;
  mostViewedDecrees?: {
    id: string;
    decreeNumber: string;
    decreeNumberLabel?: string;
    titleSummary: string;
    viewCount: number;
    categoryId: string | null;
    categoryName: string;
  }[];
  categoryViewTrends?: { categoryId: string; name: string; months: MonthCount[] }[];
  recentActivity?: {
    id: string;
    actionKey: string;
    summary: string | null;
    entityId: string | null;
    occurredAt: string | null;
  }[];
  viewsTotal?: number;
  engagement?: {
    totalViews: number;
    totalDownloads: number;
  };
  decrees: {
    total: number;
    active: number;
    archived: number;
    other: { draft: number; superseded: number; pending: number };
  };
  metadataCompleteness: {
    evaluatedDecrees: number;
    averageScore: number | null;
    distribution: Record<string, number>;
  };
  topCategories: {
    categoryId: string;
    slug: string | null;
    name: string | null;
    namePs: string | null;
    decreeCount: number;
  }[];
  recentUploads: {
    id: string;
    decreeNumber: string;
    decreeNumberLabel?: string;
    titleSummary: string;
    titlePs?: string;
    titleFa?: string;
    titleEn?: string;
    status: string;
    updatedAt: string | null;
    publishedAt: string | null;
    viewCount?: number;
    downloadCount?: number;
  }[];
};

export type CreateCategoryBody = {
  slug: string;
  name: string;
  namePs?: string | null;
  nameFa?: string | null;
  description?: string | null;
  parentCategoryId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  tenantId?: string | null;
};

export type PatchCategoryBody = {
  name?: string;
  namePs?: string | null;
  nameFa?: string | null;
  description?: string | null;
  parentCategoryId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type CreateDecreeBody = {
  titlePs: string;
  titleFa: string;
  titleEn: string;
  /** Denormalized summary (optional); backend accepts legacy-only or trilingual; mirrors English→Ps→Fa fallback. */
  titleSummary?: string;
  /** `draft` = not published; `published` = issue to users and send notifications. */
  initialPublication?: 'draft' | 'pending' | 'published';
  categoryIds: string[];
  tagKeys?: string[];
  visibility?: 'public' | 'internal';
  tenantId?: string | null;
  /** User-provided creation/issuance date for the decree. */
  creationDate?: string | Date | null;
  metadata?: Record<string, unknown>;
  initialVersion?: {
    changeSummary?: string | null;
    localizedContent?: LocalizedContentBlock[];
    sections?: { key: string; title: string; bodyRich?: string | null; sortOrder?: number }[];
    effectiveFrom?: string | Date | null;
    effectiveTo?: string | Date | null;
  };
};

export type PatchDecreeBody = {
  decreeNumber?: string;
  titlePs?: string;
  titleFa?: string;
  titleEn?: string;
  titleSummary?: string;
  categoryIds?: string[];
  tagKeys?: string[];
  visibility?: 'public' | 'internal';
  metadata?: Record<string, unknown>;
  /** When `true` and the decree is still a draft, publish the current version after other updates. */
  publish?: boolean;
  draftVersion?: {
    changeSummary?: string | null;
    localizedContent?: LocalizedContentBlock[];
    sections?: { key: string; title: string; bodyRich?: string | null; sortOrder?: number }[];
    effectiveFrom?: string | Date | null;
    effectiveTo?: string | Date | null;
  };
};

export type NextDecreeNumberPreview = {
  nextIndex: number;
  displayLabel: string;
  departmentCodeReference?: string;
  categoryId: string;
};

export type PublishDecreeBody = {
  versionId?: string;
  effectiveFrom?: string | Date;
  effectiveTo?: string | Date | null;
};

export type ArchiveDecreeBody = {
  reason?: string;
};

export async function getDecreeUploadDashboard(): Promise<
  { ok: true; data: DecreeUploadDashboardDto } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${DASH}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<DecreeUploadDashboardDto>(res);
}

export async function getDecreeUploadMeta(): Promise<
  { ok: true; data: Record<string, unknown> } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/_meta`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<Record<string, unknown>>(res);
}

export type DecreeUploadWorkspaceStats = {
  totalDecrees: number;
  publishedDecrees: number;
  pendingDraftDecrees: number;
  totalViews: number;
  totalDownloads: number;
  newDecreesThisMonth: number;
};

export async function getDecreeUploadStats(): Promise<
  { ok: true; data: DecreeUploadWorkspaceStats } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/stats`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<DecreeUploadWorkspaceStats>(res);
}

export async function listCategories(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: 'true' | 'false';
}): Promise<{ ok: true; items: DecreeCategory[]; meta: PaginatedMeta } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  if (params?.isActive) q.set('isActive', params.isActive);
  const qs = q.toString();
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/categories${qs ? `?${qs}` : ''}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const parsed = parsePaginated<DecreeCategory>(json);
  if (parsed) return { ok: true, ...parsed };
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export async function createCategory(
  body: CreateCategoryBody,
): Promise<{ ok: true; data: DecreeCategory } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/categories`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<DecreeCategory>(res);
}

export async function patchCategory(
  id: string,
  body: PatchCategoryBody,
): Promise<{ ok: true; data: DecreeCategory } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/categories/${id}`, {
      method: 'PATCH',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<DecreeCategory>(res);
}

export async function listDecrees(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  categoryId?: string;
  departmentCode?: string;
  sort?: string;
  from?: string;
  to?: string;
  dateField?: 'createdAt' | 'updatedAt' | 'publishedAt';
}): Promise<{ ok: true; items: SerializedDecree[]; meta: PaginatedMeta } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  if (params?.status) q.set('status', params.status);
  if (params?.categoryId) q.set('categoryId', params.categoryId);
  if (params?.departmentCode) q.set('departmentCode', params.departmentCode);
  if (params?.sort) q.set('sort', params.sort);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.dateField) q.set('dateField', params.dateField);
  const qs = q.toString();
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/decrees${qs ? `?${qs}` : ''}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const parsed = parsePaginated<SerializedDecree>(json);
  if (parsed) return { ok: true, ...parsed };
  return { ok: false, message: failMessage(json, `Request failed (${res.status})`), status: res.status };
}

export async function getNextDecreeNumberPreview(params: {
  categoryId: string;
}): Promise<{ ok: true; data: NextDecreeNumberPreview } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const q = new URLSearchParams();
  q.set('categoryId', params.categoryId);
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/decrees/next-number?${q.toString()}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<NextDecreeNumberPreview>(res);
}

export async function getDecreeById(
  id: string,
): Promise<{ ok: true; data: SerializedDecree } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/decrees/${id}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<SerializedDecree>(res);
}

export async function createDecree(
  body: CreateDecreeBody,
): Promise<{ ok: true; data: SerializedDecree } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/decrees`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<SerializedDecree>(res);
}

export async function patchDecree(
  id: string,
  body: PatchDecreeBody,
): Promise<{ ok: true; data: SerializedDecree } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/decrees/${id}`, {
      method: 'PATCH',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<SerializedDecree>(res);
}

export async function publishDecree(
  id: string,
  body: PublishDecreeBody = {},
): Promise<{ ok: true; data: SerializedDecree } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/decrees/${id}/publish`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<SerializedDecree>(res);
}

export async function archiveDecree(
  id: string,
  body: ArchiveDecreeBody = {},
): Promise<{ ok: true; data: SerializedDecree } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/decrees/${id}/archive`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<SerializedDecree>(res);
}
