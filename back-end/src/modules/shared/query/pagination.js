/**
 * Shared offset pagination for list endpoints.
 * @param {{ page: number, limit: number }} q
 */
export function toOffsetLimit(q) {
  const limit = q.limit;
  const skip = (q.page - 1) * limit;
  return { skip, limit };
}

/**
 * Standard paginated list shape returned from services to HTTP layer.
 * @template T
 * @param {T[]} items
 * @param {number} page 1-based page index
 * @param {number} limit
 * @param {number} total
 * @returns {{ items: T[], page: number, limit: number, total: number }}
 */
export function paginatedList(items, page, limit, total) {
  return { items, page, limit, total };
}
