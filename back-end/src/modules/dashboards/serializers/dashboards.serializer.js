/**
 * @param {unknown} d
 * @returns {string | null}
 */
function iso(d) {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

/**
 * @param {import('mongoose').Types.ObjectId | string | null | undefined} id
 */
function idStr(id) {
  if (!id) return null;
  return String(id);
}

/**
 * @param {Record<string, unknown>} payload
 */
export function serializeSystemAdminDashboardDto(payload) {
  return {
    generatedAt: payload.generatedAt,
    headline: payload.headline,
    cards: payload.cards,
    staff: payload.staff,
    audit: payload.audit,
    system: payload.system,
    totals: payload.totals,
    notifications: payload.notifications,
    governance: payload.governance,
  };
}

/**
 * @param {Record<string, unknown>} payload
 */
export function serializeDecreeUploadDashboardDto(payload) {
  return {
    generatedAt: payload.generatedAt,
    newDecreesThisMonth: typeof payload.newDecreesThisMonth === 'number' ? payload.newDecreesThisMonth : 0,
    newDecreesLastMonth: typeof payload.newDecreesLastMonth === 'number' ? payload.newDecreesLastMonth : 0,
    newDecreesMonthOverMonth: payload.newDecreesMonthOverMonth ?? null,
    viewsMonthOverMonth: payload.viewsMonthOverMonth ?? null,
    viewsByMonth12: Array.isArray(payload.viewsByMonth12) ? payload.viewsByMonth12 : [],
    uploadsByMonth12: Array.isArray(payload.uploadsByMonth12) ? payload.uploadsByMonth12 : [],
    categoryViewTrends: Array.isArray(payload.categoryViewTrends) ? payload.categoryViewTrends : [],
    recentActivity: Array.isArray(payload.recentActivity) ? payload.recentActivity : [],
    topCategoriesByViews: Array.isArray(payload.topCategoriesByViews) ? payload.topCategoriesByViews : [],
    topViewedCategoryId: payload.topViewedCategoryId ?? null,
    mostViewedDecrees: Array.isArray(payload.mostViewedDecrees) ? payload.mostViewedDecrees : [],
    decrees: payload.decrees,
    metadataCompleteness: payload.metadataCompleteness,
    topCategories: payload.topCategories,
    engagement: payload.engagement ?? { totalViews: 0, totalDownloads: 0 },
    viewsOverTime: payload.viewsOverTime ?? [],
    recentUploads: payload.recentUploads,
  };
}

/**
 * @param {Record<string, unknown>} payload
 */
export function serializeInspectorAdminDashboardDto(payload) {
  return {
    generatedAt: payload.generatedAt,
    assignments: payload.assignments,
    regionTrends: payload.regionTrends,
    submissionVolumes: payload.submissionVolumes,
    exams: payload.exams,
    certificates: payload.certificates,
  };
}

/**
 * @param {Record<string, unknown>} payload
 */
export function serializeInspectorDashboardDto(payload) {
  return {
    generatedAt: payload.generatedAt,
    binding: payload.binding,
    assignments: payload.assignments,
    syncQueue: payload.syncQueue,
  };
}

/**
 * @param {Record<string, unknown>} payload
 */
export function serializePublicDashboardDto(payload) {
  return {
    generatedAt: payload.generatedAt,
    identity: payload.identity,
    featuredDecrees: (Array.isArray(payload.featuredDecrees) ? payload.featuredDecrees : []).map((d) => ({
      id: idStr(/** @type {{ _id?: unknown }} */ (d)._id),
      decreeNumber: /** @type {{ decreeNumber?: string }} */ (d).decreeNumber ?? null,
      titleSummary: /** @type {{ titleSummary?: string }} */ (d).titleSummary ?? null,
      titlePs: /** @type {{ titlePs?: string }} */ (d).titlePs ?? null,
      titleFa: /** @type {{ titleFa?: string }} */ (d).titleFa ?? null,
      titleEn: /** @type {{ titleEn?: string }} */ (d).titleEn ?? null,
      publishedAt: iso(/** @type {{ publishedAt?: unknown }} */ (d).publishedAt),
      status: /** @type {{ status?: string }} */ (d).status ?? null,
    })),
    bookmarks: payload.bookmarks,
    upcomingExams: (Array.isArray(payload.upcomingExams) ? payload.upcomingExams : []).map((e) => ({
      id: idStr(/** @type {{ _id?: unknown }} */ (e)._id),
      title: /** @type {{ title?: string }} */ (e).title ?? null,
      status: /** @type {{ status?: string }} */ (e).status ?? null,
      scheduledOpensAt: iso(/** @type {{ scheduledOpensAt?: unknown }} */ (e).scheduledOpensAt),
      scheduledClosesAt: iso(/** @type {{ scheduledClosesAt?: unknown }} */ (e).scheduledClosesAt),
    })),
    certificates: payload.certificates,
    notifications: payload.notifications,
  };
}
