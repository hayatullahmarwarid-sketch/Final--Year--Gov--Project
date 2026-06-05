import type { AuditLogEntry, RoleTotals, StaffRole, StaffUser } from '@/data/system-admin-store';
import type { SystemAdminAuditLogRow, SystemAdminStaffMember } from '@/lib/api/system-admin';

const MASK = '••••••';

/** Machine / test slugs: rbac_*, long hex, long underscore slugs, synthetic service prefixes. */
const MACHINE_DISPLAY_RE = /^(rbac_|svc_|bot_|system_)|^[a-f0-9]{16,}$|^[a-z0-9_]{20,}$/i;

function emailLocalPart(email: string): string {
  return (email.split('@')[0] ?? '').trim().toLowerCase();
}

function humanizeEmailLocalPart(email: string): string {
  const local = email.split('@')[0]?.trim() ?? '';
  if (!local) return '';
  const words = local.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function displayNameMirrorsEmailLocal(raw: string, email: string): boolean {
  if (!raw || !email) return false;
  return raw.trim().toLowerCase() === emailLocalPart(email);
}

function staffIdSuffix(id: string): string {
  const hex = id.replace(/[^a-f0-9]/gi, '');
  const tail = hex.slice(-6) || id.slice(-6);
  return tail || '—';
}

/**
 * Prefer API displayName unless it looks like a machine-generated slug.
 */
export function resolveStaffDisplayName(row: SystemAdminStaffMember): string {
  const raw = (row.displayName ?? '').trim();
  const email = (row.email ?? '').trim();
  const phone = (row.phoneE164 ?? '').trim();

  const rawIsMachine = MACHINE_DISPLAY_RE.test(raw) || displayNameMirrorsEmailLocal(raw, email);

  if (raw.length >= 2 && !rawIsMachine) {
    return raw;
  }
  if (email) {
    const fromEmail = humanizeEmailLocalPart(email);
    if (fromEmail.length >= 2) return fromEmail;
  }
  if (phone) return phone;
  if (raw.length >= 1 && !MACHINE_DISPLAY_RE.test(raw)) return raw;
  return `Staff member · ${staffIdSuffix(row.id)}`;
}

export function apiRoleKeyToStaffRole(key: string | null | undefined): StaffRole {
  switch (key) {
    case 'system_admin':
      return 'super_admin';
    case 'decree_upload_department':
      return 'decree_dept';
    case 'inspector_admin':
      return 'inspector_admin';
    case 'inspector':
      return 'inspector';
    case 'public_user':
      return 'public_user';
    default:
      return 'inspector';
  }
}

export function staffRoleToApiRoleKey(role: StaffRole): string {
  switch (role) {
    case 'super_admin':
      return 'system_admin';
    case 'decree_dept':
      return 'decree_upload_department';
    case 'inspector_admin':
      return 'inspector_admin';
    case 'inspector':
      return 'inspector';
    case 'public_user':
      return 'public_user';
    default:
      return 'inspector';
  }
}

export function staffMemberToStaffUser(row: SystemAdminStaffMember): StaffUser {
  const email = row.email?.trim() ?? '';
  const phone = row.phoneE164?.trim() ?? '';
  const name = resolveStaffDisplayName(row);
  const username = email || phone || row.id;
  const status =
    row.status === 'active' || row.status === 'suspended' || row.status === 'pending' ? row.status : 'active';
  return {
    id: row.id,
    name,
    email,
    phoneE164: phone || null,
    username,
    portalPassword: MASK,
    role: apiRoleKeyToStaffRole(row.roleKey),
    status,
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

function auditCategoryLabel(actionKey: string | null | undefined, entityType: string | null | undefined): string {
  const k = (actionKey ?? '').toLowerCase();
  const et = (entityType ?? '').trim() || 'Audit';
  if (k === 'http.write' || et === 'HttpRequest') return 'HTTP';
  if (k.startsWith('user.') || k.startsWith('auth.')) return 'Auth';
  if (k.includes('staff') || k.includes('system-admin')) return 'Staff';
  if (k.startsWith('decree')) return 'Decrees';
  if (k.startsWith('exam')) return 'Exams';
  if (k.startsWith('inspection') || k.startsWith('inspector')) return 'Inspections';
  if (k.startsWith('file')) return 'Files';
  return et;
}

export function auditRowToEntry(row: SystemAdminAuditLogRow): AuditLogEntry | null {
  const id = row.id ?? `al-${row.occurredAt ?? Date.now()}`;
  const ts = row.occurredAt ?? row.createdAt ?? new Date().toISOString();
  const action = (row.displaySummary ?? row.summary ?? row.actionKey ?? '').trim() || 'event';
  const user = (row.actorLabel ?? row.actorRoleKey ?? row.actorType ?? 'System').trim() || 'System';
  const module = auditCategoryLabel(row.actionKey, row.entityType);
  const ip = row.ipAddress ?? '—';
  const key = (row.actionKey ?? '').toLowerCase();
  const isFail =
    /fail|error|denied|reject/i.test(key) ||
    /fail/i.test(action) ||
    (typeof row.httpStatus === 'number' && row.httpStatus >= 400);
  return {
    id,
    timestamp: ts,
    user,
    module,
    action,
    ip,
    status: isFail ? 'FAILURE' : 'SUCCESS',
    severity: isFail ? 'warning' : row.actorType === 'system' ? 'info' : 'success',
    actionKey: row.actionKey ?? undefined,
    integrityHash: row.integrityHash ?? null,
  };
}

export function roleBreakdownToTotals(rows: { roleKey: string; total: number }[] | undefined): RoleTotals {
  const out: RoleTotals = {
    superAdmin: 0,
    decreeDept: 0,
    inspectorAdmin: 0,
    inspector: 0,
    publicUser: 0,
  };
  if (!rows) return out;
  for (const r of rows) {
    switch (r.roleKey) {
      case 'system_admin':
        out.superAdmin += r.total;
        break;
      case 'decree_upload_department':
        out.decreeDept += r.total;
        break;
      case 'inspector_admin':
        out.inspectorAdmin += r.total;
        break;
      case 'inspector':
        out.inspector += r.total;
        break;
      case 'public_user':
        out.publicUser += r.total;
        break;
      default:
        break;
    }
  }
  return out;
}
