import { HttpStatus } from '../core/errors/http-status.js';

/**
 * @typedef {object} ApiSuccessBody
 * @property {true} success
 * @property {unknown} data
 * @property {string} [message]
 * @property {object} [meta]
 */

/**
 * @typedef {object} ApiErrorBody
 * @property {false} success
 * @property {string} message
 * @property {object} error
 * @property {string} error.code
 * @property {string} error.message
 * @property {unknown} [error.details]
 */

/**
 * @param {unknown} value
 * @returns {value is SuccessOptions}
 */
function isSuccessOptionsBag(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (
    'message' in value ||
    'statusCode' in value ||
    ('meta' in value && Object.keys(value).every((k) => ['message', 'meta', 'statusCode'].includes(k)))
  );
}

/**
 * @typedef {object} SuccessOptions
 * @property {string} [message]
 * @property {object} [meta]
 * @property {number} [statusCode]
 */

/**
 * @param {import('express').Response} res
 * @param {unknown} data
 * @param {SuccessOptions | Record<string, unknown> | number} [metaOrThird] Legacy: meta object, status code number, or options bag.
 * @param {number} [statusCodeLegacy] Legacy fourth argument when third is meta.
 */
export function sendSuccess(res, data, metaOrThird, statusCodeLegacy) {
  let message;
  /** @type {Record<string, unknown> | undefined} */
  let meta;
  let statusCode = HttpStatus.OK;

  if (metaOrThird === undefined && statusCodeLegacy === undefined) {
    // single data payload
  } else if (typeof metaOrThird === 'number' && statusCodeLegacy === undefined) {
    statusCode = metaOrThird;
  } else if (isSuccessOptionsBag(metaOrThird)) {
    const o = /** @type {SuccessOptions} */ (metaOrThird);
    if (typeof o.message === 'string') message = o.message;
    if (o.meta !== undefined) meta = o.meta;
    if (typeof o.statusCode === 'number') statusCode = o.statusCode;
  } else {
    meta = /** @type {Record<string, unknown>} */ (metaOrThird);
    if (typeof statusCodeLegacy === 'number') statusCode = statusCodeLegacy;
  }

  /** @type {ApiSuccessBody} */
  const body = { success: true, data };
  if (message !== undefined) body.message = message;
  if (meta && Object.keys(meta).length > 0) body.meta = meta;
  return res.status(statusCode).json(body);
}

/**
 * @param {import('express').Response} res
 * @param {object} params
 * @param {string} params.code
 * @param {string} params.message
 * @param {unknown} [params.details]
 * @param {number} [params.statusCode]
 */
export function sendError(res, { code, message, details, statusCode = HttpStatus.BAD_REQUEST }) {
  /** @type {ApiErrorBody} */
  const body = {
    success: false,
    message,
    error: { code, message },
  };
  if (details !== undefined) body.error.details = details;
  return res.status(statusCode).json(body);
}

/**
 * @param {import('express').Response} res
 * @param {unknown[]} items
 * @param {{ page: number, limit: number, total: number }} page
 * @param {string} [message]
 */
export function sendPaginated(res, items, page, message) {
  const totalPages = Math.max(1, Math.ceil(page.total / page.limit));
  return sendSuccess(res, items, {
    message,
    meta: {
      page: page.page,
      limit: page.limit,
      total: page.total,
      totalPages,
    },
  });
}

/**
 * Paginated list returned by services (single contract for controllers).
 * @typedef {{ items: unknown[], page: number, limit: number, total: number }} PaginatedList
 */

/**
 * Send a paginated envelope from a service-shaped result (avoids repeating meta wiring).
 * @param {import('express').Response} res
 * @param {PaginatedList} list
 * @param {string} [message]
 */
export function sendPaginatedList(res, list, message) {
  return sendPaginated(
    res,
    list.items,
    { page: list.page, limit: list.limit, total: list.total },
    message,
  );
}

/**
 * Cursor-paginated list envelope (Phase 3). Use for hot, large lists where offset pagination
 * is too expensive. `nextCursor` is null when there is no next page.
 *
 * @param {import('express').Response} res
 * @param {{ items: unknown[], limit: number, nextCursor: string | null, hasMore: boolean }} list
 * @param {string} [message]
 */
export function sendCursorList(res, list, message) {
  return sendSuccess(res, list.items, {
    message,
    meta: {
      limit: list.limit,
      nextCursor: list.nextCursor,
      hasMore: list.hasMore,
      kind: 'cursor',
    },
  });
}
