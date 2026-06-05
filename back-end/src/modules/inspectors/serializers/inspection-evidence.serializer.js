/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeInspectionEvidenceFile(row) {
  if (!row) return null;
  return {
    id: row._id ? String(row._id) : null,
    assignmentId: row.assignmentId ? String(row.assignmentId) : null,
    submissionId: row.submissionId ? String(row.submissionId) : null,
    fileId: row.fileId ? String(row.fileId) : null,
    caption: row.caption ?? null,
    capturedAt: row.capturedAt ? new Date(row.capturedAt).toISOString() : null,
    itemKey: row.itemKey ?? null,
    createdByUserId: row.createdByUserId ? String(row.createdByUserId) : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
