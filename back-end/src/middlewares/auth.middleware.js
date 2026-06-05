import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../core/errors/app-error.js';
import { verifyToken } from '../lib/auth.js';

/**
 * @param {unknown} err
 * @param {import('express').NextFunction} next
 */
function forwardAccessTokenError(err, next) {
  if (err instanceof jwt.TokenExpiredError) {
    return next(new UnauthorizedError('Access token expired'));
  }
  return next(new UnauthorizedError('Invalid or expired access token'));
}

/**
 * @param {import('express').Request} req
 * @param {import('jsonwebtoken').JwtPayload & { roleKey?: string }} decoded
 */
function applyAccessTokenToRequest(req, decoded) {
  const id = typeof decoded.sub === 'string' ? decoded.sub : String(decoded.sub ?? '');
  const email = typeof decoded.email === 'string' ? decoded.email : '';
  const roleKey = typeof decoded.roleKey === 'string' ? decoded.roleKey : '';

  req.user = { id, email, role: roleKey };

  if (req.context) {
    req.context.actor = {
      type: 'user',
      id,
      roleKeys: roleKey ? [roleKey] : [],
      permissions: [],
    };
    req.context.auth.state = 'authenticated';
  }
}

/**
 * @param {string | undefined} authorization
 * @returns {string | null} Raw JWT or null
 */
function readBearerToken(authorization) {
  if (!authorization || typeof authorization !== 'string') return null;
  const parts = authorization.split(/\s+/);
  if (parts.length !== 2) return null;
  if (parts[0].toLowerCase() !== 'bearer') return null;
  const token = parts[1]?.trim();
  return token && token.length > 0 ? token : null;
}

/**
 * When `Authorization: Bearer` is present, verifies the access JWT and populates
 * `req.user`, `req.context.actor`, and `req.context.auth.state`.
 * Missing header → anonymous (no-op). Malformed or invalid token → 401.
 *
 * @returns {import('express').RequestHandler}
 */
export function resolveBearerJwtMiddleware() {
  return (req, _res, next) => {
    const token = readBearerToken(req.get('authorization'));
    if (!token) return next();
    try {
      const decoded = verifyToken(token);
      applyAccessTokenToRequest(req, decoded);
      return next();
    } catch (err) {
      return forwardAccessTokenError(err, next);
    }
  };
}

/**
 * Requires a valid access JWT (`Authorization: Bearer <token>`).
 * Sets `req.user` and request context actor fields on success.
 *
 * @returns {import('express').RequestHandler}
 */
export function authenticate() {
  return (req, _res, next) => {
    const token = readBearerToken(req.get('authorization'));
    if (!token) return next(new UnauthorizedError('Missing bearer token'));
    try {
      const decoded = verifyToken(token);
      applyAccessTokenToRequest(req, decoded);
      return next();
    } catch (err) {
      return forwardAccessTokenError(err, next);
    }
  };
}
