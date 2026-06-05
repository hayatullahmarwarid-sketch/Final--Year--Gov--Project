import { BadRequestError } from '../../shared/http/index.js';

/**
 * @param {import('express').Request} req
 * @returns {import('mongoose').Types.ObjectId}
 */
export function requirePublicOwnerUserId(req) {
  const ownerUserId = req.publicUser?.ownerUserId;
  if (!ownerUserId) {
    throw new BadRequestError(
      'Sign in as a public user (Bearer access token with role `public_user`), or send `X-Public-User-Id`, or set `PUBLIC_API_STANDALONE_USER_ID` for local development.',
    );
  }
  return ownerUserId;
}
