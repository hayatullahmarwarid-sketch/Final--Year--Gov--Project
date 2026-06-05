/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function serializeExam(row) {
  if (!row) return null;
  return {
    id: row._id ? String(row._id) : null,
    title: row.title ?? null,
    description: row.description ?? null,
    decreeCategoryId: row.decreeCategoryId ? String(row.decreeCategoryId) : null,
    decreeCategoryName: row.decreeCategoryName != null ? String(row.decreeCategoryName) : null,
    status: row.status ?? null,
    audienceRoleKeys: row.audienceRoleKeys ?? [],
    scheduledOpensAt: row.scheduledOpensAt ? new Date(row.scheduledOpensAt).toISOString() : null,
    scheduledClosesAt: row.scheduledClosesAt ? new Date(row.scheduledClosesAt).toISOString() : null,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    passingScore: row.passingScore ?? null,
    maxScore: row.maxScore ?? null,
    timeLimitMinutes: row.timeLimitMinutes ?? null,
    questionsCount: row.questionsCount ?? null,
    attemptsCount: row.attemptsCount ?? null,
    randomizeQuestions: row.randomizeQuestions ?? null,
    randomizeOptions: row.randomizeOptions ?? null,
    tenantId: row.tenantId ?? null,
    createdByUserId: row.createdByUserId ? String(row.createdByUserId) : null,
    updatedByUserId: row.updatedByUserId ? String(row.updatedByUserId) : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
