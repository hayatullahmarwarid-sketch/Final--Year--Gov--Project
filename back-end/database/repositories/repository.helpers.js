export { toOffsetLimit } from '../../src/modules/shared/query/pagination.js';

/**
 * Merge Mongo filters, dropping undefined entries.
 * @param {...Record<string, unknown> | undefined} parts
 * @returns {Record<string, unknown>}
 */
export function mergeFilters(...parts) {
  return parts.reduce((acc, cur) => {
    if (!cur) return acc;
    return { ...acc, ...cur };
  }, {});
}
