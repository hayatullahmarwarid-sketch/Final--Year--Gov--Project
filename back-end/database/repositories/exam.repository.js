import mongoose from 'mongoose';
import { ExamModel } from '../models/exam.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';

/** @param {unknown} s */
function isMongoObjectIdString(s) {
  return typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s);
}
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';
import { ExamLifecycle } from '../../src/modules/shared/enums/exam-lifecycle.js';

export class ExamRepository extends BaseRepository {
  constructor() {
    super(ExamModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   search?: string,
   *   status?: string,
   *   sort?: string,
   *   from?: Date,
   *   to?: Date,
   *   decreeCategoryId?: string,
   * }} q
   */
  async findPage(q) {
    const deletedFilter = { isDeleted: { $ne: true } };
    const statusFilter = q.status ? { status: q.status } : undefined;
    const categoryFilter = q.decreeCategoryId
      ? { decreeCategoryId: new mongoose.Types.ObjectId(q.decreeCategoryId) }
      : undefined;

    const filter = mergeFilters(
      deletedFilter,
      statusFilter,
      categoryFilter,
      buildSearchOrFilter(q.search, ['title', 'description']),
      buildDateRangeFilter(q.from, q.to, 'updatedAt'),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'title', 'status', 'scheduledOpensAt'], {
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
    const sid = String(id ?? '').trim();
    if (!isMongoObjectIdString(sid)) return null;
    const filter = /** @type {Record<string, unknown>} */ ({ _id: new mongoose.Types.ObjectId(sid) });
    if (!opts.includeDeleted) filter.isDeleted = { $ne: true };
    return this.model.findOne(filter).lean();
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
   * Exams visible on the public mobile catalog (not drafts).
   *
   * @param {{
   *   skip: number,
   *   limit: number,
   *   search?: string,
   *   status?: string,
   *   sort?: string,
   *   from?: Date,
   *   to?: Date,
   *   decreeCategoryId?: string,
   * }} q
   */
  async findPublicCatalogPage(q) {
    const deletedFilter = { isDeleted: { $ne: true } };
    const publicStatuses = [ExamLifecycle.SCHEDULED, ExamLifecycle.OPEN, ExamLifecycle.PUBLISHED];
    const statusFilter = q.status
      ? { status: q.status }
      : { status: { $in: publicStatuses } };
    const categoryFilter = q.decreeCategoryId
      ? { decreeCategoryId: new mongoose.Types.ObjectId(q.decreeCategoryId) }
      : undefined;

    /** Public mobile app only lists exams meant for public users (or legacy empty = all). */
    const publicCatalogAudience = {
      $or: [{ audienceRoleKeys: { $size: 0 } }, { audienceRoleKeys: 'public_user' }],
    };

    const filter = mergeFilters(
      deletedFilter,
      statusFilter,
      categoryFilter,
      publicCatalogAudience,
      buildSearchOrFilter(q.search, ['title', 'description']),
      buildDateRangeFilter(q.from, q.to, 'updatedAt'),
    );

    const sort = parseSortQuery(
      q.sort,
      ['createdAt', 'updatedAt', 'title', 'status', 'scheduledOpensAt', 'scheduledClosesAt'],
      { scheduledOpensAt: 1 },
    );

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
  }
}

export const examRepository = new ExamRepository();
