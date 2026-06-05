import mongoose from 'mongoose';
import { getLogger } from '../../config/logger.js';
import { withMongoTransaction } from '../../core/database/mongo-session.js';
import { API_VERSION } from '../shared/constants/api.js';
import { DecreeLifecycle } from '../shared/enums/decree-lifecycle.js';
import { BadRequestError, ConflictError, NotFoundError } from '../shared/http/index.js';
import { toOffsetLimit } from '../shared/query/pagination.js';
import { decreeCategoryRepository } from '../../../database/repositories/decree-category.repository.js';
import { decreeRepository } from '../../../database/repositories/decree.repository.js';
import { decreeVersionRepository } from '../../../database/repositories/decree-version.repository.js';
import { userRepository } from '../../../database/repositories/user.repository.js';
import { DECREE_COMPLETENESS_ROOT_KEYS, DECREE_COMPLETENESS_VERSION_KEYS } from './decree-upload.constants.js';
import { serializeDecree } from './serializers/decree.serializer.js';
import { serializeDecreeCategory } from './serializers/decree-category.serializer.js';
import { serializeDecreeVersion } from './serializers/decree-version.serializer.js';
import { RoleKey } from '../shared/enums/roles.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { deptUploadSettingsRepository } from '../../../database/repositories/dept-upload-settings.repository.js';
import { serializeDeptUploadSettings } from './serializers/dept-upload-settings.serializer.js';
import { allocateReportOfficialReference } from '../../services/reference-generation/reference-generation.service.js';

/**
 * @param {string | undefined | null} userId
 */
function toActorObjectId(userId) {
  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) return null;
  return new mongoose.Types.ObjectId(userId);
}

/**
 * @param {string[] | undefined} keys
 */
function normalizeTagKeys(keys) {
  if (!keys) return undefined;
  return keys.map((k) => k.trim().toLowerCase()).filter(Boolean);
}

/**
 * @param {unknown} existing
 * @param {Record<string, unknown>} extra
 */
function mergeDecreeMetadata(existing, extra) {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
  return { ...base, ...extra };
}

function stripHtmlToText(html) {
  const s = String(html ?? '');
  // Very small sanitizer: remove tags, keep spaces, decode common entities lightly.
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text) {
  const s = String(text ?? '').trim();
  if (!s) return 0;
  // Split on whitespace; treat punctuation as part of tokens (fine for our 30-word pagination).
  return s.split(/\s+/g).filter(Boolean).length;
}

/** Denormalized `titleSummary` for search / legacy clients: prefer English, then Pashto, then Dari. */
function deriveTitleSummaryFromTrilingual(en, ps, fa) {
  const t = (s) => String(s ?? '').trim();
  return t(en) || t(ps) || t(fa);
}

/**
 * 30 words = 1 article/page. Returns `{ [locale]: pages }` where pages is `>=1` when there is text.
 * Missing/empty locale blocks are omitted.
 *
 * @param {any} versionLean
 */
function computeLocalizedPageCounts(versionLean) {
  const blocks = Array.isArray(versionLean?.localizedContent) ? versionLean.localizedContent : [];
  /** @type {Record<string, number>} */
  const out = {};
  for (const b of blocks) {
    const locale = String(b?.locale ?? '').trim().toLowerCase();
    if (!locale) continue;
    const plain = String(b?.bodyPlain ?? '').trim();
    const rich = String(b?.bodyRich ?? '').trim();
    const text = plain || (rich ? stripHtmlToText(rich) : '');
    const wc = wordCount(text);
    if (!wc) continue;
    out[locale] = Math.max(1, Math.ceil(wc / 30));
  }
  return out;
}

/**
 * @param {Record<string, unknown>} decree
 * @param {Record<string, unknown> | null | undefined} version
 */
export function computeMetadataCompleteness(decree, version) {
  /** @type {string[]} */
  const missingKeys = [];

  if (!String(decree.decreeNumber ?? '').trim()) missingKeys.push('decreeNumber');
  if (!String(decree.titleSummary ?? '').trim()) missingKeys.push('titleSummary');
  if (!(decree.categoryIds ?? []).length) missingKeys.push('categoryIds');

  if (!version) {
    for (const k of DECREE_COMPLETENESS_VERSION_KEYS) missingKeys.push(`version:${k}`);
  } else {
    if (!version.effectiveFrom) missingKeys.push('version:effectiveFrom');
    const loc = /** @type {any[]} */ (version.localizedContent ?? []);
    const hasMeaningful = loc.some(
      (b) =>
        b?.locale &&
        (String(b.title ?? '').trim() || String(b.bodyPlain ?? '').trim() || String(b.bodyRich ?? '').trim()),
    );
    if (!hasMeaningful) missingKeys.push('version:localizedContent');
  }

  const totalChecks =
    DECREE_COMPLETENESS_ROOT_KEYS.length + DECREE_COMPLETENESS_VERSION_KEYS.length;
  const score = Math.max(0, Math.min(100, Math.round(100 * (1 - missingKeys.length / totalChecks))));

  return {
    score,
    missingKeys,
    evaluatedAt: new Date(),
  };
}

export class DecreeUploadService {
  getModuleMeta() {
    return {
      module: 'decree-upload',
      apiVersion: API_VERSION,
      description: 'Decree ingestion, categories, versions, attachments, publication, and search APIs.',
    };
  }

  async getDeptUploadSettings() {
    const doc = await deptUploadSettingsRepository.findSingletonLean();
    return serializeDeptUploadSettings(doc);
  }

  /**
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').patchDeptUploadSettingsBodySchema>} patch
   */
  async patchDeptUploadSettings(patch) {
    const next = await deptUploadSettingsRepository.upsertMergeSingleton((current) => {
      const base = current && typeof current === 'object' ? current : {};
      const department =
        base.department && typeof base.department === 'object' ? base.department : {};
      const system = base.system && typeof base.system === 'object' ? base.system : {};
      const notifications =
        base.notifications && typeof base.notifications === 'object' ? base.notifications : {};
      const storage = base.storage && typeof base.storage === 'object' ? base.storage : {};

      const nextDepartment = patch.department ? { ...department, ...patch.department } : department;
      const nextSystem = patch.system ? { ...system, ...patch.system } : system;
      const nextNotifications = patch.notifications
        ? (() => {
            const merged = {
              ...notifications,
              ...patch.notifications,
              push: patch.notifications.push
                ? {
                    ...(notifications.push && typeof notifications.push === 'object' ? notifications.push : {}),
                    ...patch.notifications.push,
                  }
                : notifications.push,
            };
            if (merged && typeof merged === 'object' && 'email' in merged) {
              const rest = { .../** @type {Record<string, unknown>} */ (merged) };
              delete rest.email;
              return rest;
            }
            return merged;
          })()
        : (() => {
            const n = notifications && typeof notifications === 'object' ? { ...notifications } : {};
            if ('email' in n) delete n.email;
            return n;
          })();
      const nextStorage = patch.storage ? { ...storage, ...patch.storage } : storage;

      // Enforce Kabul strictly, regardless of patch.
      return {
        ...base,
        department: nextDepartment,
        system: { ...nextSystem, timezone: 'Asia/Kabul' },
        notifications: nextNotifications,
        storage: nextStorage,
        schemaVersion: typeof base.schemaVersion === 'number' ? base.schemaVersion : 1,
        docKey: base.docKey ?? 'dept_upload',
      };
    });
    return serializeDeptUploadSettings(next);
  }

  /**
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').listCategoriesQuerySchema>} q
   */
  /**
   * @param {string} id
   */
  async getCategoryById(id) {
    const row = await decreeCategoryRepository.findByIdLean(id);
    if (!row) throw new NotFoundError('Category not found');
    return serializeDecreeCategory(row);
  }

  async listCategories(q) {
    const { skip, limit } = toOffsetLimit({ page: q.page, limit: q.limit });
    let parentCategoryId = q.parentCategoryId;
    if (parentCategoryId === 'null') parentCategoryId = null;
    const isActive =
      q.isActive === 'true' ? true : q.isActive === 'false' ? false : undefined;

    const { items, total } = await decreeCategoryRepository.findPage({
      skip,
      limit,
      tenantId: q.tenantId,
      isActive,
      parentCategoryId: parentCategoryId === null ? null : parentCategoryId,
      search: q.search,
      sort: q.sort,
    });

    return {
      items: items.map((row) => serializeDecreeCategory(row)),
      page: q.page,
      limit,
      total,
    };
  }

  /**
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').createCategoryBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async createCategory(body, actorUserId) {
    const actor = toActorObjectId(actorUserId);
    const tenantId = body.tenantId === undefined ? null : body.tenantId;
    const slug = body.slug.trim().toLowerCase();

    const dup = await decreeCategoryRepository.findBySlugLean(tenantId, slug);
    if (dup) throw new ConflictError('Category slug already exists for tenant');

    const row = await decreeCategoryRepository.createWithSession(
      {
        slug,
        name: body.name.trim(),
        namePs: body.namePs ?? null,
        nameFa: body.nameFa ?? null,
        description: body.description ?? null,
        parentCategoryId: body.parentCategoryId ? new mongoose.Types.ObjectId(body.parentCategoryId) : null,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive !== false,
        tenantId,
        createdByUserId: actor,
        updatedByUserId: actor,
      },
      undefined,
    );

    return serializeDecreeCategory(row);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').patchCategoryBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async patchCategory(id, body, actorUserId) {
    const actor = toActorObjectId(actorUserId);
    const existing = await decreeCategoryRepository.findByIdLean(id);
    if (!existing) throw new NotFoundError('Category not found');

    const update = /** @type {Record<string, unknown>} */ ({
      updatedByUserId: actor,
    });
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.namePs !== undefined) update.namePs = body.namePs;
    if (body.nameFa !== undefined) update.nameFa = body.nameFa;
    if (body.description !== undefined) update.description = body.description;
    if (body.parentCategoryId !== undefined) {
      update.parentCategoryId = body.parentCategoryId
        ? new mongoose.Types.ObjectId(body.parentCategoryId)
        : null;
    }
    if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) update.isActive = body.isActive;

    const updated = await decreeCategoryRepository.updateByIdLean(id, update, undefined);
    return serializeDecreeCategory(updated);
  }

  /**
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').listDecreesQuerySchema>} q
   * @param {{ uploaderId?: string | undefined }} [opts] When set (dept uploader), restrict to that creator.
   */
  async listDecrees(q, opts = {}) {
    const { skip, limit } = toOffsetLimit({ page: q.page, limit: q.limit });
    const { items, total } = await decreeRepository.findPage({
      skip,
      limit,
      tenantId: q.tenantId,
      status: q.status,
      categoryId: q.categoryId,
      tagKey: q.tagKey,
      visibility: q.visibility,
      search: q.search,
      sort: q.sort,
      from: q.from,
      to: q.to,
      dateField: q.dateField,
      createdByUserId: opts.uploaderId,
      departmentCode: q.departmentCode,
    });

    const uploaderIds = [
      ...new Set(items.map((d) => (d.createdByUserId ? String(d.createdByUserId) : '')).filter(Boolean)),
    ];
    const users = uploaderIds.length ? await userRepository.findByIdsLean(uploaderIds) : [];
    const uMap = new Map(users.map((u) => [String(u._id), u]));

    const versionIds = [
      ...new Set(
        items.flatMap((d) => [d.currentPublishedVersionId, d.activeDraftVersionId].filter(Boolean).map(String)),
      ),
    ];
    const versions = await decreeVersionRepository.findByIdsLean(versionIds);
    const vMap = new Map(versions.map((v) => [String(v._id), v]));

    const catIds = [...new Set(items.flatMap((d) => (d.categoryIds ?? []).map(String)))];
    const cats = await decreeCategoryRepository.findByIdsLean(catIds);
    const cMap = new Map(cats.map((c) => [String(c._id), c]));

    return {
      items: items.map((d) =>
        serializeDecree(d, {
          categories: (d.categoryIds ?? []).map((cid) => cMap.get(String(cid))).filter(Boolean),
          currentPublishedVersion: d.currentPublishedVersionId
            ? vMap.get(String(d.currentPublishedVersionId))
            : null,
          activeDraftVersion: d.activeDraftVersionId ? vMap.get(String(d.activeDraftVersionId)) : null,
          listStripVersionBodies: true,
          createdByUser: d.createdByUserId ? uMap.get(String(d.createdByUserId)) ?? null : null,
        }),
      ),
      page: q.page,
      limit,
      total,
    };
  }

  /**
   * @param {string[]} categoryIds
   */
  async assertCategoriesExist(categoryIds) {
    if (!categoryIds.length) return;
    const rows = await decreeCategoryRepository.findByIdsLean(categoryIds);
    if (rows.length !== categoryIds.length) {
      throw new BadRequestError('One or more categoryIds are invalid');
    }
  }

  /**
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').createDecreeBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async createDecree(body, actorUserId) {
    const actor = toActorObjectId(actorUserId);
    const tenantId = body.tenantId === undefined ? null : body.tenantId;
    await this.assertCategoriesExist(body.categoryIds);
    const firstCat = String(body.categoryIds[0]);
    const initial = body.initialVersion ?? {};
    const initialPublication = body.initialPublication ?? 'draft';
    const initialLifecycle =
      initialPublication === 'published'
        ? null
        : initialPublication === 'pending'
          ? DecreeLifecycle.PENDING
          : DecreeLifecycle.DRAFT;

    const decreeId = new mongoose.Types.ObjectId();
    const lineageRootDecreeId = decreeId;

    const versionDoc = {
      decreeId,
      lineageRootDecreeId,
      versionNumber: 1,
      supersedesVersionId: null,
      publicationStatus: 'draft',
      isImmutable: false,
      changeSummary: initial.changeSummary ?? null,
      localizedContent: initial.localizedContent ?? [],
      sections: initial.sections ?? [],
      effectiveFrom: initial.effectiveFrom ?? null,
      effectiveTo: initial.effectiveTo ?? null,
      tenantId,
      createdByUserId: actor,
      updatedByUserId: actor,
    };

    await withMongoTransaction(async (session) => {
      const numberingCategoryId = new mongoose.Types.ObjectId(firstCat);
      const nextSeq = await decreeRepository.getNextIndexInCategory(tenantId, firstCat, null, session);
      const legacy = String(body.titleSummary ?? '').trim();
      const titlePs = String(body.titlePs ?? '').trim() || legacy;
      const titleFa = String(body.titleFa ?? '').trim() || legacy;
      const titleEn = String(body.titleEn ?? '').trim() || legacy;
      const titleSummary = deriveTitleSummaryFromTrilingual(titleEn, titlePs, titleFa);
      const decreeBase = {
        _id: decreeId,
        decreeNumber: String(nextSeq),
        categorySequence: nextSeq,
        numberingCategoryId,
        titleSummary,
        titlePs,
        titleFa,
        titleEn,
        categoryIds: body.categoryIds.map((c) => new mongoose.Types.ObjectId(c)),
        tagKeys: normalizeTagKeys(body.tagKeys) ?? [],
        status: initialLifecycle ?? DecreeLifecycle.DRAFT,
        lineageRootDecreeId,
        currentPublishedVersionId: null,
        activeDraftVersionId: null,
        supersededByDecreeId: null,
        effectiveFrom: null,
        effectiveTo: null,
        publishedAt: null,
        lastAmendedAt: null,
        creationDate: body.creationDate ?? null,
        visibility: body.visibility ?? 'public',
        tenantId,
        metadata: mergeDecreeMetadata(body.metadata, {
          referenceScheme: 'category_sequence',
        }),
        createdByUserId: actor,
        updatedByUserId: actor,
      };
      await decreeRepository.createWithSession(decreeBase, session);
      const versionRow = await decreeVersionRepository.createWithSession(versionDoc, session);
      await decreeRepository.updateByIdLean(
        decreeId,
        { activeDraftVersionId: versionRow._id, updatedByUserId: actor },
        session,
      );

      if (initialPublication === 'published') {
        const vId = String(versionRow._id);
        const version = await decreeVersionRepository.findByIdLean(vId, { session });
        if (!version) throw new NotFoundError('Decree version not found');
        const publishedAt = new Date();
        const effectiveFrom = initial.effectiveFrom ? new Date(initial.effectiveFrom) : (version.effectiveFrom ?? publishedAt);
        const effectiveTo = initial.effectiveTo !== undefined ? initial.effectiveTo : version.effectiveTo;
        const localizedPageCounts = computeLocalizedPageCounts(version);
        await decreeVersionRepository.updateByIdLean(
          vId,
          {
            publicationStatus: 'published',
            isImmutable: true,
            publishedAt,
            effectiveFrom,
            effectiveTo,
            publishedByUserId: actor,
            updatedByUserId: actor,
          },
          session,
        );
        await decreeRepository.updateByIdLean(
          decreeId,
          {
            status: DecreeLifecycle.ACTIVE,
            currentPublishedVersionId: new mongoose.Types.ObjectId(vId),
            activeDraftVersionId: null,
            publishedAt,
            lastAmendedAt: publishedAt,
            effectiveFrom,
            effectiveTo,
            metadata: mergeDecreeMetadata(body.metadata, {
              localizedPageCounts,
            }),
            updatedByUserId: actor,
          },
          session,
        );
      }
    });

    const after = await decreeRepository.findByIdLean(String(decreeId));
    if (!after) throw new NotFoundError('Decree not found');
    const verForComplete = after.currentPublishedVersionId
      ? await decreeVersionRepository.findByIdLean(String(after.currentPublishedVersionId))
      : after.activeDraftVersionId
        ? await decreeVersionRepository.findByIdLean(String(after.activeDraftVersionId))
        : null;
    const completeness = computeMetadataCompleteness(after, verForComplete);
    await decreeRepository.updateByIdLean(String(decreeId), {
      metadataCompleteness: completeness,
      updatedByUserId: actor,
    });

    if (initialPublication === 'published' && after) {
      const num = String(after.decreeNumber ?? '').trim() || '—';
      const titleTxt = String(after.titleSummary ?? '').trim() || 'New decree';
      const bodyText = `${num}: ${titleTxt}`;
      notificationsService
        .create({
          title: 'New decree issued',
          body: bodyText,
          channel: 'in_app',
          recipientRoleKey: RoleKey.PUBLIC_USER,
          metadata: {
            eventKind: 'public_catalog_update',
            type: 'new_decree',
            decreeId: String(after._id),
            decreeNumber: after.decreeNumber,
            titleSummary: after.titleSummary,
          },
        })
        .catch((err) => getLogger().warn({ err }, 'decree.create.publish_notify_failed'));
      if (after.createdByUserId) {
        notificationsService
          .create({
            title: 'Decree published',
            body: bodyText,
            channel: 'in_app',
            recipientUserId: String(after.createdByUserId),
            metadata: {
              eventKind: 'dept_status_change',
              type: 'decree_published_owner',
              decreeId: String(after._id),
            },
          })
          .catch((err) => getLogger().warn({ err }, 'decree.create.owner_publish_notify_failed'));
      }
    }

    if (initialPublication !== 'published' && after) {
      const num = String(after.decreeNumber ?? '').trim() || '—';
      const titleTxt = String(after.titleSummary ?? '').trim() || 'Decree';
      const bodyTxt = `${num}: ${titleTxt}`;
      for (const rk of [RoleKey.INSPECTOR, RoleKey.INSPECTOR_ADMIN]) {
        notificationsService
          .create({
            title: 'Decree awaiting review',
            body: bodyTxt,
            channel: 'in_app',
            recipientRoleKey: rk,
            metadata: {
              eventKind: 'dept_new_upload',
              type: 'decree_submitted',
              decreeId: String(after._id),
              decreeNumber: after.decreeNumber,
              titleSummary: after.titleSummary,
            },
          })
          .catch((err) => getLogger().warn({ err, roleKey: rk }, 'decree.create.inspectors_notify_failed'));
      }
    }

    return this.getDecreeById(String(decreeId));
  }

  /**
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').nextDecreeNumberQuerySchema>} q
   */
  async getNextDecreeNumberPreview(q) {
    await this.assertCategoriesExist([q.categoryId]);
    const tenantId = q.tenantId === undefined ? null : q.tenantId;
    const nextSeq = await decreeRepository.getNextIndexInCategory(tenantId, q.categoryId, null, undefined);
    return {
      nextIndex: nextSeq,
      displayLabel: `#${nextSeq}`,
      departmentCodeReference: undefined,
      categoryId: q.categoryId,
    };
  }

  async allocateAnalyticsReportReference() {
    return allocateReportOfficialReference(undefined);
  }

  /**
   * @param {string} id
   * @param {{ stripListBodies?: boolean }} [opts]
   */
  async getDecreeById(id, opts = {}) {
    const decree = await decreeRepository.findByIdLean(id);
    if (!decree) throw new NotFoundError('Decree not found');

    const [cats, pub, draft] = await Promise.all([
      decree.categoryIds?.length
        ? decreeCategoryRepository.findByIdsLean((decree.categoryIds ?? []).map(String))
        : [],
      decree.currentPublishedVersionId
        ? decreeVersionRepository.findByIdLean(String(decree.currentPublishedVersionId))
        : null,
      decree.activeDraftVersionId
        ? decreeVersionRepository.findByIdLean(String(decree.activeDraftVersionId))
        : null,
    ]);

    return serializeDecree(decree, {
      categories: cats,
      currentPublishedVersion: pub,
      activeDraftVersion: draft,
      listStripVersionBodies: opts.stripListBodies === true,
      createdByUser: decree.createdByUserId ? await userRepository.findByIdLean(String(decree.createdByUserId)) : null,
    });
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').patchDecreeBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async patchDecree(id, body, actorUserId) {
    const actor = toActorObjectId(actorUserId);
    const publishAfter = body.publish === true;
    let decree = await decreeRepository.findByIdLean(id);
    if (!decree) throw new NotFoundError('Decree not found');

    if (decree.status === DecreeLifecycle.SUPERSEDED) {
      throw new BadRequestError('Superseded decrees cannot be modified');
    }

    /** Active decrees need a working draft row before `draftVersion` can be applied. */
    if (
      body.draftVersion &&
      decree.status === DecreeLifecycle.ACTIVE &&
      !decree.activeDraftVersionId &&
      decree.currentPublishedVersionId
    ) {
      await this.createAmendment(id, {}, actorUserId);
      decree = await decreeRepository.findByIdLean(id);
      if (!decree) throw new NotFoundError('Decree not found');
    }

    if (body.categoryIds) await this.assertCategoriesExist(body.categoryIds);
    if (
      publishAfter &&
      decree.status !== DecreeLifecycle.DRAFT &&
      decree.status !== DecreeLifecycle.PENDING
    ) {
      throw new BadRequestError('Only draft or pending decrees can be published from PATCH');
    }

    const update = /** @type {Record<string, unknown>} */ ({ updatedByUserId: actor });

    if (decree.status === DecreeLifecycle.DRAFT || decree.status === DecreeLifecycle.PENDING) {
      const dm =
        decree.metadata && typeof decree.metadata === 'object' && !Array.isArray(decree.metadata)
          ? decree.metadata
          : {};
      if (
        body.decreeNumber !== undefined &&
        (dm.referenceScheme === 'department_prefix' || dm.referenceScheme === 'category_sequence')
      ) {
        throw new BadRequestError('Official decree reference is immutable');
      }
      if (body.decreeNumber !== undefined) {
        if (decree.categorySequence != null && Number(decree.categorySequence) > 0) {
          throw new BadRequestError('Decree number is assigned per category; change the category to renumber');
        }
        const tenantId = decree.tenantId ?? null;
        const other = await decreeRepository.findByDecreeNumberLean({
          tenantId,
          decreeNumber: body.decreeNumber.trim(),
        });
        if (other && String(other._id) !== String(decree._id)) {
          throw new ConflictError('Decree number already exists for this tenant');
        }
        update.decreeNumber = body.decreeNumber.trim();
      }
      if (body.titlePs !== undefined || body.titleFa !== undefined || body.titleEn !== undefined) {
        const ps =
          body.titlePs !== undefined
            ? body.titlePs.trim()
            : String(decree.titlePs ?? decree.titleSummary ?? '').trim();
        const fa =
          body.titleFa !== undefined
            ? body.titleFa.trim()
            : String(decree.titleFa ?? decree.titleSummary ?? '').trim();
        const en =
          body.titleEn !== undefined
            ? body.titleEn.trim()
            : String(decree.titleEn ?? decree.titleSummary ?? '').trim();
        update.titlePs = ps;
        update.titleFa = fa;
        update.titleEn = en;
        update.titleSummary = deriveTitleSummaryFromTrilingual(en, ps, fa) || String(decree.titleSummary ?? '').trim();
      } else if (body.titleSummary !== undefined) {
        update.titleSummary = body.titleSummary.trim();
      }
      if (body.categoryIds !== undefined) {
        const newIds = body.categoryIds.map((c) => new mongoose.Types.ObjectId(c));
        update.categoryIds = newIds;
        const meta =
          decree.metadata && typeof decree.metadata === 'object' && !Array.isArray(decree.metadata)
            ? decree.metadata
            : {};
        const usesOfficialRef = meta.referenceScheme === 'department_prefix';
        const newFirst = String(body.categoryIds[0]);
        const oldFirst = (decree.categoryIds ?? [])[0] ? String((decree.categoryIds ?? [])[0]) : '';
        if (newFirst !== oldFirst) {
          update.numberingCategoryId = new mongoose.Types.ObjectId(newFirst);
          if (!usesOfficialRef) {
            const tenantId = decree.tenantId ?? null;
            const n = await decreeRepository.getNextIndexInCategory(tenantId, newFirst, id, undefined);
            update.categorySequence = n;
            update.decreeNumber = String(n);
          }
        }
      }
      if (body.tagKeys !== undefined) update.tagKeys = normalizeTagKeys(body.tagKeys) ?? [];
      if (body.visibility !== undefined) update.visibility = body.visibility;
      if (body.metadata !== undefined) update.metadata = body.metadata;
    } else if (decree.status === DecreeLifecycle.ACTIVE) {
      if (body.decreeNumber !== undefined) throw new BadRequestError('decreeNumber is immutable after publish');
      if (body.titlePs !== undefined || body.titleFa !== undefined || body.titleEn !== undefined) {
        const ps =
          body.titlePs !== undefined
            ? body.titlePs.trim()
            : String(decree.titlePs ?? decree.titleSummary ?? '').trim();
        const fa =
          body.titleFa !== undefined
            ? body.titleFa.trim()
            : String(decree.titleFa ?? decree.titleSummary ?? '').trim();
        const en =
          body.titleEn !== undefined
            ? body.titleEn.trim()
            : String(decree.titleEn ?? decree.titleSummary ?? '').trim();
        update.titlePs = ps;
        update.titleFa = fa;
        update.titleEn = en;
        update.titleSummary = deriveTitleSummaryFromTrilingual(en, ps, fa) || String(decree.titleSummary ?? '').trim();
      } else if (body.titleSummary !== undefined) {
        update.titleSummary = body.titleSummary.trim();
      }
      if (body.categoryIds !== undefined) {
        update.categoryIds = body.categoryIds.map((c) => new mongoose.Types.ObjectId(c));
      }
      if (body.tagKeys !== undefined) update.tagKeys = normalizeTagKeys(body.tagKeys) ?? [];
      if (body.visibility !== undefined) update.visibility = body.visibility;
      if (body.metadata !== undefined) update.metadata = body.metadata;
    } else if (decree.status === DecreeLifecycle.ARCHIVED) {
      if (
        body.titleSummary !== undefined ||
        body.categoryIds !== undefined ||
        body.tagKeys !== undefined ||
        body.visibility !== undefined ||
        body.decreeNumber !== undefined
      ) {
        throw new BadRequestError('Archived decrees only allow metadata updates');
      }
      if (body.metadata !== undefined) update.metadata = body.metadata;
    }

    let nextDecree = await decreeRepository.updateByIdLean(id, update);
    if (!nextDecree) throw new NotFoundError('Decree not found');

    const canEditDraftVersion =
      decree.status === DecreeLifecycle.DRAFT ||
      decree.status === DecreeLifecycle.PENDING ||
      (decree.status === DecreeLifecycle.ACTIVE && Boolean(decree.activeDraftVersionId));

    if (body.draftVersion && canEditDraftVersion) {
      const draftId = nextDecree.activeDraftVersionId;
      if (!draftId) throw new BadRequestError('No draft version to update');
      const draft = await decreeVersionRepository.findByIdLean(String(draftId));
      if (!draft || draft.publicationStatus !== 'draft') {
        throw new BadRequestError('Active draft version is not editable');
      }
      const vUpdate = /** @type {Record<string, unknown>} */ ({ updatedByUserId: actor });
      if (body.draftVersion.changeSummary !== undefined) vUpdate.changeSummary = body.draftVersion.changeSummary;
      if (body.draftVersion.localizedContent !== undefined) {
        vUpdate.localizedContent = body.draftVersion.localizedContent;
      }
      if (body.draftVersion.sections !== undefined) vUpdate.sections = body.draftVersion.sections;
      if (body.draftVersion.effectiveFrom !== undefined) vUpdate.effectiveFrom = body.draftVersion.effectiveFrom;
      if (body.draftVersion.effectiveTo !== undefined) vUpdate.effectiveTo = body.draftVersion.effectiveTo;
      await decreeVersionRepository.updateByIdLean(String(draftId), vUpdate);
    } else if (body.draftVersion) {
      throw new BadRequestError(
        'draftVersion can only be updated for a draft decree or an active decree with an amendment draft',
      );
    }

    nextDecree = (await decreeRepository.findByIdLean(id)) ?? nextDecree;
    const draftRow = nextDecree.activeDraftVersionId
      ? await decreeVersionRepository.findByIdLean(String(nextDecree.activeDraftVersionId))
      : nextDecree.currentPublishedVersionId
        ? await decreeVersionRepository.findByIdLean(String(nextDecree.currentPublishedVersionId))
        : null;
    const completeness = computeMetadataCompleteness(nextDecree, draftRow);
    await decreeRepository.updateByIdLean(id, { metadataCompleteness: completeness, updatedByUserId: actor });

    if (publishAfter) {
      return this.publishDecree(id, {}, actorUserId);
    }
    return this.getDecreeById(id);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').publishDecreeBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async publishDecree(id, body, actorUserId) {
    const actor = toActorObjectId(actorUserId);
    const decreeBefore = await decreeRepository.findByIdLean(id);
    if (!decreeBefore) throw new NotFoundError('Decree not found');
    const wasLifecycleDraft =
      decreeBefore.status === DecreeLifecycle.DRAFT || decreeBefore.status === DecreeLifecycle.PENDING;

    await withMongoTransaction(async (session) => {
      const decree = await decreeRepository.findByIdLean(id, { session });
      if (!decree) throw new NotFoundError('Decree not found');
      if (decree.status === DecreeLifecycle.SUPERSEDED || decree.status === DecreeLifecycle.ARCHIVED) {
        throw new BadRequestError('Cannot publish an archived or superseded decree');
      }

      const versionId = body.versionId ?? (decree.activeDraftVersionId ? String(decree.activeDraftVersionId) : null);
      if (!versionId) throw new BadRequestError('No draft version available to publish');

      const version = await decreeVersionRepository.findByIdLean(versionId, { session });
      if (!version || String(version.decreeId) !== String(decree._id)) {
        throw new BadRequestError('Version does not belong to this decree');
      }
      if (version.publicationStatus !== 'draft') {
        throw new ConflictError('Only draft versions can be published');
      }

      const publishedAt = new Date();
      const effectiveFrom = body.effectiveFrom ?? version.effectiveFrom ?? publishedAt;
      const effectiveTo = body.effectiveTo !== undefined ? body.effectiveTo : version.effectiveTo;
      const localizedPageCounts = computeLocalizedPageCounts(version);

      await decreeVersionRepository.updateByIdLean(
        versionId,
        {
          publicationStatus: 'published',
          isImmutable: true,
          publishedAt,
          effectiveFrom,
          effectiveTo,
          publishedByUserId: actor,
          updatedByUserId: actor,
        },
        session,
      );

      const isFirstPublish = !decree.currentPublishedVersionId;
      await decreeRepository.updateByIdLean(
        id,
        {
          status: DecreeLifecycle.ACTIVE,
          currentPublishedVersionId: new mongoose.Types.ObjectId(versionId),
          activeDraftVersionId: null,
          publishedAt: isFirstPublish ? publishedAt : decree.publishedAt,
          lastAmendedAt: publishedAt,
          effectiveFrom,
          effectiveTo,
          metadata: mergeDecreeMetadata(decree.metadata, {
            localizedPageCounts,
          }),
          updatedByUserId: actor,
        },
        session,
      );
    });

    const decree = await decreeRepository.findByIdLean(id);
    const version = decree?.currentPublishedVersionId
      ? await decreeVersionRepository.findByIdLean(String(decree.currentPublishedVersionId))
      : null;
    const completeness = computeMetadataCompleteness(decree, version);
    await decreeRepository.updateByIdLean(id, { metadataCompleteness: completeness, updatedByUserId: actor });

    if (wasLifecycleDraft && decree) {
      const num = String(decree.decreeNumber ?? '').trim() || '—';
      const titleTxt = String(decree.titleSummary ?? '').trim() || 'New decree';
      const bodyText = `${num}: ${titleTxt}`;
      notificationsService
        .create({
          title: 'New decree issued',
          body: bodyText,
          channel: 'in_app',
          recipientRoleKey: RoleKey.PUBLIC_USER,
          metadata: {
            eventKind: 'public_catalog_update',
            type: 'new_decree',
            decreeId: String(decree._id),
            decreeNumber: decree.decreeNumber,
            titleSummary: decree.titleSummary,
          },
        })
        .catch((err) => getLogger().warn({ err }, 'decree.publish.notify_failed'));
      if (decree.createdByUserId) {
        notificationsService
          .create({
            title: 'Decree published',
            body: bodyText,
            channel: 'in_app',
            recipientUserId: String(decree.createdByUserId),
            metadata: {
              eventKind: 'dept_status_change',
              type: 'decree_published_owner',
              decreeId: String(decree._id),
            },
          })
          .catch((err) => getLogger().warn({ err }, 'decree.publish.owner_notify_failed'));
      }
    }

    return this.getDecreeById(id);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').archiveDecreeBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async archiveDecree(id, body, actorUserId) {
    const actor = toActorObjectId(actorUserId);
    const decree = await decreeRepository.findByIdLean(id);
    if (!decree) throw new NotFoundError('Decree not found');
    if (decree.status === DecreeLifecycle.SUPERSEDED) {
      throw new BadRequestError('Superseded decrees are already retired from active use');
    }
    if (decree.status === DecreeLifecycle.ARCHIVED) return this.getDecreeById(id);

    const reason = body?.reason?.trim();
    await withMongoTransaction(async (session) => {
      const update = /** @type {Record<string, unknown>} */ ({
        status: DecreeLifecycle.ARCHIVED,
        updatedByUserId: actor,
      });
      if (reason) {
        update.metadata = mergeDecreeMetadata(decree.metadata, { lastArchiveReason: reason });
      }
      await decreeRepository.updateByIdLean(id, update, session);

      // Keep category numbering contiguous for future uploads (#1..#n).
      const catId = decree.numberingCategoryId ? String(decree.numberingCategoryId) : null;
      const seq = typeof decree.categorySequence === 'number' ? decree.categorySequence : null;
      const tenantId = decree.tenantId ?? null;
      if (catId && seq && seq > 0) {
        // Detach this decree from numbering, then shift down higher numbers.
        await decreeRepository.detachFromCategorySequence(id, { actorUserId: actor, session });
        await decreeRepository.compactCategorySequencesAfterRemoval({
          tenantId,
          categoryId: catId,
          removedSeq: seq,
          session,
        });
      }
    });

    const next = await decreeRepository.findByIdLean(id);
    const version = next?.currentPublishedVersionId
      ? await decreeVersionRepository.findByIdLean(String(next.currentPublishedVersionId))
      : next?.activeDraftVersionId
        ? await decreeVersionRepository.findByIdLean(String(next.activeDraftVersionId))
        : null;
    const completeness = computeMetadataCompleteness(next, version);
    await decreeRepository.updateByIdLean(id, { metadataCompleteness: completeness, updatedByUserId: actor });

    if (decree.createdByUserId) {
      const num = String(decree.decreeNumber ?? '').trim() || '—';
      const titleTxt = String(decree.titleSummary ?? '').trim() || 'Decree';
      const bodyTxt = `${num}: ${titleTxt}`;
      notificationsService
        .create({
          title: 'Decree archived',
          body: reason ? `${bodyTxt} — ${reason}` : bodyTxt,
          channel: 'in_app',
          recipientUserId: String(decree.createdByUserId),
          metadata: {
            eventKind: 'dept_status_change',
            type: 'decree_archived',
            decreeId: String(decree._id),
            reason: reason ?? null,
          },
        })
        .catch((err) => getLogger().warn({ err }, 'decree.archive.owner_notify_failed'));
    }

    return this.getDecreeById(id);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').supersedeDecreeBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async supersedeDecree(id, body, actorUserId) {
    const actor = toActorObjectId(actorUserId);
    const decree = await decreeRepository.findByIdLean(id);
    if (!decree) throw new NotFoundError('Decree not found');
    if (decree.status !== DecreeLifecycle.ACTIVE) {
      throw new BadRequestError('Only active decrees can be superseded');
    }

    const other = await decreeRepository.findByIdLean(body.supersedingDecreeId);
    if (!other) throw new NotFoundError('Superseding decree not found');
    if (String(other._id) === String(decree._id)) throw new BadRequestError('A decree cannot supersede itself');
    if (other.status === DecreeLifecycle.SUPERSEDED) {
      throw new BadRequestError('Cannot point supersession at a superseded decree');
    }
    if (String(other.lineageRootDecreeId) === String(decree.lineageRootDecreeId)) {
      throw new BadRequestError('Superseding decree must belong to a different lineage');
    }

    const reason = body.reason?.trim();
    await withMongoTransaction(async (session) => {
      const update = /** @type {Record<string, unknown>} */ ({
        status: DecreeLifecycle.SUPERSEDED,
        supersededByDecreeId: new mongoose.Types.ObjectId(body.supersedingDecreeId),
        updatedByUserId: actor,
      });
      if (reason) {
        update.metadata = mergeDecreeMetadata(decree.metadata, { lastSupersededReason: reason });
      }
      await decreeRepository.updateByIdLean(id, update, session);

      // Treat superseded as removed from numbering (fill gaps).
      const catId = decree.numberingCategoryId ? String(decree.numberingCategoryId) : null;
      const seq = typeof decree.categorySequence === 'number' ? decree.categorySequence : null;
      const tenantId = decree.tenantId ?? null;
      if (catId && seq && seq > 0) {
        await decreeRepository.detachFromCategorySequence(id, { actorUserId: actor, session });
        await decreeRepository.compactCategorySequencesAfterRemoval({
          tenantId,
          categoryId: catId,
          removedSeq: seq,
          session,
        });
      }
    });

    const next = await decreeRepository.findByIdLean(id);
    const version = next?.currentPublishedVersionId
      ? await decreeVersionRepository.findByIdLean(String(next.currentPublishedVersionId))
      : null;
    const completeness = computeMetadataCompleteness(next, version);
    await decreeRepository.updateByIdLean(id, { metadataCompleteness: completeness, updatedByUserId: actor });

    return this.getDecreeById(id);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').createAmendmentBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async createAmendment(id, body, actorUserId) {
    const actor = toActorObjectId(actorUserId);
    const decree = await decreeRepository.findByIdLean(id);
    if (!decree) throw new NotFoundError('Decree not found');
    if (decree.status !== DecreeLifecycle.ACTIVE) {
      throw new BadRequestError('Amendments can only be created for active decrees');
    }
    if (!decree.currentPublishedVersionId) {
      throw new BadRequestError('Decree has no published baseline version');
    }
    if (decree.activeDraftVersionId) {
      throw new ConflictError('A draft amendment already exists; publish or edit it first');
    }

    const baselineId = body.copyFromVersionId ?? String(decree.currentPublishedVersionId);
    const baseline = await decreeVersionRepository.findByIdLean(baselineId);
    if (!baseline || String(baseline.decreeId) !== String(decree._id)) {
      throw new BadRequestError('Baseline version is invalid for this decree');
    }
    if (baseline.publicationStatus !== 'published') {
      throw new BadRequestError('Amendments must branch from a published version');
    }

    const nextNum = (await decreeVersionRepository.findMaxVersionNumber(id)) + 1;

    const localizedContent =
      body.localizedContent !== undefined ? body.localizedContent : baseline.localizedContent;
    const sections = body.sections !== undefined ? body.sections : baseline.sections;

    const versionDoc = {
      decreeId: new mongoose.Types.ObjectId(id),
      lineageRootDecreeId: decree.lineageRootDecreeId,
      versionNumber: nextNum,
      supersedesVersionId: baseline._id,
      publicationStatus: 'draft',
      isImmutable: false,
      changeSummary: body.changeSummary ?? null,
      localizedContent: localizedContent ?? [],
      sections: sections ?? [],
      effectiveFrom: body.effectiveFrom !== undefined ? body.effectiveFrom : baseline.effectiveFrom,
      effectiveTo: body.effectiveTo !== undefined ? body.effectiveTo : baseline.effectiveTo,
      tenantId: decree.tenantId ?? null,
      createdByUserId: actor,
      updatedByUserId: actor,
    };

    const created = await decreeVersionRepository.createWithSession(versionDoc, undefined);
    await decreeRepository.updateByIdLean(id, {
      activeDraftVersionId: created._id,
      updatedByUserId: actor,
    });

    const next = await decreeRepository.findByIdLean(id);
    const draft = await decreeVersionRepository.findByIdLean(String(created._id));
    const completeness = computeMetadataCompleteness(next, draft);
    await decreeRepository.updateByIdLean(id, { metadataCompleteness: completeness, updatedByUserId: actor });

    return this.getDecreeById(id);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').listVersionsQuerySchema>} query
   */
  async listVersions(id, query) {
    const decree = await decreeRepository.findByIdLean(id);
    if (!decree) throw new NotFoundError('Decree not found');

    let rows = await decreeVersionRepository.listByDecreeIdLean(id);
    if (query.publicationStatus) {
      rows = rows.filter((r) => r.publicationStatus === query.publicationStatus);
    }
    return rows.map((r) => serializeDecreeVersion(r));
  }

  /**
   * @param {string} decreeId
   * @param {string} versionId
   */
  async getDecreeVersionById(decreeId, versionId) {
    const decree = await decreeRepository.findByIdLean(decreeId);
    if (!decree) throw new NotFoundError('Decree not found');
    const v = await decreeVersionRepository.findByIdLean(versionId);
    if (!v || String(v.decreeId) !== decreeId) throw new NotFoundError('Version not found');
    return serializeDecreeVersion(v);
  }

  /**
   * @param {string} id decree id
   * @param {import('zod').infer<typeof import('./decree-upload.validation.js').abandonAmendmentDraftBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async abandonAmendmentDraft(id, body, actorUserId) {
    const actor = toActorObjectId(actorUserId);
    const decree = await decreeRepository.findByIdLean(id);
    if (!decree) throw new NotFoundError('Decree not found');
    if (decree.status !== DecreeLifecycle.ACTIVE || !decree.activeDraftVersionId) {
      throw new BadRequestError('No amendment draft to abandon');
    }
    const draftId = String(decree.activeDraftVersionId);
    const draft = await decreeVersionRepository.findByIdLean(draftId);
    if (!draft || String(draft.decreeId) !== id || draft.publicationStatus !== 'draft') {
      throw new BadRequestError('There is no abandonable amendment draft on this decree');
    }

    await withMongoTransaction(async (session) => {
      const del = await decreeVersionRepository.softDeleteByIdLean(draftId, session);
      if (!del.modifiedCount) throw new NotFoundError('Draft version not found');
      await decreeRepository.updateByIdLean(
        id,
        { activeDraftVersionId: null, updatedByUserId: actor },
        session,
      );
    });

    const reason = body?.reason?.trim();
    if (reason) {
      const fresh = await decreeRepository.findByIdLean(id);
      await decreeRepository.updateByIdLean(id, {
        metadata: mergeDecreeMetadata(fresh?.metadata, { lastAbandonedDraftReason: reason }),
        updatedByUserId: actor,
      });
    }

    const nextDecree = await decreeRepository.findByIdLean(id);
    const pub = nextDecree?.currentPublishedVersionId
      ? await decreeVersionRepository.findByIdLean(String(nextDecree.currentPublishedVersionId))
      : null;
    const completeness = computeMetadataCompleteness(nextDecree, pub);
    await decreeRepository.updateByIdLean(id, { metadataCompleteness: completeness, updatedByUserId: actor });

    return this.getDecreeById(id);
  }
}

export const decreeUploadService = new DecreeUploadService();
