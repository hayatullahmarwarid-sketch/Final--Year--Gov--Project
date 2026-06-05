/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {{ stripBodies?: boolean }} [opts]
 */
export function serializeDecreeVersion(row, opts = {}) {
  if (!row) return null;
  const strip = opts.stripBodies === true;
  return {
    id: String(row._id),
    decreeId: String(row.decreeId),
    lineageRootDecreeId: String(row.lineageRootDecreeId),
    versionNumber: row.versionNumber,
    supersedesVersionId: row.supersedesVersionId ? String(row.supersedesVersionId) : null,
    publicationStatus: row.publicationStatus,
    isImmutable: Boolean(row.isImmutable),
    changeSummary: row.changeSummary ?? null,
    localizedContent: strip
      ? (row.localizedContent ?? []).map((b) => ({
          locale: b.locale,
          hasTitle: Boolean(b.title),
          hasBody: Boolean(b.bodyPlain || b.bodyRich),
        }))
      : row.localizedContent ?? [],
    sections: strip ? (row.sections ?? []).map((s) => ({ key: s.key, title: s.title, sortOrder: s.sortOrder })) : row.sections ?? [],
    publishedAt: row.publishedAt ?? null,
    effectiveFrom: row.effectiveFrom ?? null,
    effectiveTo: row.effectiveTo ?? null,
    contentChecksumSha256: row.contentChecksumSha256 ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}
