import mongoose from 'mongoose';
import { DecreeModel } from '../models/decree.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';
import { DecreeLifecycle } from '../../src/modules/shared/enums/decree-lifecycle.js';

export class DecreeRepository extends BaseRepository {
  constructor() {
    super(DecreeModel);
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
   * @param {{ includeDeleted?: boolean }} [opts]
   */
  async findByIdsLean(ids, opts = {}) {
    if (!ids.length) return [];
    const oid = ids.map((id) => new mongoose.Types.ObjectId(id));
    const filter = /** @type {Record<string, unknown>} */ ({ _id: { $in: oid } });
    if (!opts.includeDeleted) filter.isDeleted = { $ne: true };
    return this.model.find(filter).lean();
  }

  /**
   * @param {{ tenantId?: string | null, decreeNumber: string }} q
   */
  async findByDecreeNumberLean(q) {
    const tenantPart =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    return this.model
      .findOne(mergeFilters(tenantPart, { decreeNumber: q.decreeNumber, isDeleted: { $ne: true } }))
      .lean();
  }

  /**
   * Next per-category index: count of decrees tagged with the category, plus one (excludes a decree when renumbering).
   *
   * @param {string | null | undefined} tenantId
   * @param {string} categoryId
   * @param {string | null} [excludeDecreeId] exclude this document from the count (category change on a draft)
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<number>}
   */
  async getNextIndexInCategory(tenantId, categoryId, excludeDecreeId, session) {
    const tenantPart =
      tenantId === undefined ? {} : { tenantId: tenantId === null ? null : tenantId };
    /** Per primary numbering category only — not “any decree tagged with this category”. */
    const filter = mergeFilters(tenantPart, {
      numberingCategoryId: new mongoose.Types.ObjectId(categoryId),
      isDeleted: { $ne: true },
      status: { $nin: [DecreeLifecycle.ARCHIVED, DecreeLifecycle.SUPERSEDED] },
    });
    if (excludeDecreeId && mongoose.Types.ObjectId.isValid(excludeDecreeId)) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeDecreeId) };
    }
    const c = await this.model.countDocuments(filter, session ? { session } : undefined);
    return c + 1;
  }

  /**
   * Detach a decree from per-category numbering so its `#n` can be reused.
   * We keep the decree visible in lists, but it no longer participates in the unique
   * `{ tenantId, numberingCategoryId, categorySequence }` index.
   *
   * @param {string} decreeId
   * @param {{ actorUserId?: import('mongoose').Types.ObjectId | null, session?: import('mongoose').ClientSession }} [opts]
   */
  async detachFromCategorySequence(decreeId, opts = {}) {
    const actor = opts.actorUserId ?? null;
    const suffix = String(decreeId).slice(-6);
    return this.model
      .findByIdAndUpdate(
        decreeId,
        {
          $set: {
            categorySequence: null,
            numberingCategoryId: null,
            // Keep a stable unique decreeNumber for archived/superseded rows.
            decreeNumber: `arch-${suffix}`,
            updatedByUserId: actor,
          },
        },
        { new: true, runValidators: true, session: opts.session },
      )
      .lean();
  }

  /**
   * Compacts category numbering after removing one decree from a category:
   * all decrees with `categorySequence > removedSeq` shift down by 1.
   *
   * Uses an update pipeline so `decreeNumber` stays equal to the new sequence.
   *
   * @param {{
   *   tenantId?: string | null,
   *   categoryId: string,
   *   removedSeq: number,
   *   session?: import('mongoose').ClientSession,
   * }} q
   */
  async compactCategorySequencesAfterRemoval(q) {
    const tenantPart =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    const filter = mergeFilters(tenantPart, {
      numberingCategoryId: new mongoose.Types.ObjectId(q.categoryId),
      isDeleted: { $ne: true },
      categorySequence: { $gt: q.removedSeq },
      status: { $nin: [DecreeLifecycle.ARCHIVED, DecreeLifecycle.SUPERSEDED] },
    });
    // Pipeline update: categorySequence -= 1; decreeNumber = String(categorySequence)
    // (Mongo evaluates $set fields against the *current* doc; we compute new seq inline).
    return this.model.updateMany(
      filter,
      [
        {
          $set: {
            categorySequence: { $subtract: ['$categorySequence', 1] },
            decreeNumber: { $toString: { $subtract: ['$categorySequence', 1] } },
          },
        },
      ],
      q.session ? { session: q.session } : undefined,
    );
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
   * @param {{
   *   skip: number,
   *   limit: number,
   *   tenantId?: string | null,
   *   status?: string,
   *   categoryId?: string,
   *   tagKey?: string,
   *   visibility?: string,
   *   search?: string,
   *   sort?: string,
   *   from?: Date,
   *   to?: Date,
   *   dateField?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'creationDate',
   *   includeDeleted?: boolean,
   *   createdByUserId?: string,
   *   departmentCode?: string,
   * }} q
   */
  async findPage(q) {
    const tenantFilter =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    const statusFilter = q.status ? { status: q.status } : {};
    const visibilityFilter = q.visibility ? { visibility: q.visibility } : {};
    const categoryFilter = q.categoryId
      ? { categoryIds: new mongoose.Types.ObjectId(q.categoryId) }
      : {};
    const tagFilter = q.tagKey ? { tagKeys: q.tagKey.trim().toLowerCase() } : {};
    const deletedFilter = q.includeDeleted ? {} : { isDeleted: { $ne: true } };
    const uploaderFilter =
      q.createdByUserId && mongoose.Types.ObjectId.isValid(String(q.createdByUserId))
        ? { createdByUserId: new mongoose.Types.ObjectId(String(q.createdByUserId)) }
        : {};
    const deptCode = typeof q.departmentCode === 'string' ? q.departmentCode.trim().toUpperCase() : '';
    const departmentCodeFilter =
      deptCode.length > 0 ? { 'metadata.departmentCode': deptCode } : {};
    const dateField = q.dateField ?? 'updatedAt';

    const filter = mergeFilters(
      tenantFilter,
      uploaderFilter,
      departmentCodeFilter,
      statusFilter,
      visibilityFilter,
      categoryFilter,
      tagFilter,
      deletedFilter,
      buildSearchOrFilter(q.search, ['decreeNumber', 'titleSummary', 'titlePs', 'titleFa', 'titleEn']),
      buildDateRangeFilter(q.from, q.to, dateField),
    );

    const sort = parseSortQuery(
      q.sort,
      ['createdAt', 'updatedAt', 'publishedAt', 'creationDate', 'decreeNumber', 'titleSummary', 'status', 'effectiveFrom'],
      { updatedAt: -1 },
    );

    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * Public catalog: visibility `public`, soft-delete aware, optional locale match on published version.
   *
   * @param {{
   *   skip: number,
   *   limit: number,
   *   tenantId?: string | null,
   *   status?: string,
   *   categoryId?: string,
   *   keyword?: string,
   *   language?: string,
   *   sort?: string,
   *   from?: Date,
   *   to?: Date,
   *   dateField?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'creationDate',
   * }} q
   */
  async findPublicCatalogPage(q) {
    const tenantFilter =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    const visibilityFilter = { visibility: 'public' };
    const deletedFilter = { isDeleted: { $ne: true } };
    // Public portal should only surface currently active decrees.
    const statusFilter = q.status ? { status: q.status } : { status: { $in: [DecreeLifecycle.ACTIVE] } };
    const categoryFilter = q.categoryId
      ? { categoryIds: new mongoose.Types.ObjectId(q.categoryId) }
      : {};
    const keyword = q.keyword?.trim();
    const searchFilter = buildSearchOrFilter(keyword && keyword.length > 0 ? keyword : undefined, [
      'decreeNumber',
      'titleSummary',
      'titlePs',
      'titleFa',
      'titleEn',
    ]);

    const match = mergeFilters(
      tenantFilter,
      visibilityFilter,
      deletedFilter,
      statusFilter,
      categoryFilter,
      searchFilter,
      buildDateRangeFilter(q.from, q.to, q.dateField ?? 'publishedAt'),
    );

    const sort = parseSortQuery(
      q.sort,
      ['createdAt', 'updatedAt', 'publishedAt', 'creationDate', 'decreeNumber', 'titleSummary', 'status', 'effectiveFrom'],
      { publishedAt: -1 },
    );

    const language = q.language?.trim().toLowerCase();
    if (language) {
      const pipeline = [
        { $match: match },
        {
          $lookup: {
            from: 'decree_versions',
            localField: 'currentPublishedVersionId',
            foreignField: '_id',
            as: '_pubVer',
          },
        },
        { $unwind: { path: '$_pubVer', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            '_pubVer.localizedContent': { $elemMatch: { locale: language } },
            '_pubVer.publicationStatus': 'published',
          },
        },
        { $project: { _pubVer: 0 } },
        {
          $facet: {
            meta: [{ $count: 'total' }],
            items: [{ $sort: sort }, { $skip: q.skip }, { $limit: q.limit }],
          },
        },
      ];

      const [facetRow] = await this.model.aggregate(pipeline);
      const total = facetRow?.meta?.[0]?.total ?? 0;
      const items = facetRow?.items ?? [];
      return { items, total };
    }

    const [items, total] = await Promise.all([
      this.model.find(match).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(match),
    ]);

    return { items, total };
  }

  /**
   * One-time safety net: legacy data can have archived/superseded decrees still holding a `#n` slot.
   * This detaches retired decrees from category numbering so new uploads can reuse #1..#n.
   *
   * @param {{ tenantId?: string | null, categoryId: string, session?: import('mongoose').ClientSession }} q
   */
  async detachRetiredNumberedInCategory(q) {
    const tenantPart =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    const filter = mergeFilters(tenantPart, {
      numberingCategoryId: new mongoose.Types.ObjectId(q.categoryId),
      isDeleted: { $ne: true },
      categorySequence: { $gt: 0 },
      status: { $in: [DecreeLifecycle.ARCHIVED, DecreeLifecycle.SUPERSEDED] },
    });
    return this.model.updateMany(
      filter,
      [
        {
          $set: {
            categorySequence: null,
            numberingCategoryId: null,
            decreeNumber: { $concat: ['arch-', { $toString: '$_id' }] },
          },
        },
      ],
      q.session ? { session: q.session } : undefined,
    );
  }

  /**
   * Published / public-catalog style count (matches `findPublicCatalogPage` without language filter).
   */
  async countPublicCatalogDecrees() {
    const match = mergeFilters(
      { visibility: 'public' },
      { isDeleted: { $ne: true } },
      { status: { $in: [DecreeLifecycle.ACTIVE, DecreeLifecycle.ARCHIVED] } },
    );
    return this.model.countDocuments(match);
  }

  /**
   * @param {string} id
   * @param {import('mongoose').ClientSession} [session]
   */
  async incrementDownloadCount(id, session) {
    if (!mongoose.Types.ObjectId.isValid(id)) return { modifiedCount: 0 };
    return this.model.updateOne(
      { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } },
      { $inc: { downloadCount: 1 } },
      { session },
    );
  }
}

export const decreeRepository = new DecreeRepository();
