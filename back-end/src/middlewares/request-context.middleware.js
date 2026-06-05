import { newRequestId } from '../utils/crypto-random.js';

/**
 * Prepares per-request context for logging, tracing, and future JWT claims.
 * @typedef {object} RequestContext
 * @property {string} requestId
 * @property {null | { type: 'user', id: string, roleKeys: string[], permissions: string[] }} actor
 * @property {{ state: 'anonymous' | 'authenticated' }} auth
 */

/**
 * @param {import('express').Request} req
 * @returns {RequestContext}
 */
export function getRequestContext(req) {
  if (!req.context) {
    throw new Error('requestContext middleware must be registered before handlers that use req.context');
  }
  return req.context;
}

export function requestContextMiddleware() {
  return (req, res, next) => {
    const headerId = req.header('x-request-id');
    const requestId = typeof headerId === 'string' && headerId.length > 0 ? headerId : newRequestId();

    /** @type {RequestContext} */
    req.context = {
      requestId,
      actor: null,
      auth: { state: 'anonymous' },
    };

    res.setHeader('X-Request-Id', requestId);
    next();
  };
}
