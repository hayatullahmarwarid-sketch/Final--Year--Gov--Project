import mongoose from 'mongoose';
import { UserModel } from '../models/user.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super(UserModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   roleKeysIn?: string[],
   *   roleKey?: string,
   *   status?: string,
   *   sort?: string,
   *   search?: string,
   *   from?: Date,
   *   to?: Date,
   *   includeDeleted?: boolean,
   * }} q
   */
  async findStaffPage(q) {
    let roleConstraint;
    if (q.roleKey) {
      roleConstraint = { roleKey: q.roleKey };
    } else if (q.roleKeysIn && q.roleKeysIn.length > 0) {
      roleConstraint = { roleKey: { $in: q.roleKeysIn } };
    }

    const statusFilter = q.status ? { status: q.status } : undefined;
    const deletedFilter = q.includeDeleted ? undefined : { isDeleted: { $ne: true } };

    const filter = mergeFilters(
      roleConstraint,
      statusFilter,
      deletedFilter,
      buildSearchOrFilter(q.search, ['displayName', 'email', 'phoneE164']),
      buildDateRangeFilter(q.from, q.to, 'updatedAt'),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'displayName', 'roleKey', 'status'], {
      updatedAt: -1,
    });

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * @param {string} id
   * @param {{ includeDeleted?: boolean }} [opts]
   */
  async findByIdLean(id, opts = {}) {
    const filter = /** @type {Record<string, unknown>} */ ({ _id: new mongoose.Types.ObjectId(id) });
    if (!opts.includeDeleted) filter.isDeleted = { $ne: true };
    return this.model.findOne(filter).lean();
  }

  /**
   * @param {string[]} ids
   * @param {{ includeDeleted?: boolean }} [opts]
   */
  async findByIdsLean(ids, opts = {}) {
    if (!ids.length) return [];
    const oid = ids.map((id) => new mongoose.Types.ObjectId(id));
    const filter = /** @type {Record<string, unknown>} */ ({ _id: { $in: oid } });
    if (!opts.includeDeleted) filter.isDeleted = { $ne: true };
    return this.model.find(filter).lean();
  }

  /**
   * Free-text search for users by display name or email. Returns lean docs (no
   * password hash). Used by admin filters that take a holder name string.
   *
   * @param {string} query
   * @param {number} [limit=100]
   */
  async findByDisplayNameSearch(query, limit = 100) {
    const term = String(query ?? '').trim();
    if (!term) return [];
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    return this.model
      .find({
        isDeleted: { $ne: true },
        $or: [{ displayName: rx }, { email: rx }],
      })
      .select({ displayName: 1, email: 1, roleKey: 1 })
      .limit(Math.max(1, Math.min(500, Math.floor(limit))))
      .lean();
  }

  /**
   * Local password login: includes `passwordHash` (normally `select: false`).
   * @param {string} email Lowercased email
   */
  async findByEmailForPasswordAuth(email) {
    const normalized = email.trim().toLowerCase();
    return this.model
      .findOne({ email: normalized, isDeleted: { $ne: true } })
      .select('+passwordHash')
      .lean();
  }

  /**
   * @param {string} id
   * @param {Record<string, unknown>} update
   */
  async updateByIdLean(id, update) {
    return this.model
      .findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .lean();
  }

  /**
   * @param {string} id
   */
  async softDeleteByIdLean(id) {
    return this.model
      .findByIdAndUpdate(
        id,
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { new: true, runValidators: true },
      )
      .lean();
  }

  /**
   * @param {Record<string, unknown>} filter
   */
  async countDocumentsFiltered(filter) {
    return this.model.countDocuments(filter);
  }

  /**
   * @param {string[]} roleKeys
   * @returns {Promise<Array<{ roleKey: string, total: number }>>}
   */
  async countGroupedByRoleKey(roleKeys) {
    const rows = await this.model.aggregate([
      { $match: { isDeleted: { $ne: true }, roleKey: { $in: roleKeys } } },
      { $group: { _id: '$roleKey', total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return rows.map((r) => ({ roleKey: String(r._id), total: r.total }));
  }

  /**
   * Count non-deleted users whose `createdAt` falls in [from, to).
   *
   * @param {Date} from
   * @param {Date} to
   */
  async countCreatedBetween(from, to) {
    return this.model.countDocuments({
      isDeleted: { $ne: true },
      createdAt: { $gte: from, $lt: to },
    });
  }
}

export const userRepository = new UserRepository();
