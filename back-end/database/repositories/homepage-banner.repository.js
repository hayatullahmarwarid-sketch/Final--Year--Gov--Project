import mongoose from 'mongoose';
import { HomepageBannerModel } from '../models/homepage-banner.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class HomepageBannerRepository extends BaseRepository {
  constructor() {
    super(HomepageBannerModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   locale?: string,
   *   publishedOnly?: boolean,
   *   tenantId?: string | null,
   *   sort?: string,
   *   search?: string,
   *   from?: Date,
   *   to?: Date,
   * }} q
   */
  async findPage(q) {
    const tenantPart =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    const localeFilter = q.locale ? { locale: q.locale.trim().toLowerCase() } : {};
    const now = new Date();
    const publishedFilter =
      q.publishedOnly === true
        ? {
            isActive: true,
            $and: [
              { $or: [{ activeFrom: null }, { activeFrom: { $lte: now } }] },
              { $or: [{ activeTo: null }, { activeTo: { $gte: now } }] },
            ],
          }
        : {};
    const filter = mergeFilters(
      tenantPart,
      localeFilter,
      publishedFilter,
      buildSearchOrFilter(q.search, ['title', 'subtitle', 'body']),
      buildDateRangeFilter(q.from, q.to, 'createdAt'),
      { isDeleted: { $ne: true } },
    );
    const sort = parseSortQuery(q.sort, ['sortOrder', 'createdAt', 'title'], { sortOrder: 1, createdAt: -1 });
    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total };
  }

  /**
   * @param {string} id
   * @param {Record<string, unknown>} patch
   */
  async updateByIdLean(id, patch) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } },
        { $set: patch },
        { new: true },
      )
      .lean();
  }

  /**
   * @param {string} id
   */
  async findOneByIdNotDeleted(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return this.model.findOne({ _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } }).lean();
  }
}

export const homepageBannerRepository = new HomepageBannerRepository();
