/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeStoredFile(row) {
  if (!row) return null;
  return {
    id: String(row._id),
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size,
    provider: row.provider,
    providerFileId: row.providerFileId,
    url: row.url ?? null,
    folder: row.folder ?? null,
    purpose: row.purpose,
    pdfPageCount:
      typeof row.pdfPageCount === 'number' && row.pdfPageCount >= 0 ? row.pdfPageCount : null,
    linkedEntityType: row.linkedEntityType ?? null,
    linkedEntityId: row.linkedEntityId ? String(row.linkedEntityId) : null,
    uploadedBy: row.uploadedBy ? String(row.uploadedBy) : null,
    tenantId: row.tenantId ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
