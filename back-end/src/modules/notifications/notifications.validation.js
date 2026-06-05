import { z } from 'zod';
import { ROLE_KEYS } from '../shared/enums/roles.js';
import { NOTIFICATION_CHANNELS } from '../shared/enums/notification-channel.js';
import { extendListQuery } from '../shared/query/list-query.schema.js';
import { objectIdString } from '../shared/validation/zod-helpers.js';

export const listNotificationsQuerySchema = extendListQuery({
  recipientRoleKey: z.enum([...ROLE_KEYS]).optional(),
  /**
   * `inbox` applies visibility + per-user dismiss rules for the resolved recipient.
   * `directory` lists persisted rows for operational dashboards (no inbox visibility filter).
   */
  view: z.enum(['inbox', 'directory']).default('inbox'),
});

export const createNotificationBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
  channel: z.enum([...NOTIFICATION_CHANNELS]).default('in_app'),
  recipientRoleKey: z.enum([...ROLE_KEYS]).optional(),
  recipientUserId: objectIdString.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const notificationIdParamSchema = z.object({
  id: objectIdString,
});
