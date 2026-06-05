import { z } from 'zod';
import { strongPasswordSchema } from '../../api/v1/auth/auth.validation.js';
import { extendListQuery } from '../shared/query/list-query.schema.js';
import { USER_ACCOUNT_STATUS_KEYS } from '../shared/enums/user-account-status.js';
import { ROLE_KEYS } from '../shared/enums/roles.js';
import { STAFF_DIRECTORY_ROLE_KEY_SET } from './system-admin.constants.js';

const objectIdString = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

const staffRoleKeySchema = z.string().refine((v) => STAFF_DIRECTORY_ROLE_KEY_SET.has(v), {
  message: 'Invalid staff roleKey',
});

const staffProfileSchema = z
  .object({
    jobTitle: z.string().trim().max(120).optional(),
    department: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .passthrough()
  .optional();

export const listStaffQuerySchema = extendListQuery({
  roleKey: staffRoleKeySchema.optional(),
  status: z.enum([...USER_ACCOUNT_STATUS_KEYS]).optional(),
});

const platformRoleKeySchema = z.enum(
  /** @type {[string, ...string[]]} */ ([...ROLE_KEYS]),
);

export const listPlatformUsersQuerySchema = extendListQuery({
  roleKey: platformRoleKeySchema.optional(),
  status: z.enum([...USER_ACCOUNT_STATUS_KEYS]).optional(),
});

export const listAuditLogsQuerySchema = extendListQuery({
  actionKey: z.string().trim().max(120).optional(),
  entityType: z.string().trim().max(120).optional(),
  entityId: z.string().trim().max(200).optional(),
  actorUserId: objectIdString.optional(),
  actorRoleKey: z.string().trim().max(64).optional(),
  actorType: z.enum(['user', 'system', 'integration']).optional(),
});

export const listAdminNotificationsQuerySchema = extendListQuery({});

export const notificationIdParamsSchema = z.object({
  id: objectIdString,
});

export const staffIdParamsSchema = z.object({
  id: objectIdString,
});

export const createStaffBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(200),
    roleKey: staffRoleKeySchema,
    email: z.string().trim().email().max(320).optional(),
    phoneE164: z.string().trim().max(24).optional(),
    preferredLocale: z.string().trim().min(2).max(16).default('ps'),
    status: z.enum([...USER_ACCOUNT_STATUS_KEYS]).default('pending'),
    profile: staffProfileSchema,
    /** When set, the staff member can sign in with email + this password immediately (hashed server-side). */
    initialPassword: strongPasswordSchema.optional(),
  })
  .strict()
  .refine((b) => Boolean(b.email || b.phoneE164), {
    message: 'Either email or phoneE164 is required',
    path: ['email'],
  });

/** Super Admin (JWT `system_admin`) only — body optional: omit `newPassword` to auto-generate a compliant temporary password. */
export const resetStaffPortalPasswordBodySchema = z
  .object({
    newPassword: strongPasswordSchema.optional(),
  })
  .strict();

export const patchStaffBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(200).optional(),
    roleKey: staffRoleKeySchema.optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    phoneE164: z.string().trim().max(24).nullable().optional(),
    preferredLocale: z.string().trim().min(2).max(16).optional(),
    status: z.enum([...USER_ACCOUNT_STATUS_KEYS]).optional(),
    profile: staffProfileSchema,
    deactivatedAt: z
      .union([z.string(), z.date(), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        const d = v instanceof Date ? v : new Date(v);
        if (Number.isNaN(d.getTime())) return undefined;
        return d;
      }),
  })
  .strict();

const looseBucket = z.record(z.unknown());

export const patchSystemAdminSettingsBodySchema = z
  .object({
    portal: looseBucket.optional(),
    security: looseBucket.optional(),
    integrations: looseBucket.optional(),
    features: looseBucket.optional(),
    extensions: looseBucket.optional(),
    maintenance: z
      .object({
        enabled: z.boolean().optional(),
        message: z.string().trim().max(2000).nullable().optional(),
        scheduledUntil: z
          .union([z.string(), z.date(), z.null()])
          .optional()
          .transform((v) => {
            if (v === undefined) return undefined;
            if (v === null) return null;
            const d = v instanceof Date ? v : new Date(v);
            if (Number.isNaN(d.getTime())) return undefined;
            return d;
          }),
        flags: z.record(z.boolean()).optional(),
      })
      .strict()
      .optional(),
    schemaVersion: z.coerce.number().int().min(1).optional(),
  })
  .strict();

export const systemAnnounceBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(4000),
    audience: z.enum(['all', 'public_only']).optional(),
  })
  .strict();
