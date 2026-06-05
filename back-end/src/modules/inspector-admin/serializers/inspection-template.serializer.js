/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeInspectionTemplate(row) {
  if (!row) return null;
  return {
    id: row._id ? String(row._id) : null,
    name: row.name ?? null,
    description: row.description ?? null,
    location: row.location ?? null,
    revision: row.revision ?? null,
    isActive: row.isActive ?? null,
    sections: row.sections ?? [],
    tenantId: row.tenantId ?? null,
    createdByUserId: row.createdByUserId ? String(row.createdByUserId) : null,
    updatedByUserId: row.updatedByUserId ? String(row.updatedByUserId) : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
