import mongoose from 'mongoose';

import { resolvePublicOwnerUserIdentity } from '../../public-users/lib/resolve-public-user-identity.js';

/**
 * Resolves optional inbox recipient: public JWT / public headers / env, then legacy `X-User-Id`.
 * @typedef {object} NotificationRecipientContext
 * @property {import('mongoose').Types.ObjectId | null} ownerUserId
 */

/**
 * @param {import('express').Request} req
 * @returns {NotificationRecipientContext}
 */
export function getNotificationRecipient(req) {
  if (!req.notificationRecipient) {
    throw new Error('notificationRecipientMiddleware must run before handlers that use req.notificationRecipient');
  }
  return req.notificationRecipient;
}

export function notificationRecipientMiddleware() {
  return (req, _res, next) => {
    let { ownerUserId } = resolvePublicOwnerUserIdentity(req);

    if (!ownerUserId) {
      const legacy = req.header('x-user-id');
      if (typeof legacy === 'string' && mongoose.Types.ObjectId.isValid(legacy.trim())) {
        ownerUserId = new mongoose.Types.ObjectId(legacy.trim());
      }
    }

    // Staff JWTs (e.g. decree upload department): same inbox + per-user read state as the mobile app.
    if (!ownerUserId && req.user?.id) {
      const raw = String(req.user.id).trim();
      if (mongoose.Types.ObjectId.isValid(raw)) {
        ownerUserId = new mongoose.Types.ObjectId(raw);
      }
    }

    /** @type {NotificationRecipientContext} */
    req.notificationRecipient = { ownerUserId };
    next();
  };
}
