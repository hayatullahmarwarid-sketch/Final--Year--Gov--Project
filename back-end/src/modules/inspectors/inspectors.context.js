import mongoose from 'mongoose';
import { isRbacBypassed } from '../../middlewares/authorize.middleware.js';
import { getRequestContext } from '../../middlewares/request-context.middleware.js';

/**
 * Resolves the inspector user id for this request.
 * Precedence: authenticated actor (`req.context.actor.id` from JWT), then `X-Inspector-User-Id`
 * only when `RBAC_ENFORCED=false` (local dev bypass).
 *
 * @param {import('express').Request} req
 * @returns {string | null}
 */
export function resolveInspectorUserId(req) {
  const ctx = getRequestContext(req);
  const actor = ctx.actor;
  const actorId =
    actor && typeof actor === 'object' && 'id' in actor && typeof /** @type {{ id?: unknown }} */ (actor).id === 'string'
      ? /** @type {{ id: string }} */ (actor).id
      : null;
  if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
    return actorId;
  }

  if (!isRbacBypassed()) {
    return null;
  }

  const header = req.header('x-inspector-user-id');
  if (typeof header === 'string' && header.trim()) {
    const t = header.trim();
    if (mongoose.Types.ObjectId.isValid(t)) return t;
  }

  return null;
}

/**
 * @param {import('express').Request} req
 * @returns {{ inspectorUserId: string, authState: 'anonymous' | 'authenticated' }}
 */
export function getInspectorBinding(req) {
  const ctx = getRequestContext(req);
  const authState = ctx.auth?.state === 'authenticated' ? 'authenticated' : 'anonymous';
  const inspectorUserId = resolveInspectorUserId(req);
  return { inspectorUserId: inspectorUserId ?? '', authState };
}
