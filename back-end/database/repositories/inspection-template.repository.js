import mongoose from 'mongoose';
import { InspectionTemplateModel } from '../models/inspection-template.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class InspectionTemplateRepository extends BaseRepository {
  constructor() {
    super(InspectionTemplateModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   search?: string,
   *   isActive?: boolean,
   *   sort?: string,
   *   from?: Date,
   *   to?: Date,
   * }} q
   */
  async findPage(q) {
    const deletedFilter = { isDeleted: { $ne: true } };
    const activeFilter = q.isActive === undefined ? undefined : { isActive: q.isActive };

    const filter = mergeFilters(
      deletedFilter,
      activeFilter,
      buildSearchOrFilter(q.search, ['name', 'description']),
      buildDateRangeFilter(q.from, q.to, 'updatedAt'),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'name', 'revision', 'isActive'], {
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
        { $set: { isDeleted: true, deletedAt: new Date(), isActive: false } },
        { new: true, runValidators: true },
      )
      .lean();
  }
}

export const inspectionTemplateRepository = new InspectionTemplateRepository();
