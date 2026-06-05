import mongoose from 'mongoose';
import { ExamQuestionModel } from '../models/exam-question.model.js';
import { BaseRepository } from './base.repository.js';

export class ExamQuestionRepository extends BaseRepository {
  constructor() {
    super(ExamQuestionModel);
  }

  /**
   * @param {string} examId
   * @param {{ activeOnly?: boolean }} [opts]
   */
  async listByExamIdLean(examId, opts = {}) {
    const filter = /** @type {Record<string, unknown>} */ ({
      examId: new mongoose.Types.ObjectId(examId),
      isDeleted: { $ne: true },
    });
    if (opts.activeOnly !== false) filter.isActive = true;
    return this.model.find(filter).sort({ order: 1 }).lean();
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
   * Highest `order` for this exam, including soft-deleted rows.
   * New rows must use max+1: the unique index `{ examId, order }` applies to the whole
   * collection, so reusing 0..n after a soft-delete would E11000 until orders pass deleted slots.
   *
   * @param {string} examId
   */
  async maxOrderForExam(examId) {
    const row = await this.model
      .findOne({
        examId: new mongoose.Types.ObjectId(examId),
      })
      .sort({ order: -1 })
      .select('order')
      .lean();
    return typeof row?.order === 'number' ? row.order : -1;
  }

  /**
   * @param {string} bankQuestionId
   */
  async listBySourceBankQuestionIdLean(bankQuestionId) {
    return this.model
      .find({
        sourceBankQuestionId: new mongoose.Types.ObjectId(bankQuestionId),
        isDeleted: { $ne: true },
      })
      .lean();
  }

  /**
   * @param {string} examId
   */
  async countActiveForExam(examId) {
    return this.model.countDocuments({
      examId: new mongoose.Types.ObjectId(examId),
      isDeleted: { $ne: true },
      isActive: true,
    });
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

export const examQuestionRepository = new ExamQuestionRepository();
