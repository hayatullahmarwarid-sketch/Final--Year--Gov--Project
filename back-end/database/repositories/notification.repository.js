import mongoose from 'mongoose';
import { NotificationModel } from '../models/notification.model.js';
import { NotificationUserStateModel } from '../models/notification-user-state.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import { RoleKey } from '../../src/modules/shared/enums/roles.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class NotificationRepository extends BaseRepository {
  constructor() {
    super(NotificationModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   recipientRoleKey?: string,
   *   sort?: string,
   *   search?: string,
   *   from?: Date,
   *   to?: Date,
   * }} q
   */
  async findPage(q) {
    const filter = mergeFilters(
      q.recipientRoleKey ? { recipientRoleKey: q.recipientRoleKey } : undefined,
      buildSearchOrFilter(q.search, ['title', 'body']),
      buildDateRangeFilter(q.from, q.to, 'createdAt'),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'title'], { createdAt: -1 });

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * In-app feed for the public mobile persona: user-targeted, role-targeted (`public_user`), and broadcast rows.
   *
   * @param {{
   *   skip: number,
   *   limit: number,
   *   sort?: string,
   *   search?: string,
   *   from?: Date,
   *   to?: Date,
   *   recipientUserId?: string | null,
   * }} q
   */
  async findPageForPublicInbox(q) {
    const deletedFilter = { isDeleted: { $ne: true }, deletedAt: null };
    const recipientOr =
      q.recipientUserId && mongoose.Types.ObjectId.isValid(q.recipientUserId)
        ? {
            $or: [
              { recipientUserId: new mongoose.Types.ObjectId(q.recipientUserId) },
              { recipientUserId: null, recipientRoleKey: RoleKey.PUBLIC_USER },
              { recipientUserId: null, recipientRoleKey: null },
            ],
          }
        : {
            $or: [
              { recipientUserId: null, recipientRoleKey: RoleKey.PUBLIC_USER },
              { recipientUserId: null, recipientRoleKey: null },
            ],
          };

    const exclude =
      q.excludeNotificationIds?.length &&
      q.excludeNotificationIds.every((id) => mongoose.Types.ObjectId.isValid(String(id)))
        ? { _id: { $nin: q.excludeNotificationIds.map((id) => new mongoose.Types.ObjectId(String(id))) } }
        : {};

    const filter = mergeFilters(
      deletedFilter,
      recipientOr,
      exclude,
      buildSearchOrFilter(q.search, ['title', 'body']),
      buildDateRangeFilter(q.from, q.to, 'createdAt'),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'title'], { createdAt: -1 });

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * In-app feed for system administrators: direct + role-targeted (`system_admin`).
   *
   * @param {{
   *   skip: number,
   *   limit: number,
   *   sort?: string,
   *   search?: string,
   *   from?: Date,
   *   to?: Date,
   *   recipientUserId?: string | null,
   *   excludeNotificationIds?: string[],
   * }} q
   */
  async findPageForSystemAdminInbox(q) {
    const deletedFilter = { isDeleted: { $ne: true }, deletedAt: null };
    const recipientOr =
      q.recipientUserId && mongoose.Types.ObjectId.isValid(q.recipientUserId)
        ? {
            $or: [
              { recipientUserId: new mongoose.Types.ObjectId(q.recipientUserId) },
              { recipientUserId: null, recipientRoleKey: RoleKey.SYSTEM_ADMIN },
            ],
          }
        : {
            $or: [{ recipientUserId: null, recipientRoleKey: RoleKey.SYSTEM_ADMIN }],
          };

    const exclude =
      q.excludeNotificationIds?.length &&
      q.excludeNotificationIds.every((id) => mongoose.Types.ObjectId.isValid(String(id)))
        ? { _id: { $nin: q.excludeNotificationIds.map((id) => new mongoose.Types.ObjectId(String(id))) } }
        : {};

    const filter = mergeFilters(
      deletedFilter,
      recipientOr,
      exclude,
      buildSearchOrFilter(q.search, ['title', 'body']),
      buildDateRangeFilter(q.from, q.to, 'createdAt'),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'title'], { createdAt: -1 });

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * @param {string} id
   * @param {string | null} recipientUserId
   */
  async findByIdVisibleInSystemAdminInbox(id, recipientUserId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const deletedFilter = { isDeleted: { $ne: true }, deletedAt: null, _id: new mongoose.Types.ObjectId(id) };
    const recipientOr =
      recipientUserId && mongoose.Types.ObjectId.isValid(recipientUserId)
        ? {
            $or: [
              { recipientUserId: new mongoose.Types.ObjectId(recipientUserId) },
              { recipientUserId: null, recipientRoleKey: RoleKey.SYSTEM_ADMIN },
            ],
          }
        : { $or: [{ recipientUserId: null, recipientRoleKey: RoleKey.SYSTEM_ADMIN }] };
    return this.model.findOne(mergeFilters(deletedFilter, recipientOr)).lean();
  }

  /**
   * @param {{ recipientUserId: string, excludeNotificationIds?: string[] }} q
   */
  async listSystemAdminBroadcastInboxIdsForUser(q) {
    const exclude =
      q.excludeNotificationIds?.length &&
      q.excludeNotificationIds.every((id) => mongoose.Types.ObjectId.isValid(String(id)))
        ? { _id: { $nin: q.excludeNotificationIds.map((id) => new mongoose.Types.ObjectId(String(id))) } }
        : {};

    const rows = await this.model
      .find(
        mergeFilters(
          { isDeleted: { $ne: true }, deletedAt: null, recipientUserId: null, recipientRoleKey: RoleKey.SYSTEM_ADMIN },
          exclude,
        ),
      )
      .select({ _id: 1 })
      .lean();
    return rows.map((r) => String(r._id));
  }

  /**
   * @param {{ recipientUserId?: string | null }} q
   */
  async countUnreadForPublicInbox(q) {
    const deletedFilter = { isDeleted: { $ne: true }, deletedAt: null, readStatus: 'unread' };
    const recipientOr =
      q.recipientUserId && mongoose.Types.ObjectId.isValid(q.recipientUserId)
        ? {
            $or: [
              { recipientUserId: new mongoose.Types.ObjectId(q.recipientUserId) },
              { recipientUserId: null, recipientRoleKey: RoleKey.PUBLIC_USER },
              { recipientUserId: null, recipientRoleKey: null },
            ],
          }
        : {
            $or: [
              { recipientUserId: null, recipientRoleKey: RoleKey.PUBLIC_USER },
              { recipientUserId: null, recipientRoleKey: null },
            ],
          };

    return this.model.countDocuments(mergeFilters(deletedFilter, recipientOr));
  }

  /**
   * Accurate unread badge for a signed-in public inbox user (per-user read on shared rows).
   *
   * @param {{ recipientUserId: string }} q
   */
  async countUnreadInboxWithUserState(q) {
    const userOid = new mongoose.Types.ObjectId(q.recipientUserId);
    const stateColl = NotificationUserStateModel.collection.name;
    const recipientOr = {
      $or: [
        { recipientUserId: userOid },
        { recipientUserId: null, recipientRoleKey: RoleKey.PUBLIC_USER },
        { recipientUserId: null, recipientRoleKey: null },
      ],
    };

    const rows = await this.model
      .aggregate([
        {
          $match: mergeFilters(
            { isDeleted: { $ne: true }, deletedAt: null },
            recipientOr,
          ),
        },
        {
          $lookup: {
            from: stateColl,
            let: { nid: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$notificationId', '$$nid'] }, { $eq: ['$userId', userOid] }],
                  },
                },
              },
            ],
            as: '_userState',
          },
        },
        {
          $addFields: {
            userState: { $arrayElemAt: ['$_userState', 0] },
          },
        },
        {
          $match: {
            $expr: { $eq: [{ $ifNull: ['$userState.dismissedAt', null] }, null] },
          },
        },
        {
          $addFields: {
            effectiveRead: {
              $cond: {
                if: { $ne: ['$recipientUserId', null] },
                then: { $eq: ['$readStatus', 'read'] },
                else: { $ne: [{ $ifNull: ['$userState.readAt', null] }, null] },
              },
            },
          },
        },
        { $match: { effectiveRead: false } },
        { $count: 'c' },
      ])
      .exec();

    return rows[0]?.c ?? 0;
  }

  /**
   * Unread count for system admin inbox (per-user read on role-targeted rows).
   *
   * @param {{ recipientUserId: string }} q
   */
  async countUnreadSystemAdminInboxWithUserState(q) {
    const userOid = new mongoose.Types.ObjectId(q.recipientUserId);
    const stateColl = NotificationUserStateModel.collection.name;
    const recipientOr = {
      $or: [
        { recipientUserId: userOid },
        { recipientUserId: null, recipientRoleKey: RoleKey.SYSTEM_ADMIN },
      ],
    };

    const rows = await this.model
      .aggregate([
        {
          $match: mergeFilters(
            { isDeleted: { $ne: true }, deletedAt: null },
            recipientOr,
          ),
        },
        {
          $lookup: {
            from: stateColl,
            let: { nid: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$notificationId', '$$nid'] }, { $eq: ['$userId', userOid] }],
                  },
                },
              },
            ],
            as: '_userState',
          },
        },
        {
          $addFields: {
            userState: { $arrayElemAt: ['$_userState', 0] },
          },
        },
        {
          $match: {
            $expr: { $eq: [{ $ifNull: ['$userState.dismissedAt', null] }, null] },
          },
        },
        {
          $addFields: {
            effectiveRead: {
              $cond: {
                if: { $ne: ['$recipientUserId', null] },
                then: { $eq: ['$readStatus', 'read'] },
                else: { $ne: [{ $ifNull: ['$userState.readAt', null] }, null] },
              },
            },
          },
        },
        { $match: { effectiveRead: false } },
        { $count: 'c' },
      ])
      .exec();

    return rows[0]?.c ?? 0;
  }

  /**
   * @param {string} id
   * @param {string | null} recipientUserId
   */
  async findByIdVisibleInPublicInbox(id, recipientUserId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const deletedFilter = { isDeleted: { $ne: true }, deletedAt: null, _id: new mongoose.Types.ObjectId(id) };
    const recipientOr =
      recipientUserId && mongoose.Types.ObjectId.isValid(recipientUserId)
        ? {
            $or: [
              { recipientUserId: new mongoose.Types.ObjectId(recipientUserId) },
              { recipientUserId: null, recipientRoleKey: RoleKey.PUBLIC_USER },
              { recipientUserId: null, recipientRoleKey: null },
            ],
          }
        : {
            $or: [
              { recipientUserId: null, recipientRoleKey: RoleKey.PUBLIC_USER },
              { recipientUserId: null, recipientRoleKey: null },
            ],
          };
    return this.model.findOne(mergeFilters(deletedFilter, recipientOr)).lean();
  }

  /**
   * @param {string | import('mongoose').Types.ObjectId} recipientUserId
   */
  async markAllDirectReadForUser(recipientUserId) {
    const oid = new mongoose.Types.ObjectId(String(recipientUserId));
    const now = new Date();
    const res = await this.model.updateMany(
      mergeFilters(
        { isDeleted: { $ne: true }, deletedAt: null, recipientUserId: oid, readStatus: 'unread' },
      ),
      { $set: { readStatus: 'read', readAt: now } },
    );
    return res.modifiedCount ?? 0;
  }

  /**
   * Shared / role-targeted rows for mark-all-read (recipientUserId is null).
   *
   * @param {{ recipientUserId: string, excludeNotificationIds?: string[] }} q
   */
  async listBroadcastInboxIdsForUser(q) {
    const exclude =
      q.excludeNotificationIds?.length &&
      q.excludeNotificationIds.every((id) => mongoose.Types.ObjectId.isValid(String(id)))
        ? { _id: { $nin: q.excludeNotificationIds.map((id) => new mongoose.Types.ObjectId(String(id))) } }
        : {};

    const rows = await this.model
      .find(
        mergeFilters(
          { isDeleted: { $ne: true }, deletedAt: null, recipientUserId: null },
          {
            $or: [{ recipientRoleKey: RoleKey.PUBLIC_USER }, { recipientRoleKey: null }],
          },
          exclude,
        ),
      )
      .select({ _id: 1 })
      .lean();
    return rows.map((r) => String(r._id));
  }

  /**
   * Soft-delete a notification resource (global).
   *
   * @param {string} id
   */
  async softDeleteById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const now = new Date();
    return this.model
      .findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } },
        { $set: { isDeleted: true, deletedAt: now, readStatus: 'deleted' } },
        { new: true },
      )
      .lean();
  }

  /**
   * @param {string} id
   */
  async markDirectReadById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const now = new Date();
    return this.model
      .findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: { $ne: true },
          deletedAt: null,
          recipientUserId: { $ne: null },
        },
        { $set: { readStatus: 'read', readAt: now } },
        { new: true },
      )
      .lean();
  }
}

export const notificationRepository = new NotificationRepository();
