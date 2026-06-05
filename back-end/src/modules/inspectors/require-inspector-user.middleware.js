import { UnauthorizedError } from '../../core/errors/app-error.js';
import { isRbacBypassed } from '../../middlewares/authorize.middleware.js';
import { resolveInspectorUserId } from './inspectors.context.js';

/**
 * Ensures an inspector user id is available on the request (`req.inspectorUserId`).
 * Uses JWT actor id when RBAC is enforced; with `RBAC_ENFORCED=false`, allows `X-Inspector-User-Id`.
 */
export function requireInspectorUserMiddleware(req, _res, next) {
  const id = resolveInspectorUserId(req);
  if (!id) {
    const hint = isRbacBypassed()
      ? 'Send `Authorization: Bearer <token>` or `X-Inspector-User-Id` (Mongo ObjectId).'
      : 'Send `Authorization: Bearer <token>` for an inspector-class account.';
    return next(
      new UnauthorizedError(`Inspector identity is required. ${hint}`, {
        integrationHeader: isRbacBypassed() ? 'X-Inspector-User-Id' : undefined,
      }),
    );
  }
  req.inspectorUserId = id;
  next();
}
