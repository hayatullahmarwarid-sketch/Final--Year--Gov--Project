/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeDecreeCategory(row) {
  if (!row) return null;
  return {
    id: String(row._id),
    slug: row.slug,
    name: row.name,
    namePs: row.namePs ?? null,
    nameFa: row.nameFa ?? null,
    description: row.description ?? null,
    parentCategoryId: row.parentCategoryId ? String(row.parentCategoryId) : null,
    sortOrder: row.sortOrder ?? 0,
    isActive: Boolean(row.isActive),
    tenantId: row.tenantId ?? null,
    isDeleted: Boolean(row.isDeleted),
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}
