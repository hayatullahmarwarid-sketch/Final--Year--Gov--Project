import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getEnv } from '../config/env.js';
import { getRedis } from '../config/redis.js';
import { getLogger } from '../config/logger.js';
import { HttpStatus } from '../core/errors/http-status.js';
import { sendError } from '../utils/api-response.js';

/**
 * Choose the best store given runtime env: Redis if available, else memory (default).
 * Keyed per-middleware with `prefix` so different buckets don't collide.
 * @param {string} prefix
 */
function buildStore(prefix) {
  const redis = getRedis();
  if (!redis) return undefined;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    // @ts-expect-error rate-limit-redis accepts any ioredis-compatible sendCommand
    sendCommand: (...args) => redis.call(...args),
  });
}

/**
 * Standard JSON envelope for 429s (same shape as `sendError`).
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {unknown} _next
 * @param {{ statusCode: number }} options
 */
function jsonHandler(_req, res, _next, options) {
  return sendError(res, {
    code: 'RATE_LIMITED',
    message: 'Too many requests — slow down and try again shortly',
    statusCode: options.statusCode ?? HttpStatus.TOO_MANY_REQUESTS,
  });
}

/**
 * Key by the authenticated user id when available, else by normalized IP.
 * @param {import('express').Request} req
 */
function userOrIpKey(req) {
  const uid = req.user?.id;
  if (uid && typeof uid === 'string') return `u:${uid}`;
  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

/**
 * Returns a pass-through when rate limiting is globally disabled. Otherwise builds a limiter
 * with the given policy (prefix must be unique per bucket).
 *
 * @param {{
 *   prefix: string,
 *   windowMs: number,
 *   max: number,
 *   keyGenerator?: (req: import('express').Request) => string,
 *   skipSuccessfulRequests?: boolean,
 * }} policy
 * @returns {import('express').RequestHandler}
 */
function make(policy) {
  const env = getEnv();
  if (!env.RATE_LIMIT_ENABLED) {
    return (_req, _res, next) => next();
  }

  const store = buildStore(policy.prefix);
  if (!store) {
    getLogger().debug({ prefix: policy.prefix }, 'rate-limit.using_memory_store');
  }

  return rateLimit({
    windowMs: policy.windowMs,
    max: policy.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: policy.keyGenerator ?? userOrIpKey,
    skipSuccessfulRequests: Boolean(policy.skipSuccessfulRequests),
    handler: jsonHandler,
    store,
  });
}

/** Global soft bucket across the whole API. Generous, mostly catches runaway loops. */
export const globalApiLimiter = () =>
  make({
    prefix: 'global',
    windowMs: 60_000,
    max: 600,
  });

/** Tight bucket on `/auth/login` — fails count, successes don't. */
export const loginLimiter = () =>
  make({
    prefix: 'login',
    windowMs: 15 * 60_000,
    max: 20,
    skipSuccessfulRequests: true,
  });

/** Tight bucket on public registration to throttle sign-up floods. */
export const registerLimiter = () =>
  make({
    prefix: 'register',
    windowMs: 60 * 60_000,
    max: 10,
  });

/** Tight bucket on anything that sends email (reset + verification). */
export const emailSendLimiter = () =>
  make({
    prefix: 'email',
    windowMs: 60 * 60_000,
    max: 5,
  });

/** Moderate bucket on refresh-token rotation — protects against token spraying. */
export const refreshLimiter = () =>
  make({
    prefix: 'refresh',
    windowMs: 15 * 60_000,
    max: 120,
  });
