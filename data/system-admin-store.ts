import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { CATEGORIES } from '@/data/public-decrees-catalog';
import type { AuditActivityBucketRow } from '@/lib/api/system-admin';
import { syncAdminPortalsFromStaffUsers } from '@/services/admin-portal-auth';

const STORAGE_KEY = '@sharia_system_admin_v1';

export type LogSeverity = "success" | "info" | "warning" | "danger";
export type AuditStatus = "SUCCESS" | "FAILURE";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  module: string;
  action: string;
  ip: string;
  status: AuditStatus;
  severity: LogSeverity;
  /** Original API action key (e.g. `http.write`) for filtering. */
  actionKey?: string;
  /** Server-provided integrity HMAC when configured. */
  integrityHash?: string | null;
}

export interface Department {
  id: number;
  name: string;
  head: string;
  users: number;
  activity: number;
  status: "Active" | "Busy" | "Maintenance";
  uptimePct: number;
}

/** Five directory roles — Super Admin, Decree dept, Inspector Admin are single-slot (replace on add). */
export type StaffRole = "super_admin" | "decree_dept" | "inspector_admin" | "inspector" | "public_user";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  /** E.164 when the directory row is phone-first (API). */
  phoneE164?: string | null;
  /** Portal / admin sign-in username (API directory is source of truth for single-slot portals). */
  username: string;
  /** Placeholder mask when managed by identity service; not returned as plaintext from API. */
  portalPassword: string;
  role: StaffRole;
  status: "active" | "suspended" | "pending";
  createdAt: string;
}

export interface RoleTotals {
  superAdmin: number;
  decreeDept: number;
  inspectorAdmin: number;
  inspector: number;
  publicUser: number;
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

/** Snapshot from `GET /system-admin/system-summary` (+ dashboard) when JWT sync runs. */
export interface SystemAdminOverviewSnapshot {
  generatedAt: string | null;
  healthApi: string | null;
  healthDb: string | null;
  /** Derived from `health.status` when present (ok | warning | critical). */
  healthStatus: "ok" | "warning" | "critical" | null;
  /** Short human summary (uptime, DB latency, HTTP error rate). */
  healthSummary: string | null;
  publishedDecreeCount: number | null;
  auditEvents24h: number | null;
  auditSecurityEvents24h: number | null;
  /** Server-reported platform user total when available. */
  totalUsersCount: number | null;
  /** New registrations: last 7d vs previous 7d (% change). */
  totalUsersTrendPct7d: number | null;
  /** Security events: last 24h vs previous 24h (% change). */
  securityEventsTrendPct24h: number | null;
  /** Raw 24h buckets from `GET /system-admin/system-summary` (mapped to chart in UI). */
  auditActivityBuckets: AuditActivityBucketRow[] | null;
  /** Structured health metrics from API (avoid cramming into one subtitle string). */
  healthUptimeSeconds: number | null;
  healthDatabaseLatencyMs: number | null;
  healthHttpErrorRatePct: number | null;
}

export interface SystemAdminState {
  staffUsers: StaffUser[];
  departments: Department[];
  auditLogs: AuditLogEntry[];
  roleTotals: RoleTotals;
  notifications: AdminNotification[];
  serverNode: string;
  appVersion: string;
  overview: SystemAdminOverviewSnapshot;
  /** When true, notifications list was loaded from API for this session. */
  notificationsFromRemote: boolean;
}

export function totalDecreesInCatalog(): number {
  return CATEGORIES.reduce((n, c) => n + c.decrees.length, 0);
}

/** Audit log seed — intentionally empty. Real rows come from `GET /api/v1/system-admin/audit-logs`. */
function seedAuditLogs(): AuditLogEntry[] {
  return [];
}

export function computeRoleTotals(staffUsers: StaffUser[]): RoleTotals {
  const counts: RoleTotals = {
    superAdmin: 0,
    decreeDept: 0,
    inspectorAdmin: 0,
    inspector: 0,
    publicUser: 0,
  };
  for (const u of staffUsers) {
    switch (u.role) {
      case "super_admin":
        counts.superAdmin += 1;
        break;
      case "decree_dept":
        counts.decreeDept += 1;
        break;
      case "inspector_admin":
        counts.inspectorAdmin += 1;
        break;
      case "inspector":
        counts.inspector += 1;
        break;
      case "public_user":
        counts.publicUser += 1;
        break;
      default:
        break;
    }
  }
  return counts;
}

/**
 * Seed state for the system-admin store — all list data starts empty. Real data is hydrated
 * from the API by `contexts/system-admin-remote-context.tsx` and `lib/api/system-admin.ts`.
 *
 * Empty arrays here mean: screens show their empty state until the JWT sync loads real data.
 */
function seedState(): SystemAdminState {
  const staffUsers: StaffUser[] = [];
  return {
    staffUsers,
    departments: [],
    auditLogs: seedAuditLogs(),
    roleTotals: computeRoleTotals(staffUsers),
    notifications: [],
    serverNode: "CA-ONLINE-01",
    appVersion: "1.4.2",
    overview: {
      generatedAt: null,
      healthApi: null,
      healthDb: null,
      healthStatus: null,
      healthSummary: null,
      publishedDecreeCount: null,
      auditEvents24h: null,
      auditSecurityEvents24h: null,
      totalUsersCount: null,
      totalUsersTrendPct7d: null,
      securityEventsTrendPct24h: null,
      auditActivityBuckets: null,
      healthUptimeSeconds: null,
      healthDatabaseLatencyMs: null,
      healthHttpErrorRatePct: null,
    },
    notificationsFromRemote: false,
  };
}

const SINGLE_SLOT_ROLES: StaffRole[] = ["super_admin", "decree_dept", "inspector_admin"];

/** Normalize role strings from storage, exports, or hand-edited JSON (spaces / title case → internal enum). */
function canonicalStaffRoleKey(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function mapLegacyRole(raw: unknown): StaffRole {
  const key = canonicalStaffRoleKey(raw);

  if (key === "dept_admin") return "decree_dept";
  if (key === "system_auditor") return "inspector";

  if (
    key === "super_admin" ||
    key === "decree_dept" ||
    key === "inspector_admin" ||
    key === "inspector" ||
    key === "public_user"
  ) {
    return key;
  }

  // Human-readable labels or older variants → internal roles
  if (key === "superadmin" || key === "super_administrator") return "super_admin";
  if (
    key === "decree_upload_department" ||
    key === "decree_upload_dept" ||
    key === "decree_department" ||
    key === "decreeupload"
  ) {
    return "decree_dept";
  }
  if (key === "inspectoradmin" || key === "inspector_administrator") return "inspector_admin";
  if (key === "public_users" || key === "publicuser" || key === "end_user") return "public_user";

  return "inspector";
}

function dedupeSingleSlotStaff(staff: StaffUser[]): StaffUser[] {
  const kept = new Set<StaffRole>();
  const out: StaffUser[] = [];
  for (const u of staff) {
    if (SINGLE_SLOT_ROLES.includes(u.role)) {
      if (kept.has(u.role)) continue;
      kept.add(u.role);
    }
    out.push(u);
  }
  return out;
}

function migrateStaffRow(raw: Record<string, unknown>, idx: number): StaffUser {
  const id = typeof raw.id === "string" ? raw.id : `su-mig-${idx}`;
  const name = typeof raw.name === "string" ? raw.name : "User";
  const email = typeof raw.email === "string" ? raw.email : "";
  const role = mapLegacyRole(raw.role);
  const status =
    raw.status === "active" || raw.status === "suspended" || raw.status === "pending" ? raw.status : "active";
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString();
  let username = typeof raw.username === "string" ? raw.username.trim().toLowerCase() : "";
  if (!username) {
    const local = email.split("@")[0] || "user";
    username = `${local.replace(/[^a-z0-9._-]/gi, "") || "user"}${idx}`;
  }
  let portalPassword =
    typeof raw.portalPassword === "string" && raw.portalPassword.length > 0 ? raw.portalPassword : "123456";
  if (portalPassword === "changeme") {
    portalPassword = "123456";
  }
  const phoneE164 =
    typeof raw.phoneE164 === "string" && raw.phoneE164.trim() ? raw.phoneE164.trim() : null;
  return { id, name, email, phoneE164, username, portalPassword, role, status, createdAt };
}

function normalizeLoaded(p: Partial<SystemAdminState>): SystemAdminState {
  const fresh = seedState();
  if (!p || !Array.isArray(p.staffUsers)) {
    return fresh;
  }
  let staffUsers = (p.staffUsers as unknown as Record<string, unknown>[]).map(migrateStaffRow);
  staffUsers = dedupeSingleSlotStaff(staffUsers);
  const roleTotals = computeRoleTotals(staffUsers);
  return {
    ...fresh,
    ...p,
    staffUsers,
    roleTotals,
    departments: Array.isArray(p.departments) ? (p.departments as Department[]) : fresh.departments,
    auditLogs: Array.isArray(p.auditLogs) ? (p.auditLogs as AuditLogEntry[]) : fresh.auditLogs,
    notifications: Array.isArray(p.notifications) ? (p.notifications as AdminNotification[]) : fresh.notifications,
    serverNode: typeof p.serverNode === "string" ? p.serverNode : fresh.serverNode,
    appVersion: typeof p.appVersion === "string" ? p.appVersion : fresh.appVersion,
    overview: { ...fresh.overview, ...(p as Partial<SystemAdminState>).overview },
    notificationsFromRemote:
      typeof (p as Partial<SystemAdminState>).notificationsFromRemote === "boolean"
        ? (p as Partial<SystemAdminState>).notificationsFromRemote!
        : fresh.notificationsFromRemote,
  };
}

let state: SystemAdminState = seedState();
const listeners = new Set<() => void>();
let hydrateStarted = false;

function notifyListeners() {
  listeners.forEach((l) => l());
}

async function hydrateFromDisk() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<SystemAdminState>;
      const normalized = normalizeLoaded(p);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)).catch(() => {});
      await syncAdminPortalsFromStaffUsers(
        normalized.staffUsers.map((u) => ({
          role: u.role,
          username: u.username,
          portalPassword: u.portalPassword,
        })),
      );
      state = normalized;
    } else {
      const s = seedState();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s)).catch(() => {});
      await syncAdminPortalsFromStaffUsers(
        s.staffUsers.map((u) => ({
          role: u.role,
          username: u.username,
          portalPassword: u.portalPassword,
        })),
      );
      state = s;
    }
  } catch {
    state = seedState();
  } finally {
    notifyListeners();
  }
}

function persist(next: SystemAdminState) {
  const roleTotals = computeRoleTotals(next.staffUsers);
  state = { ...next, roleTotals };
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  void syncAdminPortalsFromStaffUsers(
    state.staffUsers.map((u) => ({
      role: u.role,
      username: u.username,
      portalPassword: u.portalPassword,
    })),
  );
  notifyListeners();
}

export function subscribeSystemAdmin(listener: () => void) {
  if (!hydrateStarted) {
    hydrateStarted = true;
    void hydrateFromDisk();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSystemAdminState(): SystemAdminState {
  return state;
}

export function useSystemAdminStore(): SystemAdminState {
  return useSyncExternalStore(subscribeSystemAdmin, getSystemAdminState, getSystemAdminState);
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function formatHeaderDate(d = new Date()): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function appendNotification(title: string, body: string) {
  const n: AdminNotification = {
    id: `n-${Date.now()}`,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
  };
  return [n, ...state.notifications].slice(0, 50);
}

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]*$/i;

function generateLocalTempPassword(): string {
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%";
  const pool = lowercase + uppercase + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]!;
  for (let n = 0; n < 32; n += 1) {
    const parts = [pick(lowercase), pick(uppercase), pick(digits), pick(symbols)];
    for (let i = parts.length; i < 14; i += 1) {
      parts.push(pool[Math.floor(Math.random() * pool.length)]!);
    }
    for (let i = parts.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = parts[i]!;
      parts[i] = parts[j]!;
      parts[j] = t;
    }
    const candidate = parts.join("");
    if (
      candidate.length >= 8 &&
      /[a-z]/.test(candidate) &&
      /[A-Z]/.test(candidate) &&
      /\d/.test(candidate) &&
      /[^A-Za-z0-9]/.test(candidate)
    ) {
      return candidate;
    }
  }
  return "Aa1!aaaaaa";
}

export const systemAdminActions = {
  addStaffUser(input: {
    name: string;
    email: string;
    role: StaffRole;
    username: string;
    portalPassword: string;
  }) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    const portalPassword = input.portalPassword;

    if (input.role === "public_user") {
      return {
        ok: false as const,
        error: "Public users cannot be added from the staff directory. Use public registration.",
      };
    }
    if (name.length < 2) {
      return { ok: false as const, error: "Enter a full name." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false as const, error: "Enter a valid email." };
    }
    if (username.length < 2) {
      return { ok: false as const, error: "Username must be at least 2 characters." };
    }
    if (!USERNAME_RE.test(username)) {
      return {
        ok: false as const,
        error: "Username must start with a letter or number; only letters, numbers, dots, underscores, and hyphens are allowed.",
      };
    }
    if (portalPassword.length < 6) {
      return { ok: false as const, error: "Password must be at least 6 characters." };
    }

    let nextStaff = [...state.staffUsers];
    if (SINGLE_SLOT_ROLES.includes(input.role)) {
      nextStaff = nextStaff.filter((u) => u.role !== input.role);
    }
    if (nextStaff.some((x) => x.username === username)) {
      return { ok: false as const, error: "That username is already used in this directory." };
    }

    const id = `su-${Date.now()}`;
    const entry: StaffUser = {
      id,
      name,
      email,
      username,
      portalPassword,
      role: input.role,
      status: SINGLE_SLOT_ROLES.includes(input.role) ? "active" : "active",
      createdAt: new Date().toISOString(),
    };

    const staffUsers = [entry, ...nextStaff];
    const roleTotals = computeRoleTotals(staffUsers);
    const audit: AuditLogEntry = {
      id: `al-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: state.staffUsers.find((s) => s.role === "super_admin")?.name ?? "System Admin",
      module: "Directory",
      action: SINGLE_SLOT_ROLES.includes(input.role)
        ? `Provisioned ${input.role.replace(/_/g, " ")} (${entry.username}) — previous account replaced`
        : `Added directory user ${entry.email} (${input.role})`,
      ip: "127.0.0.1",
      status: "SUCCESS",
      severity: "success",
    };
    persist({
      ...state,
      staffUsers,
      roleTotals,
      auditLogs: [audit, ...state.auditLogs],
      notifications: appendNotification(
        SINGLE_SLOT_ROLES.includes(input.role) ? "Portal account updated" : "User added",
        `${entry.name} · ${entry.username}`,
      ),
    });
    syncAdminPortalsFromStaffUsers(
      staffUsers.map((u) => ({
        role: u.role,
        username: u.username,
        portalPassword: u.portalPassword,
      })),
    );
    return { ok: true as const };
  },

  resetStaffLocalPassword(staffId: string) {
    const u = state.staffUsers.find((x) => x.id === staffId);
    if (!u) {
      return { ok: false as const, error: "User not found." };
    }
    if (u.role === "public_user") {
      return {
        ok: false as const,
        error: "Public account passwords are not managed from the staff directory.",
      };
    }
    const password = generateLocalTempPassword();
    const staffUsers = state.staffUsers.map((row) =>
      row.id === staffId ? { ...row, portalPassword: password } : row,
    );
    persist({
      ...state,
      staffUsers,
      notifications: appendNotification("Portal password reset", `${u.name} · ${u.username}`),
    });
    return { ok: true as const, password };
  },

  updateDepartment(id: number, patch: Partial<Omit<Department, "id">>) {
    const departments = state.departments.map((d) => (d.id === id ? { ...d, ...patch } : d));
    const dept = departments.find((d) => d.id === id);
    const audit: AuditLogEntry = {
      id: `al-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: state.staffUsers.find((s) => s.role === "super_admin")?.name ?? "System Admin",
      module: "Departments",
      action: `Updated department ${dept?.name ?? id}`,
      ip: "127.0.0.1",
      status: "SUCCESS",
      severity: "info",
    };
    persist({
      ...state,
      departments,
      auditLogs: [audit, ...state.auditLogs],
    });
  },

  markNotificationRead(id: string) {
    persist({
      ...state,
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    });
  },

  markAllNotificationsRead() {
    persist({
      ...state,
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    });
  },

  rotateServerNode() {
    const nodes = ["CA-ONLINE-01", "CA-ONLINE-02", "KBL-EDGE-A", "HER-DR-01"];
    const next = nodes[Math.floor(Math.random() * nodes.length)];
    persist({ ...state, serverNode: next });
  },

  setStaffStatus(id: string, status: StaffUser["status"]) {
    persist({
      ...state,
      staffUsers: state.staffUsers.map((u) => (u.id === id ? { ...u, status } : u)),
    });
  },

  /** Replace directory + audit trail from API hydration (keeps notifications & departments unless overridden). */
  hydrateRemoteDirectory(payload: {
    staffUsers?: StaffUser[];
    auditLogs?: AuditLogEntry[];
    roleTotals?: RoleTotals;
    serverNode?: string;
    appVersion?: string;
    overview?: Partial<SystemAdminOverviewSnapshot>;
    notifications?: AdminNotification[];
    notificationsFromRemote?: boolean;
  }) {
    const staffUsers = payload.staffUsers ?? state.staffUsers;
    const auditLogs = payload.auditLogs ?? state.auditLogs;
    const roleTotals = payload.roleTotals ?? computeRoleTotals(staffUsers);
    const overview =
      payload.overview !== undefined ? { ...state.overview, ...payload.overview } : state.overview;
    const notifications = payload.notifications ?? state.notifications;
    const notificationsFromRemote =
      payload.notificationsFromRemote ?? state.notificationsFromRemote;
    persist({
      ...state,
      staffUsers,
      auditLogs,
      roleTotals,
      serverNode: payload.serverNode ?? state.serverNode,
      appVersion: payload.appVersion ?? state.appVersion,
      overview,
      notifications,
      notificationsFromRemote,
    });
  },

  upsertStaffMember(entry: StaffUser) {
    const staffUsers = [entry, ...state.staffUsers.filter((u) => u.id !== entry.id)];
    persist({ ...state, staffUsers, roleTotals: computeRoleTotals(staffUsers) });
  },
};

/** One chart point: aligns with server `aggregateActivityBucketsLast24h7` (7 equal windows). */
export type ActivityPoint = {
  time: string;
  requests: number;
  logins: number;
  bucketIndex: number;
  windowStartMs: number;
  windowEndMs: number;
};

export type ActivityPointDetail = {
  windowLabel: string;
  totalActions: number;
  loginActions: number;
  topTypes: { label: string; count: number }[];
};

/** Build chart points from `GET /system-admin/system-summary` `auditActivityBuckets`. */
export function buildActivitySeriesFromApiBuckets(
  buckets: AuditActivityBucketRow[] | null | undefined,
): ActivityPoint[] | null {
  if (!buckets?.length) return null;
  const byBucket = new Map<number, AuditActivityBucketRow>();
  for (const row of buckets) {
    byBucket.set(row.bucket, row);
  }
  const nowMs = Date.now();
  const sinceMs = nowMs - 24 * 3600_000;
  const spanMs = 24 * 3600_000;
  const bucketMs = spanMs / 7;
  const out: ActivityPoint[] = [];
  for (let b = 0; b < 7; b++) {
    const row = byBucket.get(b);
    const requests = row?.requests ?? 0;
    const logins = row?.logins ?? 0;
    const windowStartMs = sinceMs + b * bucketMs;
    const windowEndMs = b === 6 ? nowMs : sinceMs + (b + 1) * bucketMs;
    const label =
      b === 6
        ? "Now"
        : new Date(windowStartMs).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    out.push({ time: label, requests, logins, bucketIndex: b, windowStartMs, windowEndMs });
  }
  return out;
}

/** Seven buckets over the last 24h from audit rows (same grid as API aggregation). */
export function buildHourlyActivityFromLogs(logs: AuditLogEntry[]): ActivityPoint[] {
  const nowMs = Date.now();
  const sinceMs = nowMs - 24 * 3600_000;
  const spanMs = 24 * 3600_000;
  const bucketMs = spanMs / 7;
  const loginRe = /login|sign|session|mfa|otp|auth\.|refresh/i;
  const result: ActivityPoint[] = [];
  for (let b = 0; b < 7; b++) {
    const windowStartMs = sinceMs + b * bucketMs;
    const windowEndMs = b === 6 ? nowMs : sinceMs + (b + 1) * bucketMs;
    const slice = logs.filter((l) => {
      const t = new Date(l.timestamp).getTime();
      return t >= windowStartMs && t < windowEndMs;
    });
    const logins = slice.filter((l) => {
      const k = (l.actionKey ?? "").toLowerCase();
      return loginRe.test(k) || loginRe.test(l.action);
    }).length;
    const label =
      b === 6
        ? "Now"
        : new Date(windowStartMs).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    result.push({ time: label, requests: slice.length, logins, bucketIndex: b, windowStartMs, windowEndMs });
  }
  return result;
}

/** Per-bucket breakdown from live audit logs (for tooltips). */
export function buildActivityPointDetail(logs: AuditLogEntry[], point: ActivityPoint): ActivityPointDetail {
  const slice = logs.filter((l) => {
    const t = new Date(l.timestamp).getTime();
    return t >= point.windowStartMs && t < point.windowEndMs;
  });
  const loginRe = /login|sign|session|mfa|otp|auth\.|refresh/i;
  const loginActions = slice.filter((l) => {
    const k = (l.actionKey ?? "").toLowerCase();
    return loginRe.test(k) || loginRe.test(l.action);
  }).length;
  const counts = new Map<string, number>();
  for (const l of slice) {
    const key = (l.actionKey?.trim() || l.action || "event").slice(0, 56);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const topTypes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
  const startStr = new Date(point.windowStartMs).toLocaleString();
  const endStr = new Date(point.windowEndMs).toLocaleString();
  return {
    windowLabel: `${startStr} – ${endStr}`,
    totalActions: slice.length,
    loginActions,
    topTypes,
  };
}

export function computeTrendFromActivity(activity: { requests: number }[]): { label: string; up: boolean } {
  if (activity.length < 2) return { label: "—", up: true };
  const mid = Math.floor(activity.length / 2);
  const a = activity.slice(0, mid).reduce((s, x) => s + x.requests, 0);
  const b = activity.slice(mid).reduce((s, x) => s + x.requests, 0);
  if (a === 0) return { label: b > 0 ? "+100%" : "0%", up: b >= 0 };
  const pct = Math.round(((b - a) / a) * 100);
  return { label: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

export function computeSystemHealthPct(logs: AuditLogEntry[]): { value: string; trendLabel: string; trendUp: boolean } {
  const hourAgo = Date.now() - 3600_000;
  const recent = logs.filter((l) => new Date(l.timestamp).getTime() >= hourAgo);
  if (recent.length === 0) return { value: "—", trendLabel: "", trendUp: false };
  const fails = recent.filter((l) => l.status === "FAILURE").length;
  const ok = recent.length - fails;
  const pct = Math.max(0, Math.min(100, (ok / recent.length) * 100));
  return {
    value: `${pct.toFixed(1)}%`,
    trendLabel: fails === 0 ? "Stable" : `${fails} failure${fails === 1 ? "" : "s"} (last hour)`,
    trendUp: fails === 0,
  };
}

/** Prefer API health when the overview snapshot was hydrated from the server. */
export function computeSystemHealthFromOverview(
  overview: SystemAdminOverviewSnapshot,
  apiConnected: boolean,
): { value: string; trendLabel: string; trendUp: boolean } {
  if (!apiConnected) {
    return { value: "—", trendLabel: "", trendUp: false };
  }
  const hs = overview.healthStatus;
  if (hs === "critical") {
    return { value: "Critical", trendLabel: "", trendUp: false };
  }
  if (hs === "warning") {
    return { value: "Warning", trendLabel: "", trendUp: false };
  }
  if (hs === "ok") {
    return { value: "OK", trendLabel: "", trendUp: true };
  }
  const apiOk = overview.healthApi === "ok";
  const dbOk = overview.healthDb === "ok";
  if (apiOk && dbOk) {
    return { value: "OK", trendLabel: "", trendUp: true };
  }
  if (apiOk || dbOk) {
    return { value: "Partial", trendLabel: "", trendUp: false };
  }
  return { value: "Check", trendLabel: "", trendUp: false };
}

/** i18n key for the health stat subtitle (short status — metrics use separate chips). */
export function systemAdminHealthTrendKey(
  overview: SystemAdminOverviewSnapshot,
  apiConnected: boolean,
): string {
  if (!apiConnected) return "systemAdminHealthTrendApiOffline";
  const hs = overview.healthStatus;
  if (hs === "critical") return "systemAdminHealthTrendCritical";
  if (hs === "warning") return "systemAdminHealthTrendWarning";
  if (hs === "ok") return "systemAdminHealthTrendOk";
  const apiOk = overview.healthApi === "ok";
  const dbOk = overview.healthDb === "ok";
  if (apiOk && dbOk) return "systemAdminHealthTrendOk";
  if (apiOk || dbOk) return "systemAdminHealthTrendPartial";
  return "systemAdminHealthTrendUnknown";
}

export function formatSignedPercent(pct: number | null | undefined): { label: string; up: boolean } {
  if (pct == null || Number.isNaN(pct)) return { label: "—", up: true };
  return { label: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

export function computeActiveSessions(logs: AuditLogEntry[], staffActive: number): number {
  const hourAgo = Date.now() - 3600_000;
  const pulse = logs.filter((l) => new Date(l.timestamp).getTime() >= hourAgo).length;
  if (!pulse && !staffActive) return 0;
  // Derive an approximate "active sessions" value only from real signals.
  // When there is no activity, return 0 rather than a demo baseline.
  return Math.min(99999, Math.round(staffActive + pulse));
}

export function roleRowsForChart(totals: RoleTotals) {
  return [
    { role: "Super Admin", count: totals.superAdmin, permissions: "All Access", color: "bg-red-500", bar: "bg-red-600" },
    {
      role: "Decree Upload Department",
      count: totals.decreeDept,
      permissions: "Decree portal",
      color: "bg-blue-500",
      bar: "bg-blue-600",
    },
    {
      role: "Inspector Admin",
      count: totals.inspectorAdmin,
      permissions: "Inspector portal",
      color: "bg-amber-500",
      bar: "bg-amber-600",
    },
    {
      role: "Inspectors",
      count: totals.inspector,
      permissions: "Field",
      color: "bg-[#316FF6]",
      bar: "bg-[#0088FF]",
    },
    {
      role: "Public users",
      count: totals.publicUser,
      permissions: "Self-service",
      color: "bg-gray-400",
      bar: "bg-gray-600",
    },
  ];
}

export function staffRoleLabel(r: StaffRole): string {
  switch (r) {
    case "super_admin":
      return "Super Admin";
    case "decree_dept":
      return "Decree Upload Department";
    case "inspector_admin":
      return "Inspector Admin";
    case "inspector":
      return "Inspectors";
    case "public_user":
      return "Public users";
    default:
      return r;
  }
}

export function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function auditLogsToCsv(rows: AuditLogEntry[]): string {
  const header = ["timestamp", "actionKey", "user", "module", "action", "ip", "status"];
  const lines = rows.map((r) =>
    [
      r.timestamp,
      r.actionKey ?? "",
      r.user,
      r.module,
      r.action.replace(/"/g, '""'),
      r.ip,
      r.status,
    ].map((c) => `"${String(c)}"`).join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
