/**
 * @param {Record<string, unknown> | null | undefined} doc
 */
export function serializePlatformSettings(doc) {
  if (!doc) return null;
  return {
    docKey: doc.docKey ?? 'global',
    schemaVersion: doc.schemaVersion ?? 1,
    portal: doc.portal ?? {},
    security: doc.security ?? {},
    integrations: doc.integrations ?? {},
    features: doc.features ?? {},
    maintenance: {
      enabled: Boolean(doc.maintenance?.enabled),
      message: doc.maintenance?.message ?? null,
      scheduledUntil: doc.maintenance?.scheduledUntil
        ? new Date(doc.maintenance.scheduledUntil).toISOString()
        : null,
      flags: doc.maintenance?.flags && typeof doc.maintenance.flags === 'object'
        ? doc.maintenance.flags
        : {},
    },
    extensions: doc.extensions ?? {},
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}
