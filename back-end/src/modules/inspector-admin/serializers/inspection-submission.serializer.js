/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {{ assignment?: Record<string, unknown> | null }} [opts]
 */
export function serializeInspectionSubmission(row, opts = {}) {
  if (!row) return null;
  const base = {
    id: row._id ? String(row._id) : null,
    assignmentId: row.assignmentId ? String(row.assignmentId) : null,
    revisionNumber: row.revisionNumber ?? null,
    submissionKind: row.submissionKind ?? null,
    answers: row.answers ?? [],
    review: row.review ?? undefined,
    reviewedByUserId: row.reviewedByUserId ? String(row.reviewedByUserId) : null,
    approvedByUserId: row.approvedByUserId ? String(row.approvedByUserId) : null,
    submittedByUserId: row.submittedByUserId ? String(row.submittedByUserId) : null,
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
    clientRequestId: row.clientRequestId ?? null,
    tenantId: row.tenantId ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
  if (!opts.assignment) return base;
  return {
    ...base,
    assignment: {
      id: opts.assignment._id ? String(opts.assignment._id) : null,
      status: opts.assignment.status ?? null,
      priority: opts.assignment.priority ?? null,
      region: opts.assignment.region ?? null,
      dueAt: opts.assignment.dueAt ? new Date(opts.assignment.dueAt).toISOString() : null,
      decreeId: opts.assignment.decreeId ? String(opts.assignment.decreeId) : null,
      decreeVersionId: opts.assignment.decreeVersionId ? String(opts.assignment.decreeVersionId) : null,
      inspectorUserId: opts.assignment.inspectorUserId ? String(opts.assignment.inspectorUserId) : null,
      latestSubmissionId: opts.assignment.latestSubmissionId
        ? String(opts.assignment.latestSubmissionId)
        : null,
    },
  };
}
