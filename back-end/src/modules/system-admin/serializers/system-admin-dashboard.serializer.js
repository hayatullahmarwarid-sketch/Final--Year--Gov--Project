/**
 * @param {Record<string, unknown>} payload
 */
export function serializeSystemAdminDashboard(payload) {
  return {
    generatedAt: payload.generatedAt,
    headline: payload.headline,
    cards: payload.cards,
    maintenance: payload.maintenance,
    staff: payload.staff,
    audit: payload.audit,
    notifications: payload.notifications,
    settings: payload.settings,
    governance: payload.governance,
  };
}

/**
 * @param {Record<string, unknown>} payload
 */
export function serializeSystemSummary(payload) {
  return {
    generatedAt: payload.generatedAt,
    health: payload.health,
    totals: payload.totals,
    trends: payload.trends,
    staffRoleBreakdown: payload.staffRoleBreakdown,
    maintenance: payload.maintenance,
    latestAudit: payload.latestAudit,
    auditActivityBuckets: payload.auditActivityBuckets ?? [],
  };
}
