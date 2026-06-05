import { createHash, createHmac } from 'node:crypto';
import mongoose from 'mongoose';
import { getEnv } from '../../config/env.js';
import { getLogger } from '../../config/logger.js';
import { auditLogRepository } from '../../../database/repositories/audit-log.repository.js';

const SENSITIVE_KEY_RE =
  /^(password|pass|token|secret|authorization|cookie|refreshToken|accessToken|passwordHash)$/i;
const PII_EMAIL_KEYS = /^(email|userEmail|contactEmail)$/i;
const PII_PHONE_KEYS = /phone|e164|mobile|whatsapp/i;

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Stable JSON for hashing (sorted keys).
 * @param {unknown} value
 */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = /** @type {Record<string, unknown>} */ (value);
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/**
 * Recursively redact passwords, tokens, and coarse-mask emails / phones in audit payloads.
 * @param {unknown} input
 * @param {number} [depth]
 * @returns {unknown}
 */
export function redactForAudit(input, depth = 0) {
  if (depth > 12) return '[truncated]';
  if (input === null || input === undefined) return input;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => redactForAudit(item, depth + 1));
  }
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      out[key] = '[redacted]';
      continue;
    }
    if (PII_EMAIL_KEYS.test(key) && typeof value === 'string') {
      out[key] = emailFingerprint(value);
      continue;
    }
    if (PII_PHONE_KEYS.test(key) && typeof value === 'string') {
      out[key] = '[phone:redacted]';
      continue;
    }
    if (isPlainObject(value)) {
      out[key] = redactForAudit(value, depth + 1);
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = redactForAudit(value, depth + 1);
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * One-way fingerprint for correlating events without storing raw email.
 * @param {string} email
 */
export function emailFingerprint(email) {
  const norm = String(email).trim().toLowerCase();
  if (!norm) return null;
  const h = createHash('sha256').update(norm).digest('hex');
  return `email_sha256:${h.slice(0, 16)}…`;
}

/**
 * @param {import('express').Request | undefined | null} req
 */
function clientIp(req) {
  if (!req) return null;
  const xf = req.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const ip = req.ip || req.socket?.remoteAddress;
  return typeof ip === 'string' ? ip.slice(0, 128) : null;
}

/**
 * @param {import('express').Request | undefined | null} req
 */
function clientUserAgent(req) {
  if (!req) return null;
  const ua = req.get('user-agent');
  return typeof ua === 'string' ? ua.slice(0, 2000) : null;
}

/**
 * @param {{
 *   actionKey: string,
 *   entityType: string,
 *   entityId: string,
 *   summary?: string | null,
 *   payload?: unknown,
 *   actorUserId?: string | null,
 *   actorRoleKey?: string | null,
 *   actorType?: 'user' | 'system' | 'integration',
 *   correlationId?: string | null,
 *   ipAddress?: string | null,
 *   userAgent?: string | null,
 *   occurredAt?: Date,
 * }} row
 */
function computeIntegrityHash(row) {
  const secret = getEnv().AUDIT_LOG_INTEGRITY_SECRET;
  if (!secret) return null;
  const occurredAt = (row.occurredAt ?? new Date()).toISOString();
  const basis = [
    row.actionKey,
    row.entityType,
    row.entityId,
    occurredAt,
    stableStringify(redactForAudit(row.payload ?? {})),
  ].join('|');
  return createHmac('sha256', secret).update(basis).digest('hex');
}

export class AuditService {
  /**
   * Persists an audit row (PII-redacted payload, optional integrity HMAC).
   *
   * @param {string} action Dot-style key, e.g. `user.login`, `decree.update`
   * @param {{
   *   resourceType: string,
   *   resourceId: string,
   *   details?: unknown,
   *   summary?: string | null,
   *   req?: import('express').Request | null,
   *   actorUserId?: string | null,
   *   actorRoleKey?: string | null,
   *   actorType?: 'user' | 'system' | 'integration',
   *   correlationId?: string | null,
   *   ipAddress?: string | null,
   *   userAgent?: string | null,
   *   occurredAt?: Date,
   * }} options
   * @returns {Promise<void>}
   */
  async log(action, options) {
    const occurredAt = options.occurredAt ?? new Date();
    const payload = redactForAudit(options.details ?? {});

    const actorUserId =
      options.actorUserId !== undefined
        ? options.actorUserId
        : options.req?.user?.id && mongoose.Types.ObjectId.isValid(options.req.user.id)
          ? options.req.user.id
          : null;

    const actorRoleKey =
      options.actorRoleKey !== undefined
        ? options.actorRoleKey
        : typeof options.req?.user?.role === 'string'
          ? options.req.user.role
          : null;

    const actorType = options.actorType ?? 'user';

    const correlationId =
      options.correlationId ??
      (options.req?.context && typeof options.req.context.requestId === 'string'
        ? options.req.context.requestId
        : null);

    const row = {
      actionKey: action,
      entityType: options.resourceType,
      entityId: String(options.resourceId),
      summary: options.summary ?? null,
      payload,
      actorUserId: actorUserId ? new mongoose.Types.ObjectId(actorUserId) : null,
      actorRoleKey,
      actorType,
      correlationId,
      ipAddress: options.ipAddress ?? clientIp(options.req ?? undefined),
      userAgent: options.userAgent ?? clientUserAgent(options.req ?? undefined),
      occurredAt,
    };

    const integrityHash = computeIntegrityHash(row);

    // If Mongo is not connected (e.g. late `res.on('finish')` firing after test shutdown),
    // skip quietly rather than logging a noisy error for every audited request.
    if (mongoose.connection.readyState !== 1) {
      getLogger().debug({ action }, 'audit_log.skipped_disconnected');
      return;
    }

    try {
      await auditLogRepository.create({ ...row, integrityHash });
    } catch (err) {
      // Swallow MongoClientClosedError — happens during graceful shutdown races.
      if (err && typeof err === 'object' && 'name' in err && err.name === 'MongoClientClosedError') {
        getLogger().debug({ err, action }, 'audit_log.skipped_closed');
        return;
      }
      getLogger().error({ err, action }, 'audit_log.persist_failed');
    }
  }

  /**
   * Convenience: same as `log` with `req` wired for actor, IP, UA, correlation id.
   * @param {import('express').Request} req
   * @param {string} action
   * @param {Omit<Parameters<AuditService['log']>[1], 'req'>} options
   */
  async logFromRequest(req, action, options) {
    return this.log(action, { ...options, req });
  }

  /**
   * Generic write audit for non-GET traffic (MVP blanket coverage).
   * @param {import('express').Request} req
   * @param {number} statusCode
   */
  async logHttpWrite(req, statusCode) {
    const path = `${req.baseUrl || ''}${req.path || ''}` || req.originalUrl?.split('?')[0] || '';
    const shortPath = path.slice(0, 512) || '-';
    const summary = `${req.method} ${shortPath} — ${statusCode}`;
    return this.logFromRequest(req, 'http.write', {
      resourceType: 'HttpRequest',
      resourceId: shortPath,
      summary,
      details: {
        method: req.method,
        path: shortPath,
        statusCode,
      },
    });
  }
}

export const auditService = new AuditService();
