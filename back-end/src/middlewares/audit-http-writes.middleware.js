import mongoose from 'mongoose';
import { auditService } from '../services/audit/auditService.js';
import { getLogger } from '../config/logger.js';

const SKIP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths (suffix match on normalized URL) that generate noise without security value. */
const SKIP_PATH_SUFFIXES = [
  '/health',
  '/healthz',
  '/ready',
  '/live',
  '/metrics',
  '/favicon.ico',
  '/.well-known',
];

/** Substrings: skip blanket http.write audits for static delivery noise. */
const SKIP_PATH_CONTAINS = ['/static/', '/assets/'];

/**
 * @param {import('express').Request} req
 */
function shouldSkipAuditPath(req) {
  const raw = `${req.baseUrl || ''}${req.path || ''}` || req.originalUrl?.split('?')[0] || '';
  const norm = raw.split('?')[0].toLowerCase();
  if (SKIP_PATH_SUFFIXES.some((s) => norm.endsWith(s) || norm.includes(`${s}/`))) return true;
  if (SKIP_PATH_CONTAINS.some((s) => norm.includes(s))) return true;
  return false;
}

/**
 * After each mutating HTTP response, append a coarse `http.write` audit row (MVP blanket coverage).
 * Domain-specific handlers may emit additional rows with richer `actionKey`s.
 *
 * @returns {import('express').RequestHandler}
 */
export function auditHttpWritesMiddleware() {
  return (req, res, next) => {
    if (SKIP_METHODS.has(req.method)) {
      return next();
    }
    res.on('finish', () => {
      if (shouldSkipAuditPath(req)) return;
      // Guard: `finish` can fire late (in tests) after Mongoose has been disconnected.
      // Skipping when the connection is not ready avoids MongoClientClosedError spam.
      if (mongoose.connection.readyState !== 1) return;
      auditService.logHttpWrite(req, res.statusCode).catch((err) => {
        getLogger().debug({ err }, 'audit_log.http_write_skipped');
      });
    });
    next();
  };
}
