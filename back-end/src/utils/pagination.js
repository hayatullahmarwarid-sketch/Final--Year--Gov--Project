/**
 * @deprecated Import from `../modules/shared/query/index.js` instead.
 */
export {
  listQueryBaseSchema,
  listQueryBaseObjectSchema,
  extendListQuery,
  normalizeListLimit,
  toOffsetLimit,
} from '../modules/shared/query/index.js';

import { listPaginationInputSchema } from '../modules/shared/query/list-query.schema.js';

/** @deprecated Prefer `listQueryBaseSchema` or `extendListQuery`. */
export const paginationQuerySchema = listPaginationInputSchema.transform(({ pageSize, limit, page }) => ({
  page,
  limit: limit ?? pageSize ?? 20,
}));
