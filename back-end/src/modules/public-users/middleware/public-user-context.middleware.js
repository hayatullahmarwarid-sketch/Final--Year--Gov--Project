import { resolvePublicOwnerUserIdentity } from '../lib/resolve-public-user-identity.js';

/**
 * Resolves `public_user` Mongo id for catalog personalization (JWT, header, or env fallback).
 *
 * @typedef {object} PublicUserContext
 * @property {import('mongoose').Types.ObjectId | null} ownerUserId
 * @property {{ usedJwt: boolean, usedHeader: boolean, usedEnvFallback: boolean }} resolution
 */

/**
 * @param {import('express').Request} req
 * @returns {PublicUserContext}
 */
export function getPublicUserContext(req) {
  if (!req.publicUser) {
    throw new Error('publicUserContext middleware must run before handlers that use req.publicUser');
  }
  return req.publicUser;
}

export function publicUserContextMiddleware() {
  return (req, _res, next) => {
    const { ownerUserId, resolution } = resolvePublicOwnerUserIdentity(req);

    /** @type {PublicUserContext} */
    req.publicUser = {
      ownerUserId,
      resolution,
    };

    next();
  };
}
