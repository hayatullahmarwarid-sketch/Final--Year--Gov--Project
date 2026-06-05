/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeInspectionAssignment(row) {
  if (!row) return null;
  return {
    id: row._id ? String(row._id) : null,
    templateId: row.templateId ? String(row.templateId) : null,
    templateRevisionSnapshot: row.templateRevisionSnapshot ?? null,
    decreeId: row.decreeId ? String(row.decreeId) : null,
    decreeVersionId: row.decreeVersionId ? String(row.decreeVersionId) : null,
    inspectorUserId: row.inspectorUserId ? String(row.inspectorUserId) : null,
    assignedByUserId: row.assignedByUserId ? String(row.assignedByUserId) : null,
    approvedByUserId: row.approvedByUserId ? String(row.approvedByUserId) : null,
    reviewedByUserId: row.reviewedByUserId ? String(row.reviewedByUserId) : null,
    status: row.status ?? null,
    priority: row.priority ?? null,
    region: row.region ?? null,
    location: row.location ?? null,
    dueAt: row.dueAt ? new Date(row.dueAt).toISOString() : null,
    assignedAt: row.assignedAt ? new Date(row.assignedAt).toISOString() : null,
    startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
    finalizedAt: row.finalizedAt ? new Date(row.finalizedAt).toISOString() : null,
    returnReason: row.returnReason ?? null,
    revisionCount: row.revisionCount ?? null,
    latestSubmissionId: row.latestSubmissionId ? String(row.latestSubmissionId) : null,
    notes: row.notes ?? null,
    reporting: row.reporting ?? undefined,
    tenantId: row.tenantId ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
