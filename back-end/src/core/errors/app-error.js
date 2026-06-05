import { HttpStatus } from './http-status.js';

export class AppError extends Error {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {number} [options.statusCode]
   * @param {string} [options.code]
   * @param {unknown} [options.details]
   * @param {boolean} [options.isOperational]
   * @param {string} [options.messageKey] i18n catalog key (Phase 12). When set, the error handler
   *   renders the localized message from the request's locale.
   * @param {Record<string, string | number>} [options.messageVars]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = options.statusCode ?? HttpStatus.BAD_REQUEST;
    this.code = options.code ?? 'APP_ERROR';
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.messageKey = options.messageKey;
    this.messageVars = options.messageVars;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details) {
    super(message, {
      statusCode: HttpStatus.NOT_FOUND,
      code: 'NOT_FOUND',
      details,
      isOperational: true,
    });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details) {
    super(message, {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'VALIDATION_ERROR',
      details,
      isOperational: true,
    });
    this.name = 'ValidationError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details) {
    super(message, {
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'BAD_REQUEST',
      details,
      isOperational: true,
    });
    this.name = 'BadRequestError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details) {
    super(message, {
      statusCode: HttpStatus.FORBIDDEN,
      code: 'FORBIDDEN',
      details,
      isOperational: true,
    });
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details) {
    super(message, {
      statusCode: HttpStatus.CONFLICT,
      code: 'CONFLICT',
      details,
      isOperational: true,
    });
    this.name = 'ConflictError';
  }
}

/** 401 — missing or invalid credentials (see `authenticate` / `resolveBearerJwtMiddleware`). */
export class UnauthorizedError extends AppError {
  /**
   * @param {string} [message]
   * @param {unknown} [details] Structured error details for clients (not the options bag).
   * @param {{ code?: string }} [opts] Optional `{ code }` override; omit when `details` alone is enough.
   */
  constructor(message = 'Unauthorized', details, opts = {}) {
    super(message, {
      statusCode: HttpStatus.UNAUTHORIZED,
      code: typeof opts?.code === 'string' ? opts.code : 'UNAUTHORIZED',
      details,
      isOperational: true,
    });
    this.name = 'UnauthorizedError';
  }
}
