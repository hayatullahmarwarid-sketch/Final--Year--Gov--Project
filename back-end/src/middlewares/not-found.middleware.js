import { NotFoundError } from '../core/errors/app-error.js';

export function notFoundMiddleware() {
  return (req, _res, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  };
}
