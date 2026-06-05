/**
 * Barrel for HTTP / domain errors (re-exports from `src/core/errors`).
 * Prefer importing from `src/core/errors/app-error.js` in core modules.
 */
export {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from './core/errors/app-error.js';
