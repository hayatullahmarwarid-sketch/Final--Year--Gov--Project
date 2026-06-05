import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError, ConflictError, UnauthorizedError } from '../core/errors/app-error.js';
import { HttpStatus } from '../core/errors/http-status.js';
import { getLogger } from '../config/logger.js';
import { sendError } from '../utils/api-response.js';
import { auditService, emailFingerprint } from '../services/audit/auditService.js';
import { getErrorReporter } from '../services/telemetry/get-error-reporter.js';

function isMongooseDuplicateKeyError(err) {
  return err instanceof mongoose.mongo.MongoServerError && err.code === 11000;
}

/**
 * @param {import('express').Request} req
 */
function mountedPath(req) {
  const base = typeof req.baseUrl === 'string' ? req.baseUrl : '';
  const p = typeof req.path === 'string' ? req.path : '';
  return `${base}${p}`;
}

/**
 * Express requires arity 4 for error middleware; `_next` is unused by design.
 * @param {unknown} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandlerMiddleware(err, req, res, _next) {
  const log = getLogger().child({ requestId: req.context?.requestId });
  const routePath = mountedPath(req);

  if (err instanceof UnauthorizedError && req.method === 'POST') {
    if (routePath.endsWith('/login')) {
      const email = req.body && typeof req.body.email === 'string' ? req.body.email : '';
      void auditService.logFromRequest(req, 'user.login', {
        resourceType: 'User',
        resourceId: '-',
        summary: 'Login failed',
        details: { outcome: 'failure', emailFingerprint: emailFingerprint(email) },
      });
    } else if (routePath.endsWith('/refresh')) {
      void auditService.logFromRequest(req, 'auth.refresh', {
        resourceType: 'Session',
        resourceId: '-',
        summary: 'Refresh token rejected',
        details: { outcome: 'failure' },
      });
    }
  }

  if (err instanceof ConflictError && req.method === 'POST' && routePath.endsWith('/register')) {
    const email = req.body && typeof req.body.email === 'string' ? req.body.email : '';
    void auditService.logFromRequest(req, 'user.register', {
      resourceType: 'User',
      resourceId: '-',
      summary: 'Registration failed (duplicate)',
      details: { outcome: 'failure', reason: 'duplicate', emailFingerprint: emailFingerprint(email) },
    });
  }

  if (err instanceof AppError) {
    if (!err.isOperational) log.error({ err }, 'Non-operational AppError');
    else log.warn({ err: { message: err.message, code: err.code } }, 'Handled AppError');

    // Phase 12: render a localized message when the error carries a messageKey.
    const localized =
      err.messageKey && typeof /** @type {any} */ (req).t === 'function'
        ? /** @type {any} */ (req).t(err.messageKey, err.messageVars)
        : err.message;

    return sendError(res, {
      code: err.code,
      message: localized,
      details: err.details,
      statusCode: err.statusCode,
    });
  }

  if (err instanceof ZodError) {
    log.warn({ err: err.flatten() }, 'Unhandled ZodError (should use validateRequest)');
    return sendError(res, {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.flatten(),
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    log.warn({ err: { message: err.message, path: err.path } }, 'CastError');
    return sendError(res, {
      code: 'INVALID_ID',
      message: 'Invalid identifier',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }

  // Mongoose 8+ often throws `BSONError` (not CastError) for bad ObjectId strings — was surfacing as 500.
  if (err instanceof Error && err.name === 'BSONError') {
    log.warn({ err: { message: err.message } }, 'BSONError');
    return sendError(res, {
      code: 'INVALID_ID',
      message: 'Invalid identifier',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }

  if (isMongooseDuplicateKeyError(err)) {
    log.warn({ err: { message: err.message } }, 'Duplicate key');
    return sendError(res, {
      code: 'DUPLICATE_KEY',
      message: 'Resource already exists',
      statusCode: HttpStatus.CONFLICT,
    });
  }

  log.error({ err }, 'Unhandled error');
  // Fire-and-forget error reporting (Noop by default; can be wired to Sentry later).
  getErrorReporter()
    .capture(err, {
      requestId: req.context?.requestId ?? null,
      userId: req.user?.id ?? null,
      route: routePath,
    })
    .catch(() => undefined);
  return sendError(res, {
    code: 'INTERNAL_ERROR',
    message: 'Unexpected server error',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  });
}
