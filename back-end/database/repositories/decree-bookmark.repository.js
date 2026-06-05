import mongoose from 'mongoose';
import { DecreeBookmarkModel } from '../models/decree-bookmark.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import { parseSortQuery } from '../../src/modules/shared/query/mongo-query.helpers.js';

export class DecreeBookmarkRepository extends BaseRepository {
  constructor() {
    super(DecreeBookmarkModel);
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
   * @param {{ ownerUserId: string, decreeId: string, tenantId?: string | null }}
   */
  async findByOwnerAndDecreeLean(q) {
    const tenantPart =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    return this.model
      .findOne(
        mergeFilters(tenantPart, {
          ownerUserId: new mongoose.Types.ObjectId(q.ownerUserId),
          decreeId: new mongoose.Types.ObjectId(q.decreeId),
          isDeleted: { $ne: true },
        }),
      )
      .lean();
  }

  /**
   * @param {{ skip: number, limit: number, ownerUserId: string, tenantId?: string | null, sort?: string }} q
   */
  async findPageByOwner(q) {
    const tenantPart =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    const filter = mergeFilters(tenantPart, {
      ownerUserId: new mongoose.Types.ObjectId(q.ownerUserId),
      isDeleted: { $ne: true },
    });
    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt'], { updatedAt: -1 });
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
  async softDeleteById(id, update = {}) {
    return this.model
      .findByIdAndUpdate(
        id,
        { $set: { isDeleted: true, deletedAt: new Date(), ...update } },
        { new: true },
      )
      .lean();
  }
}

export const decreeBookmarkRepository = new DecreeBookmarkRepository();
