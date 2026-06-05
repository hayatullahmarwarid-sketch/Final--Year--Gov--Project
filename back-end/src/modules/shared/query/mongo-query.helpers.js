/**
 * Escape minimal regex metacharacters for user-provided search strings.
 * @param {string} value
 */
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a case-insensitive `$or` regex match across dotted or top-level paths.
 * @param {string | undefined} search
 * @param {string[]} fieldPaths Mongoose field paths
 * @returns {Record<string, unknown> | undefined}
 */
export function buildSearchOrFilter(search, fieldPaths) {
  if (!search || !fieldPaths.length) return undefined;
  const rx = new RegExp(escapeRegex(search.trim()), 'i');
  return { $or: fieldPaths.map((path) => ({ [path]: rx })) };
}

/**
 * Mongoose filter fragment for an inclusive date range on a single field.
 * @param {Date | undefined} from
 * @param {Date | undefined} to
 * @param {string} [field]
 * @returns {Record<string, unknown> | undefined}
 */
export function buildDateRangeFilter(from, to, field = 'createdAt') {
  if (!from && !to) return undefined;
  const bounds = /** @type {Record<string, Date>} */ ({});
  if (from) bounds.$gte = from;
  if (to) bounds.$lte = to;
  return { [field]: bounds };
}

/**
 * Parse `sort` query into a Mongoose sort object. Unknown segments are skipped.
 * @param {string | undefined} sort
 * @param {readonly string[]} allowedFields
 * @param {Record<string, 1 | -1>} [defaultSort]
 * @returns {Record<string, 1 | -1>}
 */
export function parseSortQuery(sort, allowedFields, defaultSort = { createdAt: -1 }) {
  const allowed = new Set(allowedFields);
  if (!sort || !sort.trim()) return { ...defaultSort };

  const out = /** @type {Record<string, 1 | -1>} */ ({});
  for (const raw of sort.split(',')) {
    const token = raw.trim();
    if (!token) continue;
    const desc = token.startsWith('-');
    const key = desc ? token.slice(1) : token;
    if (!key || !allowed.has(key)) continue;
    out[key] = desc ? -1 : 1;
  }
  return Object.keys(out).length > 0 ? out : { ...defaultSort };
}
