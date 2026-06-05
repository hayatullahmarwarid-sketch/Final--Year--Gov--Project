import mongoose from 'mongoose';
import { DecreeVersionModel } from '../models/decree-version.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import { excludeDeleted } from '../../src/modules/shared/constants/query-filters.js';

export class DecreeVersionRepository extends BaseRepository {
  constructor() {
    super(DecreeVersionModel);
  }

  /**
   * @param {string} id
   * @param {{ includeDeleted?: boolean, session?: import('mongoose').ClientSession }} [opts]
   */
  async findByIdLean(id, opts = {}) {
    const filter = /** @type {Record<string, unknown>} */ ({ _id: new mongoose.Types.ObjectId(id) });
    if (!opts.includeDeleted) filter.isDeleted = { $ne: true };
    let q = this.model.findOne(filter);
    if (opts.session) q = q.session(opts.session);
    return q.lean();
  }

  /**
   * @param {string[]} ids
   */
  async findByIdsLean(ids) {
    if (!ids.length) return [];
    const oid = ids.map((id) => new mongoose.Types.ObjectId(id));
    return this.model.find({ _id: { $in: oid }, isDeleted: { $ne: true } }).lean();
  }

  /**
   * @param {string} decreeId
   */
  async findMaxVersionNumber(decreeId) {
    const row = await this.model
      .findOne({ decreeId, isDeleted: { $ne: true } })
      .sort({ versionNumber: -1 })
      .select({ versionNumber: 1 })
      .lean();
    return row?.versionNumber ?? 0;
  }

  /**
   * @param {string} decreeId
   */
  async listByDecreeIdLean(decreeId) {
    return this.model
      .find({ decreeId, isDeleted: { $ne: true } })
      .sort({ versionNumber: 1 })
      .lean();
  }

  /**
   * @param {string} decreeId
   * @param {import('mongoose').ClientSession} [session]
   */
  async findPublishedChainLean(decreeId, session) {
    let q = this.model
      .find({
        decreeId,
        isDeleted: { $ne: true },
        publicationStatus: 'published',
      })
      .sort({ versionNumber: 1 });
    if (session) q = q.session(session);
    return q.lean();
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
   * @param {string} id
   * @param {import('mongoose').ClientSession} [session]
   */
  async softDeleteByIdLean(id, session) {
    const res = await this.model.updateOne(
      { _id: new mongoose.Types.ObjectId(id), ...excludeDeleted },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { session: session ?? undefined },
    );
    return { modifiedCount: res.modifiedCount };
  }

  /**
   * @param {string} decreeId
   * @param {import('mongoose').FilterQuery<any>} extra
   */
  async findOneByDecreeLean(decreeId, extra = {}) {
    return this.model.findOne(mergeFilters({ decreeId, isDeleted: { $ne: true } }, extra)).lean();
  }
}

export const decreeVersionRepository = new DecreeVersionRepository();
