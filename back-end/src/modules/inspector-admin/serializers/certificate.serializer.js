/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeCertificate(row) {
  if (!row) return null;
  return {
    id: row._id ? String(row._id) : null,
    certificateNumber: row.certificateNumber ?? null,
    holderUserId: row.holderUserId ? String(row.holderUserId) : null,
    kind: row.kind ?? null,
    status: row.status ?? null,
    sourceExamId: row.sourceExamId ? String(row.sourceExamId) : null,
    sourceExamAttemptId: row.sourceExamAttemptId ? String(row.sourceExamAttemptId) : null,
    sourceDecreeId: row.sourceDecreeId ? String(row.sourceDecreeId) : null,
    sourceDecreeVersionId: row.sourceDecreeVersionId ? String(row.sourceDecreeVersionId) : null,
    issuedAt: row.issuedAt ? new Date(row.issuedAt).toISOString() : null,
    revokedAt: row.revokedAt ? new Date(row.revokedAt).toISOString() : null,
    revokeReason: row.revokeReason ?? null,
    pdfFileId: row.pdfFileId ? String(row.pdfFileId) : null,
    metadata: row.metadata ?? undefined,
    issuedByUserId: row.issuedByUserId ? String(row.issuedByUserId) : null,
    revokedByUserId: row.revokedByUserId ? String(row.revokedByUserId) : null,
    tenantId: row.tenantId ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
