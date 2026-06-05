/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeExamQuestionAdmin(row) {
  if (!row) return null;
  return {
    id: row._id ? String(row._id) : null,
    sourceBankQuestionId: row.sourceBankQuestionId ? String(row.sourceBankQuestionId) : null,
    examId: row.examId ? String(row.examId) : null,
    order: row.order ?? 0,
    type: row.type ?? null,
    stem: row.stem ?? null,
    explanation: row.explanation ?? null,
    options: row.options ?? undefined,
    correctOptionKeys: row.correctOptionKeys ?? undefined,
    correctBoolean: row.correctBoolean ?? null,
    correctTextNormalized: row.correctTextNormalized ?? null,
    points: row.points ?? 1,
    isActive: row.isActive !== false,
    createdByUserId: row.createdByUserId ? String(row.createdByUserId) : null,
    updatedByUserId: row.updatedByUserId ? String(row.updatedByUserId) : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
