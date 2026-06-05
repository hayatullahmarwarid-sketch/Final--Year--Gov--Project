import { createSerializer } from '../shared/serialization/serializer.js';

/**
 * Stable public shape for notification resources.
 */
export const serializeNotification = createSerializer((plain) => ({
  id: plain._id,
  title: plain.title,
  body: plain.body,
  channel: plain.channel,
  recipientRoleKey: plain.recipientRoleKey ?? null,
  recipientUserId: plain.recipientUserId ?? null,
  tenantId: plain.tenantId ?? null,
  readStatus: plain.readStatus ?? 'unread',
  readAt: plain.readAt ?? null,
  isDeleted: plain.isDeleted ?? false,
  deletedAt: plain.deletedAt ?? null,
  metadata: plain.metadata ?? null,
  createdByUserId: plain.createdByUserId ?? null,
  updatedByUserId: plain.updatedByUserId ?? null,
  createdAt: plain.createdAt,
  updatedAt: plain.updatedAt,
}));

/**
 * @param {Record<string, unknown>} plain
 * @param {{ readAt?: Date | null, dismissedAt?: Date | null } | null | undefined} userState
 */
export function serializeInboxNotification(plain, userState) {
  const base = /** @type {ReturnType<typeof serializeNotification>} */ (serializeNotification(plain));
  const isDirect = plain.recipientUserId != null;
  const effectiveRead = isDirect
    ? base.readStatus === 'read'
    : Boolean(userState?.readAt) || base.readStatus === 'read';
  const effectiveReadAt = isDirect ? base.readAt : userState?.readAt ?? (base.readStatus === 'read' ? base.readAt : null);
  return {
    ...base,
    readStatus: effectiveRead ? 'read' : 'unread',
    readAt: effectiveReadAt,
    dismissedAt: userState?.dismissedAt ?? null,
  };
}
