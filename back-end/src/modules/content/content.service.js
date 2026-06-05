import mongoose from 'mongoose';
import { API_VERSION } from '../shared/constants/api.js';
import { staticContentPageRepository } from '../../../database/repositories/static-content-page.repository.js';
import { homepageBannerRepository } from '../../../database/repositories/homepage-banner.repository.js';
import { serializeContentPage } from './serializers/content-page.serializer.js';
import { serializeHomepageBanner } from './serializers/homepage-banner.serializer.js';
import { toOffsetLimit } from '../shared/query/pagination.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import { StaticPageStatus } from '../shared/enums/static-page-status.js';

export class ContentService {
  /**
   * @param {{
   *   pages?: import('../../../database/repositories/static-content-page.repository.js').StaticContentPageRepository,
   *   banners?: import('../../../database/repositories/homepage-banner.repository.js').HomepageBannerRepository,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.pages = deps.pages ?? staticContentPageRepository;
    this.banners = deps.banners ?? homepageBannerRepository;
  }

  getCatalogStatus() {
    return {
      module: 'content',
      apiVersion: API_VERSION,
      decreesIndexed: 0,
    };
  }

  /**
   * @param {import('zod').infer<typeof import('./content.validation.js').listContentPagesQuerySchema>} query
   */
  async listPages(query) {
    const { skip, limit } = toOffsetLimit(query);
    const tenantId = query.tenantId === undefined ? undefined : query.tenantId;
    if (query.publishedOnly) {
      const { items, total } = await this.pages.findPage({
        skip,
        limit,
        sort: query.sort,
        search: query.search,
        from: query.from,
        to: query.to,
        locale: query.locale,
        slug: query.slug,
        tag: query.tag,
        tenantId,
      });
      return {
        items: items.map((p) => serializeContentPage(p)),
        page: query.page,
        limit: query.limit,
        total,
      };
    }

    const { items, total } = await this.pages.findManagementPage({
      skip,
      limit,
      sort: query.sort,
      search: query.search,
      from: query.from,
      to: query.to,
      status: query.pageStatus,
      locale: query.locale,
      slug: query.slug,
      tag: query.tag,
      tenantId,
    });
    return {
      items: items.map((p) => serializeContentPage(p)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {import('zod').infer<typeof import('./content.validation.js').createContentPageBodySchema>} body
   */
  async createPage(body) {
    const doc = {
      slug: body.slug.trim().toLowerCase(),
      locale: body.locale.trim().toLowerCase(),
      title: body.title,
      body: body.body,
      status: body.status,
      publishedAt: body.publishedAt ?? null,
      sortOrder: body.sortOrder ?? 0,
      tags: (body.tags ?? []).map((t) => t.trim().toLowerCase()),
      tenantId: body.tenantId ?? null,
    };
    if (doc.status === StaticPageStatus.PUBLISHED && !doc.publishedAt) {
      doc.publishedAt = new Date();
    }
    const created = await this.pages.create(doc);
    return serializeContentPage(created);
  }

  /**
   * @param {string} id
   * @param {{ publishedOnly?: boolean }} [opts]
   */
  async getPageById(id, opts = {}) {
    const row = await this.pages.findOneByIdNotDeleted(id);
    if (!row) throw new NotFoundError('Content page not found');
    if (opts.publishedOnly && row.status !== StaticPageStatus.PUBLISHED) {
      throw new NotFoundError('Content page not found');
    }
    return serializeContentPage(row);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./content.validation.js').patchContentPageBodySchema>} body
   */
  async patchPage(id, body) {
    const existing = await this.pages.findOneByIdNotDeleted(id);
    if (!existing) throw new NotFoundError('Content page not found');

    /** @type {Record<string, unknown>} */
    const patch = {};
    if (body.slug !== undefined) patch.slug = body.slug.trim().toLowerCase();
    if (body.locale !== undefined) patch.locale = body.locale.trim().toLowerCase();
    if (body.title !== undefined) patch.title = body.title;
    if (body.body !== undefined) patch.body = body.body;
    if (body.status !== undefined) patch.status = body.status;
    if (body.publishedAt !== undefined) patch.publishedAt = body.publishedAt;
    if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
    if (body.tags !== undefined) patch.tags = body.tags.map((t) => t.trim().toLowerCase());
    if (body.tenantId !== undefined) patch.tenantId = body.tenantId;

    const nextStatus = /** @type {string | undefined} */ (patch.status ?? existing.status);
    if (nextStatus === StaticPageStatus.PUBLISHED) {
      const nextPublishedAt = patch.publishedAt !== undefined ? patch.publishedAt : existing.publishedAt;
      if (!nextPublishedAt) patch.publishedAt = new Date();
    }

    const updated = await this.pages.updateByIdLean(id, patch);
    return serializeContentPage(updated ?? { ...existing, ...patch });
  }

  /**
   * @param {import('zod').infer<typeof import('./content.validation.js').listHomepageBannersQuerySchema>} query
   */
  async listBanners(query) {
    const { skip, limit } = toOffsetLimit(query);
    const tenantId = query.tenantId === undefined ? undefined : query.tenantId;
    const { items, total } = await this.banners.findPage({
      skip,
      limit,
      sort: query.sort,
      search: query.search,
      from: query.from,
      to: query.to,
      locale: query.locale,
      publishedOnly: query.publishedOnly,
      tenantId,
    });
    return {
      items: items.map((b) => serializeHomepageBanner(b)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {import('zod').infer<typeof import('./content.validation.js').createHomepageBannerBodySchema>} body
   */
  async createBanner(body) {
    const doc = {
      title: body.title,
      subtitle: body.subtitle ?? '',
      body: body.body ?? '',
      ctaLabel: body.ctaLabel ?? '',
      ctaHref: body.ctaHref ?? '',
      locale: body.locale.trim().toLowerCase(),
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
      activeFrom: body.activeFrom ?? null,
      activeTo: body.activeTo ?? null,
      imageFileId:
        body.imageFileId && mongoose.Types.ObjectId.isValid(body.imageFileId)
          ? new mongoose.Types.ObjectId(body.imageFileId)
          : null,
      tenantId: body.tenantId ?? null,
    };
    const created = await this.banners.create(doc);
    return serializeHomepageBanner(created);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./content.validation.js').patchHomepageBannerBodySchema>} body
   */
  async patchBanner(id, body) {
    const existing = await this.banners.findOneByIdNotDeleted(id);
    if (!existing) throw new NotFoundError('Banner not found');

    /** @type {Record<string, unknown>} */
    const patch = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.subtitle !== undefined) patch.subtitle = body.subtitle;
    if (body.body !== undefined) patch.body = body.body;
    if (body.ctaLabel !== undefined) patch.ctaLabel = body.ctaLabel;
    if (body.ctaHref !== undefined) patch.ctaHref = body.ctaHref;
    if (body.locale !== undefined) patch.locale = body.locale.trim().toLowerCase();
    if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) patch.isActive = body.isActive;
    if (body.activeFrom !== undefined) patch.activeFrom = body.activeFrom;
    if (body.activeTo !== undefined) patch.activeTo = body.activeTo;
    if (body.tenantId !== undefined) patch.tenantId = body.tenantId;
    if (body.imageFileId !== undefined) {
      patch.imageFileId =
        body.imageFileId && mongoose.Types.ObjectId.isValid(body.imageFileId)
          ? new mongoose.Types.ObjectId(body.imageFileId)
          : null;
    }

    const updated = await this.banners.updateByIdLean(id, patch);
    return serializeHomepageBanner(updated ?? { ...existing, ...patch });
  }
}

export const contentService = new ContentService();
