import fs from 'node:fs/promises';
import path from 'node:path';
import { randomInt } from 'node:crypto';
import mongoose from 'mongoose';
import { UserModel } from '../../../database/models/user.model.js';
import { NotificationModel } from '../../../database/models/notification.model.js';
import { userRepository } from '../../../database/repositories/user.repository.js';
import { auditLogRepository } from '../../../database/repositories/audit-log.repository.js';
import { decreeRepository } from '../../../database/repositories/decree.repository.js';
import { systemPlatformSettingsRepository } from '../../../database/repositories/system-platform-settings.repository.js';
import { roleRepository } from '../../../database/repositories/role.repository.js';
import { notificationRepository } from '../../../database/repositories/notification.repository.js';
import { notificationUserStateRepository } from '../../../database/repositories/notification-user-state.repository.js';
import { toOffsetLimit } from '../shared/query/pagination.js';
import { hashPassword, revokeAllUserTokens } from '../../lib/auth.js';
import { NotFoundError, BadRequestError } from '../shared/http/index.js';
import { serializeInboxNotification } from '../notifications/notification.serializer.js';
import { RoleKey, ROLE_KEYS } from '../shared/enums/roles.js';
import {
  strongPasswordSchema,
  isPasswordAcceptableAgainstEmail,
} from '../shared/validation/password.schema.js';
import { STAFF_DIRECTORY_ROLE_KEYS, STAFF_DIRECTORY_ROLE_KEY_SET } from './system-admin.constants.js';
import { serializeStaffMember } from './serializers/staff.serializer.js';
import { serializeAuditLog } from './serializers/audit-log.serializer.js';
import { serializePlatformSettings } from './serializers/platform-settings.serializer.js';
import {
  serializeSystemAdminDashboard,
  serializeSystemSummary,
} from './serializers/system-admin-dashboard.serializer.js';
import { getEnv } from '../../config/env.js';
import { auditService } from '../../services/audit/auditService.js';
import { enqueue } from '../../jobs/queue-registry.js';
import { QUEUE } from '../../jobs/queue-names.js';

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isPlainObject(v) {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

/**
 * @param {unknown} base
 * @param {unknown} patch
 */
function shallowMergeRecord(base, patch) {
  if (!patch) return isPlainObject(base) ? /** @type {Record<string, unknown>} */ (base) : {};
  const a = isPlainObject(base) ? /** @type {Record<string, unknown>} */ (base) : {};
  return { ...a, .../** @type {Record<string, unknown>} */ (patch) };
}

/**
 * @param {number} current
 * @param {number} previous
 */
function pctChangeRounded(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Random password satisfying `strongPasswordSchema` (for admin-issued temporary credentials).
 * @returns {string}
 */
function generateCompliantTempPassword() {
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%^&*-_+=';
  const pool = lowercase + uppercase + digits + symbols;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const chars = [];
    chars.push(lowercase[randomInt(lowercase.length)]);
    chars.push(uppercase[randomInt(uppercase.length)]);
    chars.push(digits[randomInt(digits.length)]);
    chars.push(symbols[randomInt(symbols.length)]);
    const len = 20;
    for (let i = chars.length; i < len; i += 1) {
      chars.push(pool[randomInt(pool.length)]);
    }
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      const t = chars[i];
      chars[i] = chars[j];
      chars[j] = t;
    }
    const candidate = chars.join('');
    const parsed = strongPasswordSchema.safeParse(candidate);
    if (parsed.success) return candidate;
  }
  throw new BadRequestError('Could not generate a temporary password; retry or set newPassword explicitly');
}

/**
 * @param {import('mongoose').Connection} conn
 */
async function measureDatabasePingMs(conn) {
  const t0 = Date.now();
  await conn.db.admin().command({ ping: 1 });
  return Date.now() - t0;
}

/**
 * @param {Record<string, unknown>} current
 * @param {import('zod').infer<typeof import('./system-admin.validation.js').patchSystemAdminSettingsBodySchema>} patch
 */
function mergePlatformSettings(current, patch) {
  const maintenance = isPlainObject(current.maintenance) ? current.maintenance : {};
  const nextMaintenancePatch = patch.maintenance;

  return {
    ...current,
    portal: shallowMergeRecord(current.portal, patch.portal),
    security: shallowMergeRecord(current.security, patch.security),
    integrations: shallowMergeRecord(current.integrations, patch.integrations),
    features: shallowMergeRecord(current.features, patch.features),
    extensions: shallowMergeRecord(current.extensions, patch.extensions),
    maintenance: {
      ...maintenance,
      ...(nextMaintenancePatch ?? {}),
      flags: shallowMergeRecord(maintenance.flags, nextMaintenancePatch?.flags),
    },
    schemaVersion: patch.schemaVersion ?? current.schemaVersion,
    docKey: current.docKey ?? 'global',
  };
}

export class SystemAdminService {
  /**
   * @param {{
   *   users?: import('../../../database/repositories/user.repository.js').UserRepository,
   *   auditLogs?: import('../../../database/repositories/audit-log.repository.js').AuditLogRepository,
   *   decrees?: import('../../../database/repositories/decree.repository.js').DecreeRepository,
   *   platformSettings?: import('../../../database/repositories/system-platform-settings.repository.js').SystemPlatformSettingsRepository,
   *   roles?: import('../../../database/repositories/role.repository.js').RoleRepository,
   *   notifications?: import('../../../database/repositories/notification.repository.js').NotificationRepository,
   *   notificationUserStates?: import('../../../database/repositories/notification-user-state.repository.js').NotificationUserStateRepository,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.users = deps.users ?? userRepository;
    this.auditLogs = deps.auditLogs ?? auditLogRepository;
    this.decrees = deps.decrees ?? decreeRepository;
    this.platformSettings = deps.platformSettings ?? systemPlatformSettingsRepository;
    this.roles = deps.roles ?? roleRepository;
    this.notifications = deps.notifications ?? notificationRepository;
    this.notificationUserStates = deps.notificationUserStates ?? notificationUserStateRepository;
  }

  /**
   * @param {Record<string, unknown> | null | undefined} user
   */
  assertStaffDirectoryMember(user) {
    if (!user) throw new NotFoundError('Staff member not found');
    if (user.isDeleted) throw new NotFoundError('Staff member not found');
    if (!STAFF_DIRECTORY_ROLE_KEY_SET.has(String(user.roleKey))) {
      throw new NotFoundError('Staff member not found');
    }
  }

  /**
   * @param {string} roleKey
   */
  async resolveRoleIdForKey(roleKey) {
    const role = await this.roles.findOne({ key: roleKey });
    if (!role?._id) return null;
    return new mongoose.Types.ObjectId(String(role._id));
  }

  /**
   * @param {import('zod').infer<typeof import('./system-admin.validation.js').listStaffQuerySchema>} query
   */
  async listStaff(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.users.findStaffPage({
      skip,
      limit,
      roleKeysIn: [...STAFF_DIRECTORY_ROLE_KEYS],
      roleKey: query.roleKey,
      status: query.status,
      sort: query.sort,
      search: query.search,
      from: query.from,
      to: query.to,
    });

    return {
      items: items.map((u) => serializeStaffMember(u)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * All platform accounts (every `roleKey`), including public users — for system admin roster.
   *
   * @param {import('zod').infer<typeof import('./system-admin.validation.js').listPlatformUsersQuerySchema>} query
   */
  async listPlatformUsers(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.users.findStaffPage({
      skip,
      limit,
      roleKeysIn: query.roleKey ? undefined : [...ROLE_KEYS],
      roleKey: query.roleKey,
      status: query.status,
      sort: query.sort,
      search: query.search,
      from: query.from,
      to: query.to,
    });

    return {
      items: items.map((u) => serializeStaffMember(u)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {import('zod').infer<typeof import('./system-admin.validation.js').createStaffBodySchema>} body
   */
  async createStaff(body) {
    if (body.roleKey === RoleKey.PUBLIC_USER) {
      throw new BadRequestError('Public users cannot be created through the staff directory');
    }
    const roleId = await this.resolveRoleIdForKey(body.roleKey);
    const hasInitialPassword = Boolean(body.initialPassword);
    const passwordHash = hasInitialPassword ? await hashPassword(body.initialPassword) : null;
    const status = hasInitialPassword ? 'active' : body.status;
    const profile = body.profile !== undefined && isPlainObject(body.profile) ? body.profile : undefined;
    const created = await this.users.create({
      displayName: body.displayName,
      email: body.email ?? null,
      phoneE164: body.phoneE164 ?? null,
      preferredLocale: body.preferredLocale,
      roleKey: body.roleKey,
      roleId,
      status,
      profile,
      passwordHash,
      authProvider: hasInitialPassword ? 'password' : null,
    });
    return serializeStaffMember(created);
  }

  /**
   * @param {string} id
   */
  async getStaffById(id) {
    const user = await this.users.findByIdLean(id);
    this.assertStaffDirectoryMember(user);
    return serializeStaffMember(user);
  }

  /**
   * Super Admin-only: reveal stored staff portal password (if available).
   * Note: This returns `profile.portalPassword` when the account was provisioned with `initialPassword`.
   *
   * @param {string} id
   */
  async getStaffPortalPassword(id) {
    const user = await this.users.findByIdLean(id);
    this.assertStaffDirectoryMember(user);
    const profile = user.profile;
    const pw = isPlainObject(profile) ? profile.portalPassword : null;
    if (typeof pw !== 'string' || pw.trim().length === 0) {
      throw new NotFoundError('Password is not available for this account');
    }
    return { password: pw };
  }

  /**
   * Super Admin (JWT `system_admin`): set a new bcrypt portal password for internal staff only.
   * Returns a one-time plain password; never exposes existing hashes. Revokes the target user's refresh tokens.
   *
   * @param {string} id
   * @param {import('zod').infer<typeof import('./system-admin.validation.js').resetStaffPortalPasswordBodySchema>} body
   */
  async resetStaffPortalPassword(id, body) {
    const user = await this.users.findByIdLean(id);
    this.assertStaffDirectoryMember(user);
    if (String(user.roleKey) === RoleKey.PUBLIC_USER) {
      throw new BadRequestError('Password reset is not available for public user accounts');
    }
    const plain =
      typeof body.newPassword === 'string' && body.newPassword.trim().length > 0
        ? body.newPassword.trim()
        : generateCompliantTempPassword();
    const parsed = strongPasswordSchema.safeParse(plain);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ') || 'Invalid password';
      throw new BadRequestError(msg);
    }
    if (!isPasswordAcceptableAgainstEmail(plain, user.email)) {
      throw new BadRequestError('Password must not match the email local-part');
    }
    const passwordHash = await hashPassword(plain);
    const prev = isPlainObject(user.profile) ? { .../** @type {Record<string, unknown>} */ (user.profile) } : {};
    if ('portalPassword' in prev) delete prev.portalPassword;
    /** @type {Record<string, unknown>} */
    const $set = {
      passwordHash,
      authProvider: 'password',
      profile: Object.keys(prev).length ? prev : {},
    };
    if (user.status === 'pending') {
      $set.status = 'active';
    }
    await this.users.updateByIdLean(id, $set);
    await revokeAllUserTokens(String(id));
    return { oneTimePassword: plain };
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./system-admin.validation.js').patchStaffBodySchema>} body
   */
  async patchStaff(id, body) {
    const existing = await this.users.findByIdLean(id);
    this.assertStaffDirectoryMember(existing);

    /** @type {Record<string, unknown>} */
    const $set = {};

    if (body.displayName !== undefined) $set.displayName = body.displayName;
    if (body.preferredLocale !== undefined) $set.preferredLocale = body.preferredLocale;
    if (body.status !== undefined) $set.status = body.status;
    if (body.profile !== undefined) {
      const prev = isPlainObject(existing.profile) ? /** @type {Record<string, unknown>} */ (existing.profile) : {};
      $set.profile = { ...prev, ...body.profile };
    }
    if (body.deactivatedAt !== undefined) $set.deactivatedAt = body.deactivatedAt;

    if (body.email !== undefined) $set.email = body.email;
    if (body.phoneE164 !== undefined) $set.phoneE164 = body.phoneE164;

    if (body.roleKey !== undefined) {
      $set.roleKey = body.roleKey;
      $set.roleId = await this.resolveRoleIdForKey(body.roleKey);
    }

    const nextEmail = body.email !== undefined ? body.email : existing.email;
    const nextPhone = body.phoneE164 !== undefined ? body.phoneE164 : existing.phoneE164;
    if (!nextEmail && !nextPhone) {
      throw new BadRequestError('Staff accounts require at least one of email or phoneE164');
    }

    const updated = await this.users.updateByIdLean(id, $set);
    this.assertStaffDirectoryMember(updated);
    return serializeStaffMember(updated);
  }

  /**
   * @param {string} id
   */
  async deleteStaff(id) {
    const existing = await this.users.findByIdLean(id);
    this.assertStaffDirectoryMember(existing);
    const deleted = await this.users.softDeleteByIdLean(id);
    return { id: String(deleted?._id ?? id), deleted: true };
  }

  /**
   * @param {import('zod').infer<typeof import('./system-admin.validation.js').listAuditLogsQuerySchema>} query
   */
  async listAuditLogs(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.auditLogs.findPageWithActor({
      skip,
      limit,
      actionKey: query.actionKey,
      entityType: query.entityType,
      entityId: query.entityId,
      actorUserId: query.actorUserId,
      actorRoleKey: query.actorRoleKey,
      actorType: query.actorType,
      sort: query.sort,
      search: query.search,
      from: query.from,
      to: query.to,
    });

    return {
      items: items.map((row) => serializeAuditLog(row)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async getSettings() {
    const doc = await this.platformSettings.findGlobalLean();
    return serializePlatformSettings(doc);
  }

  /**
   * @param {import('zod').infer<typeof import('./system-admin.validation.js').patchSystemAdminSettingsBodySchema>} patch
   */
  async patchSettings(patch) {
    const next = await this.platformSettings.upsertMergeGlobal((current) =>
      mergePlatformSettings(current, patch),
    );
    return serializePlatformSettings(next);
  }

  async getDashboard() {
    const generatedAt = new Date().toISOString();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      settingsDoc,
      staffByRole,
      staffTotal,
      staffPending,
      audit24h,
      newestAudit,
      notificationsTotal,
      roles,
    ] = await Promise.all([
      this.platformSettings.findGlobalLean(),
      this.users.countGroupedByRoleKey([...STAFF_DIRECTORY_ROLE_KEYS]),
      this.users.countDocumentsFiltered({
        isDeleted: { $ne: true },
        roleKey: { $in: [...STAFF_DIRECTORY_ROLE_KEYS] },
      }),
      this.users.countDocumentsFiltered({
        isDeleted: { $ne: true },
        roleKey: { $in: [...STAFF_DIRECTORY_ROLE_KEYS] },
        status: 'pending',
      }),
      this.auditLogs.countSince({ occurredAt: { $gte: since } }),
      this.auditLogs.findLatestOne({}, { occurredAt: -1 }),
      this.notifications.countDocuments({}),
      this.roles.findAllSorted(),
    ]);

    const settings = serializePlatformSettings(settingsDoc);
    const maintenance = settings?.maintenance ?? { enabled: false, flags: {} };

    const cards = [
      { key: 'staff_total', label: 'Staff accounts', value: staffTotal },
      { key: 'staff_pending', label: 'Pending staff onboarding', value: staffPending },
      { key: 'audit_24h', label: 'Audit events (24h)', value: audit24h },
      { key: 'notifications_total', label: 'Notifications stored', value: notificationsTotal },
      { key: 'roles_total', label: 'Role definitions', value: roles.length },
    ];

    return serializeSystemAdminDashboard({
      generatedAt,
      headline: {
        title: 'System administration',
        subtitle: 'Operational snapshot for platform oversight',
      },
      cards,
      maintenance,
      staff: {
        total: staffTotal,
        pending: staffPending,
        byRole: staffByRole,
      },
      audit: {
        last24Hours: audit24h,
        newestEventAt: newestAudit?.occurredAt ? new Date(newestAudit.occurredAt).toISOString() : null,
      },
      notifications: { total: notificationsTotal },
      settings: {
        schemaVersion: settings?.schemaVersion ?? 1,
        defaultLocale: settings?.portal?.defaultLocale ?? 'ps',
      },
      governance: {
        roles: roles.map((r) => ({
          id: String(r._id),
          key: r.key,
          label: r.label,
          permissions: Array.isArray(r.permissions) ? r.permissions : [],
        })),
      },
    });
  }

  async getSystemSummary() {
    const generatedAt = new Date().toISOString();
    const nowMs = Date.now();
    const since = new Date(nowMs - 24 * 60 * 60 * 1000);
    const sincePrev24 = new Date(nowMs - 48 * 60 * 60 * 1000);
    const since7d = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
    const since14d = new Date(nowMs - 14 * 24 * 60 * 60 * 1000);
    const since1h = new Date(nowMs - 60 * 60 * 1000);

    const [
      settingsDoc,
      staffTotal,
      publicTotal,
      auditTotal,
      audit24h,
      newestAudit,
      notificationsTotal,
      platformByRole,
      publishedDecrees,
      auditBuckets,
      auditSecurity24h,
      auditSecurityPrev24h,
      usersJoined7d,
      usersJoinedPrev7d,
      httpAuditStats,
    ] = await Promise.all([
      this.platformSettings.findGlobalLean(),
      this.users.countDocumentsFiltered({
        isDeleted: { $ne: true },
        roleKey: { $in: [...STAFF_DIRECTORY_ROLE_KEYS] },
      }),
      this.users.countDocumentsFiltered({
        isDeleted: { $ne: true },
        roleKey: RoleKey.PUBLIC_USER,
      }),
      this.auditLogs.countSince({}),
      this.auditLogs.countSince({ occurredAt: { $gte: since } }),
      this.auditLogs.findLatestOne({}, { occurredAt: -1 }),
      this.notifications.countDocuments({}),
      this.users.countGroupedByRoleKey([...ROLE_KEYS]),
      this.decrees.countPublicCatalogDecrees(),
      this.auditLogs.aggregateActivityBucketsLast24h7(),
      this.auditLogs.countSecurityEventsBetween(since, new Date(nowMs)),
      this.auditLogs.countSecurityEventsBetween(sincePrev24, since),
      this.users.countCreatedBetween(since7d, new Date(nowMs)),
      this.users.countCreatedBetween(since14d, since7d),
      this.auditLogs.aggregateHttpStatusStatsSince(since1h),
    ]);

    const settings = serializePlatformSettings(settingsDoc);

    let databaseLatencyMs = null;
    /** @type {'ok' | 'slow' | 'down'} */
    let databaseState = 'down';
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        databaseLatencyMs = await measureDatabasePingMs(mongoose.connection);
        databaseState = databaseLatencyMs <= 800 ? 'ok' : 'slow';
      }
    } catch {
      databaseState = 'down';
    }

    const uptimeSeconds = Math.floor(process.uptime());
    const httpN = httpAuditStats.total;
    const httpErr = httpAuditStats.errors;
    const httpErrorRatePct = httpN > 0 ? (httpErr / httpN) * 100 : 0;

    /** @type {'ok' | 'warning' | 'critical'} */
    let healthStatus = 'ok';
    if (databaseState === 'down') healthStatus = 'critical';
    else if (databaseState === 'slow' || httpErrorRatePct > 15 || uptimeSeconds < 10) healthStatus = 'warning';
    else if (httpErrorRatePct > 5) healthStatus = 'warning';

    /** @type {'ok' | 'degraded' | 'down'} */
    let apiState = 'ok';
    if (databaseState === 'down') apiState = 'down';
    else if (httpErrorRatePct > 25) apiState = 'degraded';

    const totalUsers = staffTotal + publicTotal;

    return serializeSystemSummary({
      generatedAt,
      health: {
        status: healthStatus,
        uptimeSeconds,
        databaseLatencyMs,
        httpErrorRatePct: Math.round(httpErrorRatePct * 10) / 10,
        database: databaseState === 'ok' ? 'ok' : databaseState === 'slow' ? 'slow' : 'down',
        api: apiState === 'ok' ? 'ok' : apiState === 'down' ? 'down' : 'degraded',
      },
      totals: {
        staffUsers: staffTotal,
        publicUsers: publicTotal,
        totalUsers,
        auditLogs: auditTotal,
        notifications: notificationsTotal,
        publishedDecrees,
        auditEvents24h: audit24h,
        auditSecurityEvents24h: auditSecurity24h,
      },
      trends: {
        totalUsersPct7d: pctChangeRounded(usersJoined7d, usersJoinedPrev7d),
        securityEventsPct24h: pctChangeRounded(auditSecurity24h, auditSecurityPrev24h),
      },
      staffRoleBreakdown: platformByRole,
      maintenance: settings?.maintenance ?? { enabled: false, flags: {} },
      latestAudit: serializeAuditLog(newestAudit),
      auditActivityBuckets: auditBuckets,
    });
  }

  /**
   * @param {import('zod').infer<typeof import('./system-admin.validation.js').listAdminNotificationsQuerySchema>} query
   * @param {string} adminUserId
   */
  async listAdminNotifications(query, adminUserId) {
    const { skip, limit } = toOffsetLimit(query);
    const dismissed = await this.notificationUserStates.listDismissedNotificationIds(adminUserId);
    const { items, total } = await this.notifications.findPageForSystemAdminInbox({
      skip,
      limit,
      sort: query.sort,
      search: query.search,
      from: query.from,
      to: query.to,
      recipientUserId: adminUserId,
      excludeNotificationIds: dismissed,
    });

    const states =
      items.length > 0
        ? await this.notificationUserStates.findByUserAndNotificationIds(
            adminUserId,
            items.map((n) => String(n._id)),
          )
        : [];
    const stateByNid = new Map(states.map((s) => [String(s.notificationId), s]));

    return {
      items: items.map((n) => serializeInboxNotification(n, stateByNid.get(String(n._id)))),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {string} notificationId
   * @param {string} adminUserId
   */
  async markAdminNotificationRead(notificationId, adminUserId) {
    const row = await this.notifications.findByIdVisibleInSystemAdminInbox(notificationId, adminUserId);
    if (!row) throw new NotFoundError('Notification not found');

    if (row.recipientUserId) {
      if (String(row.recipientUserId) !== adminUserId) throw new NotFoundError('Notification not found');
      const updated = await this.notifications.markDirectReadById(notificationId);
      const fresh = updated ?? row;
      const [st] = await this.notificationUserStates.findByUserAndNotificationIds(adminUserId, [notificationId]);
      return serializeInboxNotification(fresh, st ?? null);
    }

    await this.notificationUserStates.upsertRead(adminUserId, notificationId);
    const fresh = await this.notifications.findById(notificationId);
    const [st] = await this.notificationUserStates.findByUserAndNotificationIds(adminUserId, [notificationId]);
    return serializeInboxNotification(fresh ?? row, st ?? null);
  }

  /**
   * @param {string} adminUserId
   */
  async markAllAdminNotificationsRead(adminUserId) {
    const dismissed = await this.notificationUserStates.listDismissedNotificationIds(adminUserId);
    await this.notifications.markAllDirectReadForUser(adminUserId);
    const broadcastIds = await this.notifications.listSystemAdminBroadcastInboxIdsForUser({
      recipientUserId: adminUserId,
      excludeNotificationIds: dismissed,
    });
    await this.notificationUserStates.bulkUpsertRead(adminUserId, broadcastIds);
    return { ok: true, broadcastMarked: broadcastIds.length };
  }

  /**
   * Writes a capped JSON snapshot under `UPLOAD_DIR/backups` (served at `/uploads/...`).
   *
   * @param {import('express').Request} req
   */
  async triggerMongoBackup(req) {
    const env = getEnv();
    const dir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'backups');
    await fs.mkdir(dir, { recursive: true });
    const fname = `mongo-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const full = path.join(dir, fname);

    const names = [
      'users',
      'decrees',
      'decree_categories',
      'exams',
      'exam_questions',
      'exam_attempts',
      'certificates',
      'inspection_assignments',
      'inspection_submissions',
      'notifications',
      'audit_logs',
    ];

    const snapshot = { generatedAt: new Date().toISOString(), collections: {} };
    for (const c of names) {
      const col = mongoose.connection.collection(c);
      snapshot.collections[c] = await col.find({}).limit(2500).toArray();
    }
    await fs.writeFile(full, JSON.stringify(snapshot), 'utf8');

    await auditService.logFromRequest(req, 'system_admin.backup', {
      resourceType: 'DiskFile',
      resourceId: fname,
      summary: 'Mongo JSON snapshot',
      details: { path: full },
    });

    return { filename: fname, url: `/uploads/backups/${fname}` };
  }

  /**
   * @param {{ title: string, body: string, audience?: 'all' | 'public_only' }} body
   * @param {import('express').Request} req
   */
  async announceSystem(body, req) {
    const audience = body.audience ?? 'all';
    const filter =
      audience === 'public_only'
        ? { isDeleted: { $ne: true }, roleKey: RoleKey.PUBLIC_USER }
        : { isDeleted: { $ne: true } };

    const cursor = UserModel.find(filter).select({ _id: 1 }).cursor();
    /** @type {Array<Record<string, unknown>>} */
    let batch = [];
    /** @type {string[]} */
    let pushChunk = [];
    let inserted = 0;
    for await (const u of cursor) {
      batch.push({
        title: body.title,
        body: body.body,
        recipientUserId: u._id,
        recipientRoleKey: null,
        channel: 'in_app',
        metadata: { kind: 'system_announcement', eventKind: 'system_alert' },
      });
      pushChunk.push(String(u._id));
      if (batch.length >= 200) {
        await NotificationModel.insertMany(batch);
        inserted += batch.length;
        batch = [];
      }
      if (pushChunk.length >= 800) {
        await enqueue(QUEUE.NOTIFICATIONS_FANOUT, 'system-announce-push', {
          recipientUserIds: [...pushChunk],
          title: body.title,
          body: body.body,
          data: { eventKind: 'system_alert', kind: 'system_announcement' },
        });
        pushChunk = [];
      }
    }
    if (batch.length) {
      await NotificationModel.insertMany(batch);
      inserted += batch.length;
    }
    if (pushChunk.length) {
      await enqueue(QUEUE.NOTIFICATIONS_FANOUT, 'system-announce-push', {
        recipientUserIds: [...pushChunk],
        title: body.title,
        body: body.body,
        data: { eventKind: 'system_alert', kind: 'system_announcement' },
      });
    }

    await auditService.logFromRequest(req, 'system_admin.announce', {
      resourceType: 'Notification',
      summary: 'System announcement fanout',
      details: { inserted, audience },
    });

    return { inserted };
  }
}

export const systemAdminService = new SystemAdminService();
