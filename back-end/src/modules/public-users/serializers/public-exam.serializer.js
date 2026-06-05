/**
 * @param {Record<string, unknown>} row
 */
export function serializePublicExamSummary(row) {
  return {
    id: String(row._id),
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    decreeCategoryId: row.decreeCategoryId ? String(row.decreeCategoryId) : null,
    decreeCategoryName: row.decreeCategoryName != null ? String(row.decreeCategoryName) : null,
    scheduledOpensAt: row.scheduledOpensAt ?? null,
    scheduledClosesAt: row.scheduledClosesAt ?? null,
    publishedAt: row.publishedAt ?? null,
    passingScore: row.passingScore ?? null,
    maxScore: row.maxScore ?? null,
    timeLimitMinutes: row.timeLimitMinutes ?? null,
    questionsCount: row.questionsCount ?? 0,
    tenantId: row.tenantId ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}
