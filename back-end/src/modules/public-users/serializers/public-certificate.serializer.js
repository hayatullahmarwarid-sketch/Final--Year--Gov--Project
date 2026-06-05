/**
 * @param {Record<string, unknown>} row
 * @param {{
 *   passingThreshold?: { passingScore: number | null, maxScore: number | null, source: string } | null,
 *   pdfUrl?: string | null,
 * }} [embed]
 */
export function serializePublicCertificate(row, embed = {}) {
  return {
    id: String(row._id),
    certificateNumber: row.certificateNumber,
    holderUserId: row.holderUserId ? String(row.holderUserId) : null,
    kind: row.kind,
    status: row.status,
    sourceExamId: row.sourceExamId ? String(row.sourceExamId) : null,
    sourceExamAttemptId: row.sourceExamAttemptId ? String(row.sourceExamAttemptId) : null,
    sourceDecreeId: row.sourceDecreeId ? String(row.sourceDecreeId) : null,
    sourceDecreeVersionId: row.sourceDecreeVersionId ? String(row.sourceDecreeVersionId) : null,
    issuedAt: row.issuedAt ? new Date(row.issuedAt).toISOString() : null,
    revokedAt: row.revokedAt ? new Date(row.revokedAt).toISOString() : null,
    revokeReason: row.revokeReason ?? null,
    pdfFileId: row.pdfFileId ? String(row.pdfFileId) : null,
    pdfUrl: embed.pdfUrl ?? null,
    metadata: row.metadata ?? undefined,
    passingThreshold: embed.passingThreshold ?? null,
    tenantId: row.tenantId ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
