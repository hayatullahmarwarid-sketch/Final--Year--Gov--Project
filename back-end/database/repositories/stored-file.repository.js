import mongoose from 'mongoose';
import { StoredFileModel } from '../models/stored-file.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import { excludeDeleted } from '../../src/modules/shared/constants/query-filters.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class StoredFileRepository extends BaseRepository {
  constructor() {
    super(StoredFileModel);
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
   * @param {Record<string, unknown>} doc
   * @param {import('mongoose').ClientSession} [session]
   */
  async createWithSession(doc, session) {
    const [created] = await this.model.create([doc], session ? { session } : {});
    return created.toObject();
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   sort?: string,
   *   search?: string,
   *   from?: Date,
   *   to?: Date,
   *   tenantId?: string | null,
   *   provider?: string,
   *   purpose?: string,
   *   folder?: string,
   *   linkedEntityType?: string,
   *   linkedEntityId?: string,
   *   uploadedBy?: string,
   * }} q
   */
  async findPage(q) {
    const linkedFilter =
      q.linkedEntityType && q.linkedEntityId
        ? {
            linkedEntityType: q.linkedEntityType,
            linkedEntityId: new mongoose.Types.ObjectId(q.linkedEntityId),
          }
        : q.linkedEntityType
          ? { linkedEntityType: q.linkedEntityType }
          : undefined;

    const filter = mergeFilters(
      excludeDeleted,
      q.tenantId !== undefined && q.tenantId !== null && q.tenantId !== ''
        ? { tenantId: q.tenantId }
        : undefined,
      q.provider ? { provider: String(q.provider).trim().toLowerCase() } : undefined,
      q.purpose ? { purpose: q.purpose } : undefined,
      q.folder !== undefined && q.folder !== null && q.folder !== ''
        ? { folder: q.folder }
        : undefined,
      q.uploadedBy && mongoose.Types.ObjectId.isValid(q.uploadedBy)
        ? { uploadedBy: new mongoose.Types.ObjectId(q.uploadedBy) }
        : undefined,
      linkedFilter,
      buildSearchOrFilter(q.search, ['originalName', 'mimeType', 'providerFileId', 'folder']),
      buildDateRangeFilter(q.from, q.to, 'createdAt'),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'size', 'originalName'], {
      createdAt: -1,
    });

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
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
}

export const storedFileRepository = new StoredFileRepository();
