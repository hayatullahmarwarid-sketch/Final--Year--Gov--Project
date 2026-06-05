import mongoose from 'mongoose';
import { InspectionAssignmentModel } from '../models/inspection-assignment.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class InspectionAssignmentRepository extends BaseRepository {
  constructor() {
    super(InspectionAssignmentModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   status?: string,
   *   inspectorUserId?: string,
   *   templateId?: string,
   *   decreeId?: string,
   *   region?: string,
   *   search?: string,
   *   sort?: string,
   *   from?: Date,
   *   to?: Date,
   * }} q
   */
  async findPage(q) {
    const deletedFilter = { isDeleted: { $ne: true } };
    const statusFilter = q.status ? { status: q.status } : undefined;
    const inspectorFilter = q.inspectorUserId
      ? { inspectorUserId: new mongoose.Types.ObjectId(q.inspectorUserId) }
      : undefined;
    const templateFilter = q.templateId
      ? { templateId: new mongoose.Types.ObjectId(q.templateId) }
      : undefined;
    const decreeFilter = q.decreeId ? { decreeId: new mongoose.Types.ObjectId(q.decreeId) } : undefined;
    const regionFilter = q.region ? { region: q.region } : undefined;

    const filter = mergeFilters(
      deletedFilter,
      statusFilter,
      inspectorFilter,
      templateFilter,
      decreeFilter,
      regionFilter,
      buildSearchOrFilter(q.search, ['notes', 'returnReason', 'region']),
      buildDateRangeFilter(q.from, q.to, 'updatedAt'),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'dueAt', 'priority', 'status'], {
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
   * @param {Record<string, unknown>} filter
   */
  async countByStatusGrouped(filter = {}) {
    const rows = await this.model.aggregate([
      { $match: { ...filter, isDeleted: { $ne: true } } },
      { $group: { _id: '$status', total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return rows.map((r) => ({ status: String(r._id), total: r.total }));
  }
}

export const inspectionAssignmentRepository = new InspectionAssignmentRepository();
