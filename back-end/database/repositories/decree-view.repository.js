import mongoose from 'mongoose';
import { DecreeViewModel } from '../models/decree-view.model.js';
import { DecreeModel } from '../models/decree.model.js';
import { BaseRepository } from './base.repository.js';

export class DecreeViewRepository extends BaseRepository {
  constructor() {
    super(DecreeViewModel);
  }

  /**
   * Record one engagement-qualified view (30s+ reader session on the client). May repeat for the same
   * user+decree. Increments `decree.viewCount` and rolls up in uploader charts via `viewedAt`.
   * @param {string} decreeId
   * @param {string} viewerUserId
   * @returns {Promise<{ recorded: boolean }>}
   */
  async recordEngagementView(decreeId, viewerUserId) {
    if (!mongoose.Types.ObjectId.isValid(decreeId) || !mongoose.Types.ObjectId.isValid(viewerUserId)) {
      return { recorded: false };
    }
    const did = String(decreeId);
    const uid = String(viewerUserId);
    await this.model.create({
      decreeId: new mongoose.Types.ObjectId(did),
      viewerUserId: new mongoose.Types.ObjectId(uid),
      viewedAt: new Date(),
    });
    await DecreeModel.updateOne(
      { _id: new mongoose.Types.ObjectId(did), isDeleted: { $ne: true } },
      { $inc: { viewCount: 1 } },
    );
    return { recorded: true };
  }

  /**
   * Views per UTC day for decrees created by a user (dashboard chart).
   * @param {string} createdByUserId
   * @param {Date} from
   * @param {Date} to
   */
  async aggregateViewsByDayForUploader(createdByUserId, from, to) {
    if (!mongoose.Types.ObjectId.isValid(createdByUserId)) return [];
    const uid = new mongoose.Types.ObjectId(createdByUserId);
    return DecreeViewModel.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          viewedAt: { $gte: from, $lte: to },
        },
      },
      {
        $lookup: {
          from: 'decrees',
          localField: 'decreeId',
          foreignField: '_id',
          as: 'decree',
        },
      },
      { $unwind: '$decree' },
      { $match: { 'decree.isDeleted': { $ne: true }, 'decree.createdByUserId': uid } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$viewedAt', timezone: 'UTC' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ]);
  }

  /**
   * Total views per calendar month (UTC) for decrees created by this user.
   * @param {string} createdByUserId
   * @param {Date} from inclusive
   * @param {Date} to inclusive
   * @returns {Promise<{ month: string, count: number }[]>} month = YYYY-MM
   */
  async aggregateViewsByMonthForUploader(createdByUserId, from, to) {
    if (!mongoose.Types.ObjectId.isValid(createdByUserId)) return [];
    const uid = new mongoose.Types.ObjectId(createdByUserId);
    return DecreeViewModel.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          viewedAt: { $gte: from, $lte: to },
        },
      },
      {
        $lookup: {
          from: 'decrees',
          localField: 'decreeId',
          foreignField: '_id',
          as: 'decree',
        },
      },
      { $unwind: '$decree' },
      { $match: { 'decree.isDeleted': { $ne: true }, 'decree.createdByUserId': uid } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$viewedAt', timezone: 'UTC' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: '$_id', count: 1 } },
    ]);
  }

  /**
   * Per-month view counts per decree primary category (first `categoryIds` entry) for the uploader's decrees.
   * @param {string} createdByUserId
   * @param {Date} from
   * @param {Date} to
   * @returns {Promise<{ month: string, categoryId: string, count: number }[]>} month = YYYY-MM
   */
  async aggregateViewsByMonthByPrimaryCategoryForUploader(createdByUserId, from, to) {
    if (!mongoose.Types.ObjectId.isValid(createdByUserId)) return [];
    const uid = new mongoose.Types.ObjectId(createdByUserId);
    return DecreeViewModel.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          viewedAt: { $gte: from, $lte: to },
        },
      },
      {
        $lookup: {
          from: 'decrees',
          localField: 'decreeId',
          foreignField: '_id',
          as: 'decree',
        },
      },
      { $unwind: '$decree' },
      { $match: { 'decree.isDeleted': { $ne: true }, 'decree.createdByUserId': uid } },
      {
        $addFields: {
          primaryCat: { $arrayElemAt: ['$decree.categoryIds', 0] },
        },
      },
      { $match: { primaryCat: { $ne: null } } },
      {
        $group: {
          _id: {
            m: { $dateToString: { format: '%Y-%m', date: '$viewedAt', timezone: 'UTC' } },
            cat: '$primaryCat',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.m': 1 } },
      {
        $project: {
          _id: 0,
          month: '$_id.m',
          categoryId: { $toString: '$_id.cat' },
          count: 1,
        },
      },
    ]);
  }
}

export const decreeViewRepository = new DecreeViewRepository();
