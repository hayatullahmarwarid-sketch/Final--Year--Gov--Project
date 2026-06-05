import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { getEnv } from '../config/env.js';
import { getLogger } from '../config/logger.js';
import { UserModel as User } from '../../database/models/user.model.js';
import { RefreshTokenModel } from '../../database/models/refresh-token.model.js';

const BCRYPT_COST = 10;

/**
 * @param {string} plain
 * @returns {Promise<string>}
 */
export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/**
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * @param {string} plainRefreshToken
 * @returns {string}
 */
function hashRefreshPlain(plainRefreshToken) {
  const { JWT_REFRESH_SECRET } = getEnv();
  return createHmac('sha256', JWT_REFRESH_SECRET).update(plainRefreshToken).digest('hex');
}

/**
 * @param {Record<string, unknown>} payload Signed claims (e.g. `sub`, `email`, `roleKey`).
 * @param {string} [expiresIn] jwt `expiresIn` override; defaults to `ACCESS_TOKEN_TTL_SECONDS` from env.
 * @returns {string}
 */
export function generateToken(payload, expiresIn) {
  const env = getEnv();
  const ttl = expiresIn ?? `${env.ACCESS_TOKEN_TTL_SECONDS}s`;
  const { JWT_SECRET } = env;
  return jwt.sign({ ...payload, typ: 'access' }, JWT_SECRET, { expiresIn: ttl });
}

/**
 * @param {string} token
 * @returns {import('jsonwebtoken').JwtPayload & { typ?: string }}
 */
export function verifyToken(token) {
  const { JWT_SECRET } = getEnv();
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === 'string' || decoded.typ !== 'access') {
    throw new jwt.JsonWebTokenError('Invalid access token');
  }
  return decoded;
}

/**
 * Creates an opaque refresh token, stores a hash in MongoDB, returns the plain token once.
 *
 * When `familyId` is provided (rotation), the new row joins the existing family so that
 * reuse of any sibling token revokes the whole family.
 *
 * @param {string} userId Mongo ObjectId string
 * @param {string | null | undefined} deviceInfo Optional client/device label
 * @param {{ familyId?: string | null }} [options]
 * @returns {Promise<{ plain: string, familyId: string, tokenId: string }>}
 */
export async function issueRefreshToken(userId, deviceInfo, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId for refresh token');
  }
  const env = getEnv();
  const plain = randomBytes(48).toString('base64url');
  const tokenHash = hashRefreshPlain(plain);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);
  const familyId = options.familyId && typeof options.familyId === 'string' ? options.familyId : randomUUID();

  const doc = await RefreshTokenModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    token: tokenHash,
    familyId,
    deviceInfo: deviceInfo?.trim() ? deviceInfo.trim().slice(0, 500) : null,
    expiresAt,
    revoked: false,
  });

  return { plain, familyId, tokenId: String(doc._id) };
}

/**
 * Back-compat wrapper for callers that still want the plain token only.
 * @param {string} userId
 * @param {string | null | undefined} deviceInfo
 * @returns {Promise<string>}
 */
export async function generateRefreshToken(userId, deviceInfo) {
  const { plain } = await issueRefreshToken(userId, deviceInfo);
  return plain;
}

/**
 * Validates a plain refresh token and returns the associated user + row id + family.
 *
 * Reuse-detection contract: if the presented token matches a row with `revoked: true`,
 * the whole family is revoked and `UnauthorizedError` is thrown. Callers must treat
 * this as a compromised session and require a fresh login.
 *
 * @param {string} plainToken
 * @returns {Promise<{
 *   user: Record<string, unknown> & { _id: mongoose.Types.ObjectId; roleKey?: string; email?: string };
 *   refreshTokenId: string;
 *   familyId: string | null;
 *   deviceInfo: string | null;
 * }>}
 */
export async function verifyRefreshToken(plainToken) {
  const tokenHash = hashRefreshPlain(plainToken);
  const doc = await RefreshTokenModel.findOne({ token: tokenHash }).lean();

  if (!doc) {
    throw new jwt.JsonWebTokenError('Invalid refresh token');
  }

  // Reuse detection: a known-but-revoked token means someone replayed. Burn the family.
  if (doc.revoked) {
    if (doc.familyId) {
      await RefreshTokenModel.updateMany(
        { familyId: doc.familyId, revoked: false },
        { $set: { revoked: true, revokedReason: 'reuse_detected', revokedAt: new Date() } },
      );
    }
    getLogger().warn(
      { userId: String(doc.userId), familyId: doc.familyId, tokenId: String(doc._id) },
      'auth.refresh.reuse_detected',
    );
    throw new jwt.JsonWebTokenError('Refresh token reuse detected');
  }

  if (doc.expiresAt && doc.expiresAt.getTime() <= Date.now()) {
    throw new jwt.JsonWebTokenError('Refresh token expired');
  }

  const user = await User.findOne({
    _id: doc.userId,
    isDeleted: { $ne: true },
    status: 'active',
    deactivatedAt: null,
  }).lean();

  if (!user) {
    throw new jwt.JsonWebTokenError('Invalid refresh token');
  }

  return {
    user,
    refreshTokenId: String(doc._id),
    familyId: doc.familyId ?? null,
    deviceInfo: doc.deviceInfo ?? null,
  };
}

/**
 * Mark a single row revoked (used during rotation).
 * @param {string} tokenId `RefreshToken` document `_id`
 * @param {{ reason?: 'rotated' | 'logout' | 'logout_all' | 'admin' | 'reuse_detected' }} [options]
 * @returns {Promise<{ ok: boolean }>}
 */
export async function revokeRefreshToken(tokenId, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(tokenId)) {
    return { ok: false };
  }
  const res = await RefreshTokenModel.updateOne(
    { _id: new mongoose.Types.ObjectId(tokenId), revoked: false },
    { $set: { revoked: true, revokedReason: options.reason ?? 'rotated', revokedAt: new Date() } },
  );
  return { ok: res.modifiedCount > 0 };
}

/**
 * Revokes a session by opaque refresh token (used for logout).
 * @param {string} plainToken
 * @returns {Promise<{ ok: boolean }>}
 */
export async function revokeRefreshTokenByPlain(plainToken) {
  const tokenHash = hashRefreshPlain(plainToken);
  const res = await RefreshTokenModel.updateOne(
    { token: tokenHash, revoked: false },
    { $set: { revoked: true, revokedReason: 'logout', revokedAt: new Date() } },
  );
  return { ok: res.modifiedCount > 0 };
}

/**
 * @param {string} userId Mongo ObjectId string
 * @returns {Promise<void>}
 */
export async function revokeAllUserTokens(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return;
  await RefreshTokenModel.updateMany(
    { userId: new mongoose.Types.ObjectId(userId), revoked: false },
    { $set: { revoked: true, revokedReason: 'logout_all', revokedAt: new Date() } },
  );
}
