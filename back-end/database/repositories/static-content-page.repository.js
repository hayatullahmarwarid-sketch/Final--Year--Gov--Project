import mongoose from 'mongoose';
import { StaticContentPageModel } from '../models/static-content-page.model.js';
import { BaseRepository } from './base.repository.js';
import { mergeFilters } from './repository.helpers.js';
import {
  buildDateRangeFilter,
  buildSearchOrFilter,
  parseSortQuery,
} from '../../src/modules/shared/query/mongo-query.helpers.js';

export class StaticContentPageRepository extends BaseRepository {
  constructor() {
    super(StaticContentPageModel);
  }

  /**
   * @param {{
   *   skip: number,
   *   limit: number,
   *   status?: string,
   *   locale?: string,
   *   tag?: string,
   *   tenantId?: string | null,
   *   sort?: string,
   * }} q
   */
  async findPage(q) {
    const tenantPart =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    const statusFilter = q.status ? { status: q.status } : { status: 'published' };
    const localeFilter = q.locale ? { locale: q.locale.trim().toLowerCase() } : {};
    const tagFilter = q.tag ? { tags: q.tag.trim().toLowerCase() } : {};
    const slugFilter = q.slug ? { slug: q.slug.trim().toLowerCase() } : {};
    const filter = mergeFilters(
      tenantPart,
      statusFilter,
      localeFilter,
      tagFilter,
      slugFilter,
      buildSearchOrFilter(q.search, ['title', 'slug', 'body']),
      buildDateRangeFilter(q.from, q.to, 'createdAt'),
      {
        isDeleted: { $ne: true },
      },
    );
    const sort = parseSortQuery(q.sort, ['publishedAt', 'sortOrder', 'createdAt', 'title'], {
      sortOrder: 1,
      publishedAt: -1,
    });
    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total };
  }

  /**
   * CMS-style listing (draft / published / inactive).
   *
   * @param {{
   *   skip: number,
   *   limit: number,
   *   status?: string,
   *   locale?: string,
   *   tag?: string,
   *   slug?: string,
   *   tenantId?: string | null,
   *   sort?: string,
   *   search?: string,
   *   from?: Date,
   *   to?: Date,
   * }} q
   */
  async findManagementPage(q) {
    const tenantPart =
      q.tenantId === undefined ? {} : { tenantId: q.tenantId === null ? null : q.tenantId };
    const statusFilter = q.status ? { status: q.status } : {};
    const localeFilter = q.locale ? { locale: q.locale.trim().toLowerCase() } : {};
    const tagFilter = q.tag ? { tags: q.tag.trim().toLowerCase() } : {};
    const slugFilter = q.slug ? { slug: q.slug.trim().toLowerCase() } : {};
    const filter = mergeFilters(
      tenantPart,
      statusFilter,
      localeFilter,
      tagFilter,
      slugFilter,
      buildSearchOrFilter(q.search, ['title', 'slug', 'body']),
      buildDateRangeFilter(q.from, q.to, 'createdAt'),
      {
        isDeleted: { $ne: true },
      },
    );
    const sort = parseSortQuery(q.sort, ['publishedAt', 'sortOrder', 'createdAt', 'title'], {
      sortOrder: 1,
      publishedAt: -1,
    });
    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total };
  }

  /**
   * @param {string} id
   * @param {Record<string, unknown>} patch
   */
  async updateByIdLean(id, patch) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } },
        { $set: patch },
        { new: true },
      )
      .lean();
  }

  /**
   * @param {string} id
   */
  async findOneByIdNotDeleted(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return this.model.findOne({ _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } }).lean();
  }

  /**
   * @param {string[]} ids
   */
  async findByIdsLean(ids) {
    if (!ids.length) return [];
    const oid = ids.map((id) => new mongoose.Types.ObjectId(id));
    return this.model.find({ _id: { $in: oid }, isDeleted: { $ne: true } }).lean();
  }
}

export const staticContentPageRepository = new StaticContentPageRepository();
