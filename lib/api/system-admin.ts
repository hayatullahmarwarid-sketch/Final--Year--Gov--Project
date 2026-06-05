/**
 * System Admin API client — mirrors `GET/PATCH /api/v1/system-admin/*` routes.
 * Uses JWT from `@/lib/api/jwt-session-storage`.
 *
 * Super-admin-only HTTP surface (`/api/v1/super-admin/*`) is not used by this mobile app;
 * operators with elevated access use the system-admin persona here.
 */
import { getApiBaseUrl } from '@/constants/api';
import { fetchWithJwtRefresh } from '@/lib/api/fetch-with-jwt-refresh';
import { getJwtAccessToken } from '@/lib/api/jwt-session-storage';

const PREFIX = '/api/v1/system-admin';

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

export type SystemAdminStaffMember = {
  id: string;
  displayName: string | null;
  email: string | null;
  phoneE164: string | null;
  preferredLocale: string;
  roleKey: string | null;
  roleId: string | null;
  status: string | null;
  profile?: Record<string, unknown>;
  deactivatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SystemAdminAuditLogRow = {
  id: string | null;
  actionKey: string | null;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  payload?: unknown;
  actorUserId: string | null;
  actorRoleKey: string | null;
  actorType: string;
  actorLabel?: string | null;
  displaySummary?: string | null;
  httpMethod?: string | null;
  httpPath?: string | null;
  httpStatus?: number | null;
  correlationId: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  integrityHash: string | null;
  occurredAt: string | null;
  createdAt: string | null;
};

export type PlatformSettingsDoc = {
  docKey: string;
  schemaVersion: number;
  portal: Record<string, unknown>;
  security: Record<string, unknown>;
  integrations: Record<string, unknown>;
  features: Record<string, unknown>;
  maintenance: {
    enabled: boolean;
    message: string | null;
    scheduledUntil: string | null;
    flags: Record<string, boolean>;
  };
  extensions: Record<string, unknown>;
  updatedAt: string | null;
  createdAt: string | null;
};

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListStaffResult = { items: SystemAdminStaffMember[]; meta: PaginatedMeta };
export type ListAuditLogsResult = { items: SystemAdminAuditLogRow[]; meta: PaginatedMeta };

export type SystemAdminDashboard = {
  generatedAt: string;
  headline?: { title?: string; subtitle?: string };
  cards?: { key: string; label: string; value: number }[];
  maintenance?: Record<string, unknown>;
  staff?: { total: number; pending: number; byRole: { roleKey: string; total: number }[] };
  audit?: { last24Hours: number; newestEventAt: string | null };
  notifications?: { total: number };
  settings?: Record<string, unknown>;
  governance?: Record<string, unknown>;
};

export type AuditActivityBucketRow = { bucket: number; requests: number; logins: number };

export type SystemSummary = {
  generatedAt: string;
  health?: {
    status?: 'ok' | 'warning' | 'critical';
    uptimeSeconds?: number;
    databaseLatencyMs?: number | null;
    httpErrorRatePct?: number;
    api?: string;
    database?: string;
  };
  totals?: {
    staffUsers?: number;
    publicUsers?: number;
    totalUsers?: number;
    auditLogs?: number;
    notifications?: number;
    publishedDecrees?: number;
    auditEvents24h?: number;
    auditSecurityEvents24h?: number;
  };
  trends?: {
    totalUsersPct7d?: number;
    securityEventsPct24h?: number;
  };
  staffRoleBreakdown?: { roleKey: string; total: number }[];
  maintenance?: Record<string, unknown>;
  latestAudit?: SystemAdminAuditLogRow | null;
  auditActivityBuckets?: AuditActivityBucketRow[];
};

export type SystemAdminInboxNotification = {
  id: string;
  title: string;
  body: string;
  channel?: string;
  readStatus: string;
  readAt?: string | null;
  createdAt?: string;
};

export type CreateStaffBody = {
  displayName: string;
  roleKey: string;
  email?: string;
  phoneE164?: string;
  preferredLocale?: string;
  status?: 'pending' | 'active' | 'suspended';
  profile?: Record<string, unknown>;
  /** Strong password: staff can log in immediately; omit to require forgot-password / invite flow. */
  initialPassword?: string;
};

export type PatchStaffBody = {
  displayName?: string;
  roleKey?: string;
  email?: string | null;
  phoneE164?: string | null;
  preferredLocale?: string;
  status?: 'pending' | 'active' | 'suspended';
  profile?: Record<string, unknown>;
  deactivatedAt?: string | Date | null;
};

export type PatchSettingsBody = {
  portal?: Record<string, unknown>;
  security?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
  features?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
  maintenance?: {
    enabled?: boolean;
    message?: string | null;
    scheduledUntil?: string | Date | null;
    flags?: Record<string, boolean>;
  };
  schemaVersion?: number;
};

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

export async function getSystemAdminDashboard(): Promise<
  { ok: true; data: SystemAdminDashboard } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/dashboard`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<SystemAdminDashboard>(res);
}

export async function getSystemSummary(): Promise<
  { ok: true; data: SystemSummary } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/system-summary`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<SystemSummary>(res);
}

export async function listStaffPage(query: {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  roleKey?: string;
  status?: string;
}): Promise<{ ok: true; result: ListStaffResult } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const q = new URLSearchParams();
  if (query.page) q.set('page', String(query.page));
  q.set('limit', String(query.limit ?? 100));
  if (query.sort) q.set('sort', query.sort);
  if (query.search) q.set('search', query.search);
  if (query.roleKey) q.set('roleKey', query.roleKey);
  if (query.status) q.set('status', query.status);
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/staff?${q.toString()}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const parsed = parsePaginated<SystemAdminStaffMember>(json);
  if (!parsed) {
    return { ok: false, message: failMessage(json, 'Invalid staff list response'), status: res.status };
  }
  return { ok: true, result: { items: parsed.items, meta: parsed.meta } };
}

/** Fetches all staff pages up to `maxPages` or until exhausted. */
export async function listAllStaff(maxPages = 20): Promise<
  { ok: true; items: SystemAdminStaffMember[] } | { ok: false; message: string; status: number }
> {
  const items: SystemAdminStaffMember[] = [];
  let page = 1;
  for (let i = 0; i < maxPages; i++) {
    const r = await listStaffPage({ page, limit: 100, sort: '-createdAt' });
    if (!r.ok) return r;
    items.push(...r.result.items);
    if (r.result.items.length === 0 || page >= r.result.meta.totalPages) break;
    page += 1;
  }
  return { ok: true, items };
}

export async function listAuditLogsPage(query: {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  from?: string;
  to?: string;
}): Promise<{ ok: true; result: ListAuditLogsResult } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const q = new URLSearchParams();
  if (query.page) q.set('page', String(query.page));
  q.set('limit', String(query.limit ?? 100));
  if (query.sort) q.set('sort', query.sort);
  if (query.search) q.set('search', query.search);
  if (query.from) q.set('from', query.from);
  if (query.to) q.set('to', query.to);
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/audit-logs?${q.toString()}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const parsed = parsePaginated<SystemAdminAuditLogRow>(json);
  if (!parsed) {
    return { ok: false, message: failMessage(json, 'Invalid audit log response'), status: res.status };
  }
  return { ok: true, result: { items: parsed.items, meta: parsed.meta } };
}

export async function listAllAuditLogs(
  maxRows = 500,
  opts?: { from?: string; to?: string },
): Promise<{ ok: true; items: SystemAdminAuditLogRow[] } | { ok: false; message: string; status: number }> {
  const items: SystemAdminAuditLogRow[] = [];
  let page = 1;
  while (items.length < maxRows) {
    const r = await listAuditLogsPage({
      page,
      limit: 100,
      sort: '-occurredAt',
      from: opts?.from,
      to: opts?.to,
    });
    if (!r.ok) return r;
    items.push(...r.result.items);
    if (r.result.items.length === 0 || page >= r.result.meta.totalPages) break;
    page += 1;
    if (items.length >= maxRows) break;
  }
  return { ok: true, items: items.slice(0, maxRows) };
}

export async function listPlatformUsersPage(query: {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  roleKey?: string;
  status?: string;
}): Promise<{ ok: true; result: ListStaffResult } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const q = new URLSearchParams();
  if (query.page) q.set('page', String(query.page));
  q.set('limit', String(query.limit ?? 100));
  if (query.sort) q.set('sort', query.sort);
  if (query.search) q.set('search', query.search);
  if (query.roleKey) q.set('roleKey', query.roleKey);
  if (query.status) q.set('status', query.status);
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/platform-users?${q.toString()}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const parsed = parsePaginated<SystemAdminStaffMember>(json);
  if (!parsed) {
    return { ok: false, message: failMessage(json, 'Invalid platform users response'), status: res.status };
  }
  return { ok: true, result: { items: parsed.items, meta: parsed.meta } };
}

export async function listAllPlatformUsers(maxPages = 50): Promise<
  { ok: true; items: SystemAdminStaffMember[] } | { ok: false; message: string; status: number }
> {
  const items: SystemAdminStaffMember[] = [];
  let page = 1;
  for (let i = 0; i < maxPages; i++) {
    const r = await listPlatformUsersPage({ page, limit: 100, sort: '-createdAt' });
    if (!r.ok) return r;
    items.push(...r.result.items);
    if (r.result.items.length === 0 || page >= r.result.meta.totalPages) break;
    page += 1;
  }
  return { ok: true, items };
}

export async function createStaff(
  body: CreateStaffBody,
): Promise<{ ok: true; data: SystemAdminStaffMember } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/staff`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<SystemAdminStaffMember>(res);
}

export async function patchStaff(
  id: string,
  body: PatchStaffBody,
): Promise<{ ok: true; data: SystemAdminStaffMember } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/staff/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<SystemAdminStaffMember>(res);
}

export async function getStaffPortalPassword(
  id: string,
): Promise<{ ok: true; password: string } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/staff/${encodeURIComponent(id)}/portal-password`, {
      headers: h.headers,
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const parsed = await parseSuccess<{ password: string }>(res);
  if (!parsed.ok) return parsed;
  return { ok: true, password: parsed.data.password };
}

export type ResetStaffPortalPasswordBody = { newPassword?: string };

/** Super Admin (`system_admin` JWT): issues a new bcrypt-hashed password; returns plaintext once. */
export async function resetStaffPortalPassword(
  id: string,
  body: ResetStaffPortalPasswordBody = {},
): Promise<{ ok: true; oneTimePassword: string } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/staff/${encodeURIComponent(id)}/reset-portal-password`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify(body.newPassword ? { newPassword: body.newPassword } : {}),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const parsed = await parseSuccess<{ oneTimePassword: string }>(res);
  if (!parsed.ok) return parsed;
  return { ok: true, oneTimePassword: parsed.data.oneTimePassword };
}

export async function getSettings(): Promise<
  { ok: true; data: PlatformSettingsDoc | null } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/settings`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<PlatformSettingsDoc | null>(res);
}

export async function triggerSystemAdminBackup(): Promise<
  { ok: true; data: { filename: string; url: string } } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/backup`, { method: 'POST', headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess(res);
}

export async function postSystemAdminAnnounce(body: {
  title: string;
  body: string;
  audience?: 'all' | 'public_only';
}): Promise<{ ok: true; data: { inserted: number } } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/announce`, {
      method: 'POST',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess(res);
}

export async function patchSettings(
  body: PatchSettingsBody,
): Promise<{ ok: true; data: PlatformSettingsDoc | null } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/settings`, {
      method: 'PATCH',
      headers: h.headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<PlatformSettingsDoc | null>(res);
}

export type ListNotificationsResult = { items: SystemAdminInboxNotification[]; meta: PaginatedMeta };

export async function listSystemAdminNotificationsPage(query: {
  page?: number;
  limit?: number;
}): Promise<{ ok: true; result: ListNotificationsResult } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  const q = new URLSearchParams();
  if (query.page) q.set('page', String(query.page));
  q.set('limit', String(query.limit ?? 30));
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/notifications?${q.toString()}`, { headers: h.headers });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const json = await readJson(res);
  const parsed = parsePaginated<SystemAdminInboxNotification>(json);
  if (!parsed) {
    return { ok: false, message: failMessage(json, 'Invalid notifications response'), status: res.status };
  }
  const items = parsed.items.map(normalizeInboxNotification);
  return { ok: true, result: { items, meta: parsed.meta } };
}

function normalizeInboxNotification(
  row: SystemAdminInboxNotification & { _id?: unknown },
): SystemAdminInboxNotification {
  const id = row.id ?? (row._id != null ? String(row._id) : '');
  return {
    ...row,
    id,
    readStatus: row.readStatus ?? 'unread',
  };
}

export async function markSystemAdminNotificationRead(
  id: string,
): Promise<{ ok: true; data: SystemAdminInboxNotification } | { ok: false; message: string; status: number }> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      headers: h.headers,
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  const r = await parseSuccess<SystemAdminInboxNotification>(res);
  if (!r.ok) return r;
  return { ok: true, data: normalizeInboxNotification(r.data) };
}

export async function markAllSystemAdminNotificationsRead(): Promise<
  { ok: true; data: { ok: boolean; broadcastMarked: number } } | { ok: false; message: string; status: number }
> {
  const h = await authHeaders();
  if ('error' in h) return { ok: false, message: h.error, status: 0 };
  let res: Response;
  try {
    res = await fetchWithJwtRefresh(`${h.base}${PREFIX}/notifications/read-all`, {
      method: 'PATCH',
      headers: h.headers,
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error', status: 0 };
  }
  return parseSuccess<{ ok: boolean; broadcastMarked: number }>(res);
}
