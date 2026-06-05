/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeExamQuestionBankEntry(row) {
  if (!row) return null;
  return {
    id: row._id ? String(row._id) : null,
    decreeCategoryId: row.decreeCategoryId ? String(row.decreeCategoryId) : null,
    decreeCategoryName: row.decreeCategoryName != null ? String(row.decreeCategoryName) : null,
    type: row.type ?? null,
    stem: row.stem ?? null,
    explanation: row.explanation ?? null,
    options: row.options ?? null,
    correctOptionKeys: row.correctOptionKeys ?? null,
    correctBoolean: row.correctBoolean ?? null,
    correctTextNormalized: row.correctTextNormalized ?? null,
    points: row.points ?? null,
    isActive: row.isActive !== false,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
