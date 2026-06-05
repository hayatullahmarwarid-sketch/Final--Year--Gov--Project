import mongoose from 'mongoose';
import { DecreeCategoryModel } from '../models/decree-category.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class DecreeCategoryRepository extends BaseRepository {
  constructor() {
    super(DecreeCategoryModel);
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
   * @param {string} tenantId
   * @param {string} slug
   */
  async findBySlugLean(tenantId, slug) {
    return this.model
      .findOne({
        tenantId: tenantId ?? null,
        slug,
        isDeleted: { $ne: true },
      })
      .lean();
  }

  /**
   * @param {Record<string, unknown>} doc
   * @param {import('mongoose').ClientSession} [session]
   */
  async createWithSession(doc, session) {
    const [created] = await this.model.create([doc], session ? { session } : {});
    return created.toObject();
  }

  /**
   * @param {string} id
   * @param {Record<string, unknown>} update
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateByIdLean(id, update, session) {
    return this.model
      .findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true, session })
      .lean();
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   tenantId?: string | null,
   *   isActive?: boolean,
   *   parentCategoryId?: string | null,
   *   search?: string,
   *   sort?: string,
   *   includeDeleted?: boolean,
   * }} q
   */
  async findPage(q) {
    const tenantFilter =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    const activeFilter = q.isActive === undefined ? {} : { isActive: q.isActive };
    const parentFilter =
      q.parentCategoryId === undefined
        ? {}
        : { parentCategoryId: q.parentCategoryId ? new mongoose.Types.ObjectId(q.parentCategoryId) : null };
    const deletedFilter = q.includeDeleted ? {} : { isDeleted: { $ne: true } };

    const filter = mergeFilters(
      tenantFilter,
      activeFilter,
      parentFilter,
      deletedFilter,
      buildSearchOrFilter(q.search, ['name', 'namePs', 'slug', 'description']),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'sortOrder', 'name', 'slug'], {
      sortOrder: 1,
      name: 1,
    });

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * @param {string[]} ids
   */
  async findByIdsLean(ids) {
    if (!ids.length) return [];
    const oid = ids.map((id) => new mongoose.Types.ObjectId(id));
    return this.model.find({ _id: { $in: oid }, isDeleted: { $ne: true } }).lean();
  }
}

export const decreeCategoryRepository = new DecreeCategoryRepository();
