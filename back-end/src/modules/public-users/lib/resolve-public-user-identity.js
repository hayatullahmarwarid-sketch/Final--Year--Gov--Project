import mongoose from 'mongoose';
import { getEnv } from '../../../config/env.js';
import { RoleKey } from '../../shared/enums/roles.js';

/**
 * Resolves the Mongo `ownerUserId` for public mobile flows.
 *
 * Priority:
 * 1. Verified access JWT with `roleKey === public_user` (`sub` must be a valid ObjectId).
 * 2. `X-Public-User-Id` header (integration / tooling).
 * 3. `PUBLIC_API_STANDALONE_USER_ID` env (local only).
 *
 * @typedef {object} PublicUserResolution
 * @property {import('mongoose').Types.ObjectId | null} ownerUserId
 * @property {{ usedJwt: boolean, usedHeader: boolean, usedEnvFallback: boolean }} resolution
 */

/**
 * @param {import('express').Request} req
 * @returns {PublicUserResolution}
 */
export function resolvePublicOwnerUserIdentity(req) {
  const role = req.user?.role;
  const id = req.user?.id;
  if (
    role === RoleKey.PUBLIC_USER &&
    typeof id === 'string' &&
    mongoose.Types.ObjectId.isValid(id.trim())
  ) {
    return {
      ownerUserId: new mongoose.Types.ObjectId(id.trim()),
      resolution: { usedJwt: true, usedHeader: false, usedEnvFallback: false },
    };
  }

  const headerRaw = req.header('x-public-user-id');
  const env = getEnv();

  let ownerUserId = null;
  let usedHeader = false;
  let usedEnvFallback = false;

  if (typeof headerRaw === 'string' && mongoose.Types.ObjectId.isValid(headerRaw.trim())) {
    ownerUserId = new mongoose.Types.ObjectId(headerRaw.trim());
    usedHeader = true;
  } else if (
    typeof env.PUBLIC_API_STANDALONE_USER_ID === 'string' &&
    mongoose.Types.ObjectId.isValid(env.PUBLIC_API_STANDALONE_USER_ID.trim())
  ) {
    ownerUserId = new mongoose.Types.ObjectId(env.PUBLIC_API_STANDALONE_USER_ID.trim());
    usedEnvFallback = true;
  }

  return {
    ownerUserId,
    resolution: { usedJwt: false, usedHeader, usedEnvFallback },
  };
}
