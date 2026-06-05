/**
 * @param {Record<string, unknown>} row
 * @param {{ decreeCount?: number }} [opts]
 */
export function serializePublicDecreeCategory(row, opts = {}) {
  const decreeCount = typeof opts.decreeCount === 'number' ? opts.decreeCount : 0;
  const name =
    typeof row.name === 'string' && row.name.trim()
      ? row.name.trim()
      : typeof row.namePs === 'string' && row.namePs.trim()
        ? row.namePs.trim()
        : typeof row.slug === 'string' && row.slug.trim()
          ? row.slug.trim()
          : 'Category';
  return {
    id: String(row._id),
    slug: row.slug,
    name,
    namePs: row.namePs ?? null,
    description: row.description ?? null,
    sortOrder: row.sortOrder ?? 0,
    parentCategoryId: row.parentCategoryId ? String(row.parentCategoryId) : null,
    decreeCount,
  };
}
