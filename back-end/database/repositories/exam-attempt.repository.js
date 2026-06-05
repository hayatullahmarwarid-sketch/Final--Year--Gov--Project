import mongoose from 'mongoose';
import { ExamAttemptModel } from '../models/exam-attempt.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  escapeRegex,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';
import { ExamAttemptStatus } from '../../src/modules/shared/enums/exam-attempt-status.js';

export class ExamAttemptRepository extends BaseRepository {
  constructor() {
    super(ExamAttemptModel);
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
   * @param {{ examId: string, examineeUserId: string, status?: string }}
   */
  /**
   * Completed attempts (submitted or graded) for eligibility / cooldown rules.
   * @param {{ examId: string, examineeUserId: string }}
   */
  async listCompletedByExamAndExaminee(examId, examineeUserId) {
    const filter = {
      examId: new mongoose.Types.ObjectId(examId),
      examineeUserId: new mongoose.Types.ObjectId(examineeUserId),
      isDeleted: { $ne: true },
      status: { $in: [ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.GRADED] },
    };
    return this.model.find(filter).sort({ submittedAt: 1 }).lean();
  }

  /**
   * @param {{ examId: string, examineeUserId: string }}
   */
  async findLatestByExamAndExamineeLean(q) {
    const filter = mergeFilters(
      {
        examId: new mongoose.Types.ObjectId(q.examId),
        examineeUserId: new mongoose.Types.ObjectId(q.examineeUserId),
        isDeleted: { $ne: true },
      },
      q.status ? { status: q.status } : {},
    );
    return this.model.findOne(filter).sort({ startedAt: -1 }).lean();
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   examineeUserId: string,
   *   statusIn?: string[],
   *   sort?: string,
   * }} q
   */
  async findPageByExaminee(q) {
    const filter = mergeFilters(
      {
        examineeUserId: new mongoose.Types.ObjectId(q.examineeUserId),
        isDeleted: { $ne: true },
      },
      q.statusIn?.length ? { status: { $in: q.statusIn } } : {},
    );
    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'submittedAt', 'startedAt', 'score'], {
      submittedAt: -1,
    });
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
   * Admin grid: attempts with optional examinee / exam title search.
   * @param {{
   *   skip: number,
   *   limit: number,
   *   examId?: string,
   *   status?: string,
   *   sort?: string,
   *   search?: string,
   *   from?: Date,
   *   to?: Date,
   * }} q
   */
  async findPageForAdmin(q) {
    const deletedFilter = { isDeleted: { $ne: true } };
    const examFilter = q.examId ? { examId: new mongoose.Types.ObjectId(q.examId) } : undefined;
    const statusFilter = q.status ? { status: q.status } : undefined;
    const dateFilter = buildDateRangeFilter(q.from, q.to, 'submittedAt');

    const baseMatch = mergeFilters(deletedFilter, examFilter, statusFilter, dateFilter);

    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'submittedAt', 'startedAt', 'score'], {
      submittedAt: -1,
    });

    const search = q.search?.trim();
    const searchRx = search ? new RegExp(escapeRegex(search), 'i') : null;

    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'examineeUserId',
          foreignField: '_id',
          as: '_examinee',
        },
      },
      { $unwind: { path: '$_examinee', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'exams',
          localField: 'examId',
          foreignField: '_id',
          as: '_exam',
        },
      },
      { $unwind: { path: '$_exam', preserveNullAndEmptyArrays: true } },
    ];

    if (searchRx) {
      pipeline.push({
        $match: {
          $or: [
            { '_examinee.displayName': searchRx },
            { '_exam.title': searchRx },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        items: [{ $sort: sort }, { $skip: q.skip }, { $limit: q.limit }],
        total: [{ $count: 'n' }],
      },
    });

    const [row] = await this.model.aggregate(pipeline);
    const items = row?.items ?? [];
    const total = row?.total?.[0]?.n ?? 0;
    return { items, total };
  }
}

export const examAttemptRepository = new ExamAttemptRepository();
