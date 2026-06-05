/**
 * @param {Record<string, unknown> | null | undefined} row
 * Row may include joined `_examinee` and `_exam` from aggregation.
 */
export function serializeExamAttemptAdmin(row) {
  if (!row) return null;
  const ex = /** @type {Record<string, unknown> | undefined} */ (row._examinee);
  const exam = /** @type {Record<string, unknown> | undefined} */ (row._exam);

  return {
    id: row._id ? String(row._id) : null,
    examId: row.examId ? String(row.examId) : null,
    examTitle: exam?.title != null ? String(exam.title) : null,
    examineeUserId: row.examineeUserId ? String(row.examineeUserId) : null,
    examineeDisplayName: ex?.displayName != null ? String(ex.displayName) : null,
    attemptNumber: typeof row.attemptNumber === 'number' ? row.attemptNumber : 1,
    status: row.status ?? null,
    startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
    gradedAt: row.gradedAt ? new Date(row.gradedAt).toISOString() : null,
    score: row.score ?? null,
    maxScore: row.maxScore ?? null,
    passed: row.passed ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
