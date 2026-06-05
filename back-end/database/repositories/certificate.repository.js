import mongoose from 'mongoose';
import { CertificateModel } from '../models/certificate.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';
import { CertificateKind } from '../../src/modules/shared/enums/certificate-kind.js';
import { CertificateStatus } from '../../src/modules/shared/enums/certificate-status.js';

/** @param {unknown} s */
function isMongoObjectIdString(s) {
  return typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s);
}

export class CertificateRepository extends BaseRepository {
  constructor() {
    super(CertificateModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   status?: string,
   *   kind?: string,
   *   holderUserId?: string,
   *   search?: string,
   *   sort?: string,
   *   from?: Date,
   *   to?: Date,
   * }} q
   */
  async findPage(q) {
    const deletedFilter = { isDeleted: { $ne: true } };
    const statusFilter = q.status ? { status: q.status } : undefined;
    const kindFilter = q.kind ? { kind: q.kind } : undefined;
    const holderFilter = q.holderUserId
      ? { holderUserId: new mongoose.Types.ObjectId(q.holderUserId) }
      : undefined;

    const filter = mergeFilters(
      deletedFilter,
      statusFilter,
      kindFilter,
      holderFilter,
      buildSearchOrFilter(q.search, ['certificateNumber']),
      buildDateRangeFilter(q.from, q.to, 'issuedAt'),
    );

    const sort = parseSortQuery(q.sort, ['createdAt', 'updatedAt', 'issuedAt', 'status', 'kind'], {
      issuedAt: -1,
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
    const sid = String(id ?? '').trim();
    if (!isMongoObjectIdString(sid)) return null;
    const filter = /** @type {Record<string, unknown>} */ ({ _id: new mongoose.Types.ObjectId(sid) });
    if (!opts.includeDeleted) filter.isDeleted = { $ne: true };
    return this.model.findOne(filter).lean();
  }

  /**
   * Resolve a certificate owned by `holderUserId` from either a Mongo `_id` or `certificateNumber`.
   * Avoids throwing on non-ObjectId refs (e.g. human-readable numbers passed from clients).
   *
   * @param {string} holderUserId
   * @param {string} ref
   * @param {{ includeDeleted?: boolean }} [opts]
   */
  async findByHolderAndCertificateRefLean(holderUserId, ref, opts = {}) {
    const trimmed = String(ref ?? '').trim();
    if (!trimmed) return null;
    let holderOid;
    try {
      holderOid = new mongoose.Types.ObjectId(String(holderUserId));
    } catch {
      return null;
    }
    const deletedFilter = opts.includeDeleted ? {} : { isDeleted: { $ne: true } };
    if (isMongoObjectIdString(trimmed)) {
      try {
        const row = await this.model
          .findOne({
            _id: new mongoose.Types.ObjectId(trimmed),
            holderUserId: holderOid,
            ...deletedFilter,
          })
          .lean();
        if (row) return row;
      } catch {
        /* fall through — try certificateNumber or caller gets null */
      }
    }
    return this.model
      .findOne({
        holderUserId: holderOid,
        certificateNumber: trimmed,
        ...deletedFilter,
      })
      .lean();
  }

  /**
   * Non-revoked exam pass certificate for an exam, if any (check `metadata.validTo` for expiry).
   * @param {{ holderUserId: string, sourceExamId: string }}
   */
  async findExamPassByHolderAndExamLean(holderUserId, sourceExamId) {
    return this.model
      .findOne({
        holderUserId: new mongoose.Types.ObjectId(holderUserId),
        sourceExamId: new mongoose.Types.ObjectId(sourceExamId),
        kind: CertificateKind.EXAM_PASS,
        status: CertificateStatus.ISSUED,
        isDeleted: { $ne: true },
      })
      .sort({ issuedAt: -1 })
      .lean();
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
}

export const certificateRepository = new CertificateRepository();
