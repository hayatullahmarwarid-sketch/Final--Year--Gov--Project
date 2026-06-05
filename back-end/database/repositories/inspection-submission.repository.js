import mongoose from 'mongoose';
import { InspectionSubmissionModel } from '../models/inspection-submission.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class InspectionSubmissionRepository extends BaseRepository {
  constructor() {
    super(InspectionSubmissionModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   assignmentId?: string,
   *   assignmentStatus?: string,
   *   submissionKind?: string,
   *   sort?: string,
   *   from?: Date,
   *   to?: Date,
   * }} q
   */
  async findPageForAdmin(q) {
    const deletedFilter = { isDeleted: { $ne: true } };
    const assignmentIdFilter = q.assignmentId
      ? { assignmentId: new mongoose.Types.ObjectId(q.assignmentId) }
      : undefined;
    const kindFilter = q.submissionKind ? { submissionKind: q.submissionKind } : undefined;

    const dateFilter = buildDateRangeFilter(q.from, q.to, 'updatedAt');
    const baseMatch = mergeFilters(deletedFilter, assignmentIdFilter, kindFilter, dateFilter);

    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'submittedAt', 'revisionNumber'], {
      updatedAt: -1,
    });

    const collapseToLatestFinalPerAssignment = q.submissionKind === 'final';

    if (!q.assignmentStatus && !collapseToLatestFinalPerAssignment) {
      const [items, total] = await Promise.all([
        this.model.find(baseMatch).sort(sort).skip(q.skip).limit(q.limit).lean(),
        this.model.countDocuments(baseMatch),
      ]);
      return { items, total };
    }

    const pipeline = [
      { $match: baseMatch },
    ];

    if (collapseToLatestFinalPerAssignment) {
      pipeline.push(
        { $sort: { assignmentId: 1, revisionNumber: -1, updatedAt: -1 } },
        {
          $group: {
            _id: '$assignmentId',
            latest: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$latest' } },
      );
    }

    if (q.assignmentStatus) {
      pipeline.push(
        {
          $lookup: {
            from: 'inspection_assignments',
            localField: 'assignmentId',
            foreignField: '_id',
            as: 'assignment',
          },
        },
        { $unwind: '$assignment' },
        {
          $match: {
            'assignment.status': q.assignmentStatus,
            'assignment.isDeleted': { $ne: true },
          },
        },
      );
    }

    pipeline.push(
      {
        $facet: {
          items: [{ $sort: sort }, { $skip: q.skip }, { $limit: q.limit }],
          total: [{ $count: 'n' }],
        },
      },
    );

    const [row] = await this.model.aggregate(pipeline);
    const items = row?.items ?? [];
    const total = row?.total?.[0]?.n ?? 0;

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
   * @param {string} assignmentId
   */
  async maxRevisionForAssignment(assignmentId) {
    const row = await this.model
      .find({ assignmentId: new mongoose.Types.ObjectId(assignmentId), isDeleted: { $ne: true } })
      .sort({ revisionNumber: -1 })
      .limit(1)
      .lean();
    return row?.revisionNumber ?? 0;
  }

  /**
   * @param {string} assignmentId
   * @param {number} revisionNumber
   */
  async findDraftForAssignmentRevision(assignmentId, revisionNumber) {
    return this.model
      .findOne({
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        revisionNumber,
        submissionKind: { $in: ['autosave_draft', 'manual_draft'] },
        isDeleted: { $ne: true },
      })
      .sort({ updatedAt: -1 })
      .lean();
  }

  /**
   * @param {string} assignmentId
   * @param {number} revisionNumber
   */
  async findFinalForAssignmentRevision(assignmentId, revisionNumber) {
    return this.model
      .findOne({
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        revisionNumber,
        submissionKind: 'final',
        isDeleted: { $ne: true },
      })
      .lean();
  }

  /**
   * @param {string} assignmentId
   * @param {string} clientRequestId
   */
  async findByAssignmentAndClientRequestId(assignmentId, clientRequestId) {
    if (!clientRequestId) return null;
    return this.model
      .findOne({
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        clientRequestId,
        isDeleted: { $ne: true },
      })
      .lean();
  }
}

export const inspectionSubmissionRepository = new InspectionSubmissionRepository();
