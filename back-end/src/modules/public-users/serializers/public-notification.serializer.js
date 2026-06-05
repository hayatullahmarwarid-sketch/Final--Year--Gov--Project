/**
 * @param {Record<string, unknown>} row
 */
export function serializePublicNotification(row) {
  return {
    id: String(row._id),
    title: row.title,
    body: row.body,
    channel: row.channel ?? 'in_app',
    readStatus: row.readStatus ?? 'unread',
    readAt: row.readAt ?? null,
    recipientRoleKey: row.recipientRoleKey ?? null,
    recipientUserId: row.recipientUserId ? String(row.recipientUserId) : null,
    metadata: row.metadata ?? undefined,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}
