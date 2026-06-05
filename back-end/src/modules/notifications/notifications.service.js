import mongoose from 'mongoose';
import { notificationRepository } from '../../../database/repositories/notification.repository.js';
import { notificationUserStateRepository } from '../../../database/repositories/notification-user-state.repository.js';
import { UserModel } from '../../../database/models/user.model.js';
import { serializeInboxNotification, serializeNotification } from './notification.serializer.js';
import { toOffsetLimit } from '../shared/query/pagination.js';
import { NotFoundError, UnauthorizedError } from '../../core/errors/app-error.js';
import { enqueue } from '../../jobs/queue-registry.js';
import { QUEUE } from '../../jobs/queue-names.js';
import { getLogger } from '../../config/logger.js';

export class NotificationsService {
  /**
   * @param {{
   *   notifications?: import('../../../database/repositories/notification.repository.js').NotificationRepository,
   *   userStates?: import('../../../database/repositories/notification-user-state.repository.js').NotificationUserStateRepository,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.notifications = deps.notifications ?? notificationRepository;
    this.userStates = deps.userStates ?? notificationUserStateRepository;
  }

  /**
   * @param {import('zod').infer<typeof import('./notifications.validation.js').listNotificationsQuerySchema>} query
   * @param {{ ownerUserId: import('mongoose').Types.ObjectId | null }} recipient
   */
  async list(query, recipient) {
    const { skip, limit } = toOffsetLimit(query);

    if (query.view === 'directory') {
      const { items, total } = await this.notifications.findPage({
        skip,
        limit,
        recipientRoleKey: query.recipientRoleKey,
        sort: query.sort,
        search: query.search,
        from: query.from,
        to: query.to,
      });
      return {
        items: items.map((n) => serializeNotification(n)),
        page: query.page,
        limit: query.limit,
        total,
      };
    }

    const ownerId = recipient.ownerUserId ? String(recipient.ownerUserId) : null;
    const dismissed = ownerId ? await this.userStates.listDismissedNotificationIds(ownerId) : [];
    const { items, total } = await this.notifications.findPageForPublicInbox({
      skip,
      limit,
      sort: query.sort,
      search: query.search,
      from: query.from,
      to: query.to,
      recipientUserId: ownerId,
      excludeNotificationIds: dismissed,
    });

    const states =
      ownerId && items.length
        ? await this.userStates.findByUserAndNotificationIds(
            ownerId,
            items.map((n) => String(n._id)),
          )
        : [];
    const stateByNid = new Map(states.map((s) => [String(s.notificationId), s]));

    return {
      items: items.map((n) => serializeInboxNotification(n, stateByNid.get(String(n._id)))),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {import('zod').infer<typeof import('./notifications.validation.js').createNotificationBodySchema>} body
   */
  async create(body) {
    const doc = {
      title: body.title,
      body: body.body,
      channel: body.channel,
      recipientRoleKey: body.recipientRoleKey ?? null,
      recipientUserId:
        body.recipientUserId && mongoose.Types.ObjectId.isValid(body.recipientUserId)
          ? new mongoose.Types.ObjectId(body.recipientUserId)
          : null,
      metadata: body.metadata,
    };
    const created = await this.notifications.create(doc);

    // Phase 6: fan out to device push tokens in the background. Non-fatal on failure.
    this.#enqueueFanout(created).catch((err) =>
      getLogger().warn({ err, id: String(created._id) }, 'notifications.fanout_enqueue_failed'),
    );

    return serializeNotification(created);
  }

  /**
   * Resolve recipient user ids for the fan-out job.
   *   - Direct `recipientUserId` → that single user.
   *   - `recipientRoleKey` broadcast → every active user with that role (capped to 50k per job
   *     to keep BullMQ payloads bounded; beyond that a dedicated broadcast pipeline is required).
   *
   * @param {{ _id: unknown, title: string, body: string, channel: string, recipientUserId?: unknown, recipientRoleKey?: string | null, metadata?: unknown }} doc
   */
  async #enqueueFanout(doc) {
    // Skip channels that are not in-app push (email is handled elsewhere).
    if (doc.channel && doc.channel !== 'in_app' && doc.channel !== 'push') {
      return;
    }

    /** @type {string[]} */
    let recipientUserIds = [];
    if (doc.recipientUserId) {
      recipientUserIds = [String(doc.recipientUserId)];
    } else if (doc.recipientRoleKey) {
      const rows = await UserModel.find({
        roleKey: doc.recipientRoleKey,
        isDeleted: { $ne: true },
        status: 'active',
        deactivatedAt: null,
      })
        .limit(50_000)
        .select({ _id: 1 })
        .lean();
      recipientUserIds = rows.map((r) => String(r._id));
    }

    if (recipientUserIds.length === 0) return;

    await enqueue(QUEUE.NOTIFICATIONS_FANOUT, 'in-app-broadcast', {
      recipientUserIds,
      title: doc.title,
      body: doc.body,
      data: {
        notificationId: String(doc._id),
        ...(doc.metadata && typeof doc.metadata === 'object' ? doc.metadata : {}),
      },
    });
  }

  /**
   * @param {string} id
   * @param {{ ownerUserId: import('mongoose').Types.ObjectId | null }} recipient
   */
  async markRead(id, recipient) {
    if (!recipient.ownerUserId) {
      throw new UnauthorizedError('Authentication required to mark notifications read');
    }
    const uid = String(recipient.ownerUserId);
    const row = await this.notifications.findByIdVisibleInPublicInbox(id, uid);
    if (!row) throw new NotFoundError('Notification not found');

    if (row.recipientUserId) {
      if (String(row.recipientUserId) !== uid) throw new NotFoundError('Notification not found');
      const updated = await this.notifications.markDirectReadById(id);
      return serializeInboxNotification(updated ?? row, await this.#state(uid, id));
    }

    await this.userStates.upsertRead(uid, id);
    const fresh = await this.notifications.findById(id);
    return serializeInboxNotification(fresh ?? row, await this.#state(uid, id));
  }

  /**
   * @param {{ ownerUserId: import('mongoose').Types.ObjectId | null }} recipient
   */
  async markAllRead(recipient) {
    if (!recipient.ownerUserId) {
      throw new UnauthorizedError('Authentication required to mark notifications read');
    }
    const uid = String(recipient.ownerUserId);
    const dismissed = await this.userStates.listDismissedNotificationIds(uid);
    await this.notifications.markAllDirectReadForUser(uid);
    const broadcastIds = await this.notifications.listBroadcastInboxIdsForUser({
      recipientUserId: uid,
      excludeNotificationIds: dismissed,
    });
    await this.userStates.bulkUpsertRead(uid, broadcastIds);
    return { ok: true, broadcastMarked: broadcastIds.length };
  }

  /**
   * Per-user dismiss from inbox when a recipient is known; otherwise archives the notification (global soft delete).
   *
   * @param {string} id
   * @param {{ ownerUserId: import('mongoose').Types.ObjectId | null }} recipient
   */
  async remove(id, recipient) {
    if (recipient.ownerUserId) {
      const uid = String(recipient.ownerUserId);
      const row = await this.notifications.findByIdVisibleInPublicInbox(id, uid);
      if (!row) throw new NotFoundError('Notification not found');
      await this.userStates.upsertDismiss(uid, id);
      return { ok: true, mode: 'dismissed' };
    }

    const archived = await this.notifications.softDeleteById(id);
    if (!archived) throw new NotFoundError('Notification not found');
    return { ok: true, mode: 'archived', notification: serializeNotification(archived) };
  }

  /**
   * @param {{ ownerUserId: import('mongoose').Types.ObjectId | null }} recipient
   */
  async badgeCount(recipient) {
    if (recipient.ownerUserId) {
      const count = await this.notifications.countUnreadInboxWithUserState({
        recipientUserId: String(recipient.ownerUserId),
      });
      return { count };
    }
    const count = await this.notifications.countUnreadForPublicInbox({ recipientUserId: null });
    return { count };
  }

  /**
   * @param {string} userId
   * @param {string} notificationId
   */
  async #state(userId, notificationId) {
    const [row] = await this.userStates.findByUserAndNotificationIds(userId, [notificationId]);
    return row ?? null;
  }
}

export const notificationsService = new NotificationsService();
