import { ZodError } from 'zod';
import { ValidationError } from '../core/errors/app-error.js';

/**
 * Validates req.body / req.query / req.params with Zod schemas.
 * Parsed values are attached to `req.validated` for controllers.
 *
 * For list endpoints, compose query schemas from `extendListQuery` / `listQueryBaseSchema`
 * (`src/modules/shared/query/list-query.schema.js`).
 *
 * @param {object} schemas
 * @param {import('zod').ZodTypeAny} [schemas.body]
 * @param {import('zod').ZodTypeAny} [schemas.query]
 * @param {import('zod').ZodTypeAny} [schemas.params]
 */
export function validateRequest(schemas) {
  return (req, _res, next) => {
    try {
      req.validated = req.validated ?? {};
      if (schemas.body) req.validated.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) req.validated.query = schemas.query.parse(req.query ?? {});
      if (schemas.params) req.validated.params = schemas.params.parse(req.params ?? {});
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new ValidationError('Request validation failed', err.flatten()));
      }
      return next(err);
    }
  };
}
