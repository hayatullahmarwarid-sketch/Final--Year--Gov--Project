import mongoose from 'mongoose';
import { AuditLogModel } from '../models/audit-log.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLogModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   actionKey?: string,
   *   entityType?: string,
   *   entityId?: string,
   *   actorUserId?: string,
   *   actorRoleKey?: string,
   *   actorType?: string,
   *   sort?: string,
   *   search?: string,
   *   from?: Date,
   *   to?: Date,
   * }} q
   */
  async findPage(q) {
    const filter = mergeFilters(
      q.actionKey ? { actionKey: q.actionKey } : undefined,
      q.entityType ? { entityType: q.entityType } : undefined,
      q.entityId ? { entityId: q.entityId } : undefined,
      q.actorRoleKey ? { actorRoleKey: q.actorRoleKey } : undefined,
      q.actorType ? { actorType: q.actorType } : undefined,
      q.actorUserId ? { actorUserId: new mongoose.Types.ObjectId(q.actorUserId) } : undefined,
      buildSearchOrFilter(q.search, ['summary', 'actionKey', 'entityType', 'entityId']),
      buildDateRangeFilter(q.from, q.to, 'occurredAt'),
    );

    const sort = parseSortQuery(q.sort, ['occurredAt', 'createdAt', 'actionKey', 'entityType'], {
      occurredAt: -1,
    });

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * Paginated audit rows with optional actor user display fields (`actorUser`).
   *
   * @param {Parameters<AuditLogRepository['findPage']>[0]} q
   */
  async findPageWithActor(q) {
    const filter = mergeFilters(
      q.actionKey ? { actionKey: q.actionKey } : undefined,
      q.entityType ? { entityType: q.entityType } : undefined,
      q.entityId ? { entityId: q.entityId } : undefined,
      q.actorRoleKey ? { actorRoleKey: q.actorRoleKey } : undefined,
      q.actorType ? { actorType: q.actorType } : undefined,
      q.actorUserId ? { actorUserId: new mongoose.Types.ObjectId(q.actorUserId) } : undefined,
      buildSearchOrFilter(q.search, ['summary', 'actionKey', 'entityType', 'entityId']),
      buildDateRangeFilter(q.from, q.to, 'occurredAt'),
    );

    const sort = parseSortQuery(q.sort, ['occurredAt', 'createdAt', 'actionKey', 'entityType'], {
      occurredAt: -1,
    });

    const [rows, total] = await Promise.all([
      this.model
        .aggregate([
          { $match: filter },
          { $sort: sort },
          { $skip: q.skip },
          { $limit: q.limit },
          {
            $lookup: {
              from: 'users',
              let: { uid: '$actorUserId' },
              pipeline: [
                { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
                { $project: { displayName: 1, email: 1, roleKey: 1 } },
              ],
              as: '_actorUser',
            },
          },
          { $addFields: { actorUser: { $arrayElemAt: ['$_actorUser', 0] } } },
          { $project: { _actorUser: 0 } },
        ])
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return { items: rows, total };
  }

  /**
   * Seven equal time buckets over the last 24h for dashboard charts.
   *
   * @returns {Promise<{ bucket: number, requests: number, logins: number }[]>}
   */
  async aggregateActivityBucketsLast24h7() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sinceMs = since.getTime();
    const spanMs = 24 * 60 * 60 * 1000;
    const bucketMs = spanMs / 7;

    const rows = await this.model
      .aggregate([
        { $match: { occurredAt: { $gte: since } } },
        {
          $addFields: {
            bucket: {
              $min: [
                6,
                {
                  $floor: {
                    $divide: [{ $subtract: [{ $toLong: '$occurredAt' }, sinceMs] }, bucketMs],
                  },
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: '$bucket',
            requests: { $sum: 1 },
            logins: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $ifNull: ['$actionKey', ''] },
                      regex: 'login|auth\\.|session|otp|refresh',
                      options: 'i',
                    },
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return rows.map((r) => ({ bucket: r._id, requests: r.requests, logins: r.logins }));
  }

  /**
   * @param {Record<string, unknown>} filter
   */
  async countSince(filter) {
    return this.model.countDocuments(filter);
  }

  /**
   * @param {Record<string, unknown>} filter
   * @param {Record<string, 1 | -1>} sort
   */
  async findLatestOne(filter, sort) {
    return this.model.findOne(filter).sort(sort).lean();
  }

  /**
   * Security / governance events (excludes raw HTTP access logs).
   *
   * @param {Date} from
   * @param {Date} to
   */
  async countSecurityEventsBetween(from, to) {
    return this.model.countDocuments({
      occurredAt: { $gte: from, $lt: to },
      actionKey: { $nin: ['http.write'] },
    });
  }

  /**
   * HTTP audit rows with a numeric status in [since, now) — for error-rate signal.
   *
   * @param {Date} since
   * @returns {Promise<{ total: number, errors: number }>}
   */
  async aggregateHttpStatusStatsSince(since) {
    const rows = await this.model
      .aggregate([
        {
          $match: {
            occurredAt: { $gte: since },
            httpStatus: { $type: 'number' },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            errors: { $sum: { $cond: [{ $gte: ['$httpStatus', 400] }, 1, 0] } },
          },
        },
      ])
      .exec();
    const r = rows[0];
    return { total: r?.total ?? 0, errors: r?.errors ?? 0 };
  }
}

export const auditLogRepository = new AuditLogRepository();
