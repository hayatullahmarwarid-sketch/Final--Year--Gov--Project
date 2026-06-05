import mongoose from 'mongoose';
import { ExamQuestionBankModel } from '../models/exam-question-bank.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import { parseSortQuery } from '../../src/modules/shared/query/mongo-query.helpers.js';

export class ExamQuestionBankRepository extends BaseRepository {
  constructor() {
    super(ExamQuestionBankModel);
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
   * @param {{
   *   skip: number,
   *   limit: number,
   *   decreeCategoryId?: string,
   *   sort?: string,
   * }} q
   */
  async findPageByDecreeCategory(q) {
    const categoryFilter = q.decreeCategoryId
      ? { decreeCategoryId: new mongoose.Types.ObjectId(q.decreeCategoryId) }
      : {};
    const filter = mergeFilters(
      { isDeleted: { $ne: true }, isActive: { $ne: false } },
      categoryFilter,
    );
    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'stem'], { updatedAt: -1 });
    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total };
  }

  /**
   * @param {Record<string, unknown>} doc
   */
  async createLean(doc) {
    const created = await this.model.create(doc);
    return created.toObject();
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
        { $set: { isDeleted: true, isActive: false, deletedAt: new Date() } },
        { new: true, runValidators: true },
      )
      .lean();
  }
}

export const examQuestionBankRepository = new ExamQuestionBankRepository();
