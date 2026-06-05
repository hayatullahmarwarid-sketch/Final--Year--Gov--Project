import mongoose from 'mongoose';
import { API_VERSION } from '../shared/constants/api.js';
import { toOffsetLimit, paginatedList } from '../shared/query/pagination.js';
import { DecreeLifecycle } from '../shared/enums/decree-lifecycle.js';
import { ExamLifecycle } from '../shared/enums/exam-lifecycle.js';
import { ExamAttemptStatus } from '../shared/enums/exam-attempt-status.js';
import { CertificateKind } from '../shared/enums/certificate-kind.js';
import { RoleKey } from '../shared/enums/roles.js';
import { NotFoundError, ConflictError } from '../shared/http/index.js';
import {
  assertExamAttemptFollowsExamRules,
  fillMissingAnswersForQuestions,
  mergeExamAnswersForSubmit,
} from '../exams/exam-attempt.rules.js';
import { buildDecreeNumberLabel, serializeDecree } from '../decree-upload/serializers/decree.serializer.js';
import { DecreeModel } from '../../../database/models/decree.model.js';
import { decreeRepository } from '../../../database/repositories/decree.repository.js';
import { decreeViewRepository } from '../../../database/repositories/decree-view.repository.js';
import { decreeVersionRepository } from '../../../database/repositories/decree-version.repository.js';
import { decreeCategoryRepository } from '../../../database/repositories/decree-category.repository.js';
import { decreeBookmarkRepository } from '../../../database/repositories/decree-bookmark.repository.js';
import { userRepository } from '../../../database/repositories/user.repository.js';
import { examRepository } from '../../../database/repositories/exam.repository.js';
import { examQuestionRepository } from '../../../database/repositories/exam-question.repository.js';
import { examAttemptRepository } from '../../../database/repositories/exam-attempt.repository.js';
import { certificateRepository } from '../../../database/repositories/certificate.repository.js';
import { notificationRepository } from '../../../database/repositories/notification.repository.js';
import { staticContentPageRepository } from '../../../database/repositories/static-content-page.repository.js';
import { systemPlatformSettingsRepository } from '../../../database/repositories/system-platform-settings.repository.js';
import { deptUploadSettingsRepository } from '../../../database/repositories/dept-upload-settings.repository.js';
import { serializeDeptUploadSettings } from '../decree-upload/serializers/dept-upload-settings.serializer.js';
import { gradeAttempt as buildGradedAnswers } from '../exams/grading.service.js';
import { assertEligibleForNewExamAttempt } from '../exams/public-exam-eligibility.js';
import { certificateIssueWorkflow } from '../certificates/certificate-issue.workflow.js';
import { shuffleArray } from './lib/shuffle.js';
import { serializePublicExamSummary } from './serializers/public-exam.serializer.js';
import { serializePublicExamQuestion } from './serializers/public-exam-question.serializer.js';
import { serializePublicNotification } from './serializers/public-notification.serializer.js';
import { serializePublicBookmark } from './serializers/public-bookmark.serializer.js';
import { serializePublicCertificate } from './serializers/public-certificate.serializer.js';
import { serializePublicExamResult } from './serializers/public-exam-result.serializer.js';
import { serializePublicDecreeCategory } from './serializers/public-decree-category.serializer.js';
import { NotificationModel } from '../../../database/models/notification.model.js';
import { renderDecreePdf } from './decree-pdf.renderer.js';

/**
 * @param {Record<string, unknown>} decree
 * @returns {string | null}
 */
function officialReferenceFromDecree(decree) {
  const meta =
    decree.metadata && typeof decree.metadata === 'object' && !Array.isArray(decree.metadata) ? decree.metadata : {};
  const refScheme = typeof meta.referenceScheme === 'string' ? meta.referenceScheme : '';
  if (refScheme === 'category_sequence') return null;
  if (typeof meta.officialReference === 'string' && meta.officialReference.trim()) return meta.officialReference.trim();
  if (typeof decree.decreeNumber === 'string' && decree.decreeNumber.trim()) return decree.decreeNumber.trim();
  return null;
}

/**
 * @param {Record<string, unknown>} decree
 */
function departmentCodeFromDecree(decree) {
  const meta =
    decree.metadata && typeof decree.metadata === 'object' && !Array.isArray(decree.metadata) ? decree.metadata : {};
  if (typeof meta.departmentCode === 'string' && meta.departmentCode.trim()) return meta.departmentCode.trim();
  if (typeof decree.departmentCode === 'string' && decree.departmentCode.trim()) return decree.departmentCode.trim();
  return null;
}

/**
 * @param {Record<string, unknown>} decree
 * @param {string} locale
 */
async function primaryCategoryLabelForPdf(decree, locale) {
  const ids = Array.isArray(decree.categoryIds) ? decree.categoryIds : [];
  if (!ids.length) return null;
  const cat = await decreeCategoryRepository.findByIdLean(String(ids[0]));
  if (!cat) return null;
  const l = String(locale || '').trim().toLowerCase();
  if (l === 'fa' && typeof cat.nameFa === 'string' && cat.nameFa.trim()) return cat.nameFa.trim();
  if (l === 'ps' && typeof cat.namePs === 'string' && cat.namePs.trim()) return cat.namePs.trim();
  if (typeof cat.name === 'string' && cat.name.trim()) return cat.name.trim();
  return null;
}

const PUBLIC_EXAM_DETAIL_STATUSES = new Set([
  ExamLifecycle.SCHEDULED,
  ExamLifecycle.OPEN,
  ExamLifecycle.PUBLISHED,
]);

/**
 * @param {Record<string, unknown> | null | undefined} exam
 */
function examIsOpenToPublicUser(exam) {
  if (!exam) return false;
  const keys = Array.isArray(exam.audienceRoleKeys) ? exam.audienceRoleKeys.map((k) => String(k)) : [];
  if (keys.length === 0) return true;
  return keys.includes('public_user');
}

/** Draft and pending decrees are never shown in the public mobile catalog. */
function isHiddenPublicDecreeStatus(status) {
  return status === DecreeLifecycle.DRAFT || status === DecreeLifecycle.PENDING;
}

/**
 * Minimum score **percentage** (1–100) required to pass. Legacy or invalid values fall back to 55.
 * @param {Record<string, unknown> | null | undefined} exam
 */
function examPassThresholdPercent(exam) {
  const v = exam?.passingScore;
  if (typeof v === 'number' && v >= 1 && v <= 100) return v;
  return 55;
}

/**
 * Server-anchored timer metadata so the client can show the same remaining time the server will enforce.
 *
 * @param {Record<string, unknown>} exam
 * @param {Record<string, unknown>} attemptRow
 * @param {Date} [now]
 */
function publicExamAttemptTimingMeta(exam, attemptRow, now = new Date()) {
  const serverTime = now.toISOString();
  const mins = exam.timeLimitMinutes;
  if (mins == null || typeof mins !== 'number' || !Number.isFinite(mins) || mins <= 0) {
    return { serverTime, timeLimitExpiresAt: null };
  }
  const startedAt = attemptRow.startedAt ? new Date(attemptRow.startedAt) : now;
  const expires = new Date(startedAt.getTime() + mins * 60_000);
  return { serverTime, timeLimitExpiresAt: expires.toISOString() };
}

/**
 * @param {number} passPct
 */
function proficiencyLevelFromPassPct(passPct) {
  if (passPct >= 85) return 'advanced';
  if (passPct >= 70) return 'intermediate';
  return 'basic';
}

/**
 * @param {Array<Record<string, unknown>>} decrees
 */
async function loadCategoriesByDecree(decrees) {
  const ids = new Set();
  for (const d of decrees) {
    for (const c of d.categoryIds ?? []) ids.add(String(c));
  }
  const list = await decreeCategoryRepository.findByIdsLean([...ids]);
  const byId = new Map(list.map((c) => [String(c._id), c]));
  return decrees.map((d) => ({
    decree: d,
    categories: (d.categoryIds ?? []).map((id) => byId.get(String(id))).filter(Boolean),
  }));
}

export class PublicUsersService {
  /**
   * @param {Partial<{
   *   decrees: typeof decreeRepository,
   *   decreeVersions: typeof decreeVersionRepository,
   *   decreeBookmarks: typeof decreeBookmarkRepository,
   *   exams: typeof examRepository,
   *   examQuestions: typeof examQuestionRepository,
   *   examAttempts: typeof examAttemptRepository,
   *   certificates: typeof certificateRepository,
   *   notifications: typeof notificationRepository,
   *   staticPages: typeof staticContentPageRepository,
   *   platformSettings: typeof systemPlatformSettingsRepository,
   *   users: typeof userRepository,
   *   decreeCategories: typeof decreeCategoryRepository,
   * }>} repos
   */
  constructor(repos = {}) {
    this.decrees = repos.decrees ?? decreeRepository;
    this.decreeVersions = repos.decreeVersions ?? decreeVersionRepository;
    this.decreeBookmarks = repos.decreeBookmarks ?? decreeBookmarkRepository;
    this.users = repos.users ?? userRepository;
    this.decreeCategories = repos.decreeCategories ?? decreeCategoryRepository;
    this.exams = repos.exams ?? examRepository;
    this.examQuestions = repos.examQuestions ?? examQuestionRepository;
    this.examAttempts = repos.examAttempts ?? examAttemptRepository;
    this.certificates = repos.certificates ?? certificateRepository;
    this.notifications = repos.notifications ?? notificationRepository;
    this.staticPages = repos.staticPages ?? staticContentPageRepository;
    this.platformSettings = repos.platformSettings ?? systemPlatformSettingsRepository;
  }

  getModuleMeta() {
    return {
      module: 'public',
      apiVersion: API_VERSION,
      description:
        'Public mobile catalog: decrees, bookmarks, notifications, exams, attempts, certificates, and home feed.',
      identity: {
        bearerJwt: {
          roleKey: RoleKey.PUBLIC_USER,
          sub: 'Mongo ObjectId of the signed-in public user (preferred).',
        },
        header: 'X-Public-User-Id',
        envFallback: 'PUBLIC_API_STANDALONE_USER_ID',
        note: 'When a valid Bearer access token with `roleKey: public_user` is present, `sub` is used as the owner id (header/env are ignored).',
      },
    };
  }

  /** Public branding for decree catalog pages (no authentication). */
  async getDepartmentPublicIdentity() {
    const doc = await deptUploadSettingsRepository.findSingletonLean();
    const s = serializeDeptUploadSettings(doc);
    return {
      deptName: s.department.deptName,
      deptCode: s.department.deptCode,
      refPrefix: s.department.refPrefix,
    };
  }

  /**
   * @param {import('zod').infer<import('./public-users.validation.js').listPublicDecreesQuerySchema>} query
   */
  async listDecrees(query) {
    const { skip, limit } = toOffsetLimit(query);
    const keyword = query.keyword?.trim() || query.search?.trim();
    const { items: decreeRows, total } = await this.decrees.findPublicCatalogPage({
      skip,
      limit,
      sort: query.sort,
      categoryId: query.categoryId,
      keyword: keyword || undefined,
      language: query.language,
      status: query.status,
      from: query.from,
      to: query.to,
      dateField: query.dateField ?? 'publishedAt',
    });

    const rows = await loadCategoriesByDecree(decreeRows);
    const uploaderIds = [...new Set(decreeRows.map((d) => (d.createdByUserId ? String(d.createdByUserId) : '')).filter(Boolean))];
    const users = uploaderIds.length ? await this.users.findByIdsLean(uploaderIds) : [];
    const uMap = new Map(users.map((u) => [String(u._id), u]));
    const items = rows.map(({ decree, categories }) =>
      serializeDecree(decree, {
        categories,
        currentPublishedVersion: null,
        activeDraftVersion: null,
        listStripVersionBodies: true,
        createdByUser: decree.createdByUserId ? uMap.get(String(decree.createdByUserId)) ?? null : null,
      }),
    );

    return paginatedList(items, query.page, limit, total);
  }

  /**
   * Active decree categories with counts of **public** catalog decrees (active + archived, non-draft).
   *
   * @param {import('zod').infer<import('./public-users.validation.js').listPublicDecreeCategoriesQuerySchema>} query
   */
  async listDecreeCategories(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items: cats, total } = await this.decreeCategories.findPage({
      skip,
      limit,
      isActive: true,
      search: query.search,
      sort: query.sort,
    });

    const countRows = await DecreeModel.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          visibility: 'public',
          status: { $in: [DecreeLifecycle.ACTIVE] },
          categoryIds: { $exists: true, $ne: [] },
        },
      },
      { $unwind: '$categoryIds' },
      { $group: { _id: '$categoryIds', decreeCount: { $sum: 1 } } },
    ]);
    const countByCat = new Map(countRows.map((r) => [String(r._id), r.decreeCount]));

    const items = cats.map((c) =>
      serializePublicDecreeCategory(c, { decreeCount: countByCat.get(String(c._id)) ?? 0 }),
    );
    return paginatedList(items, query.page, limit, total);
  }

  /** @param {string} id */
  async getDecreeById(id) {
    const decree = await this.decrees.findByIdLean(id);
    if (!decree || decree.visibility !== 'public' || decree.isDeleted) {
      throw new NotFoundError('Decree not found');
    }
    if (isHiddenPublicDecreeStatus(decree.status) || decree.status === DecreeLifecycle.ARCHIVED || decree.status === DecreeLifecycle.SUPERSEDED) {
      throw new NotFoundError('Decree not found');
    }

    let currentPublishedVersion = null;
    if (decree.currentPublishedVersionId) {
      currentPublishedVersion = await this.decreeVersions.findByIdLean(String(decree.currentPublishedVersionId));
    }

    const categories = await decreeCategoryRepository.findByIdsLean(
      (decree.categoryIds ?? []).map((x) => String(x)),
    );
    const uploader = decree.createdByUserId ? await this.users.findByIdLean(String(decree.createdByUserId)) : null;

    return serializeDecree(decree, {
      categories,
      currentPublishedVersion,
      activeDraftVersion: null,
      listStripVersionBodies: false,
      createdByUser: uploader,
    });
  }

  /**
   * @param {string} decreeId
   * @returns {Promise<Record<string, unknown>>}
   */
  async #assertPublicCatalogDecree(decreeId) {
    const decree = await this.decrees.findByIdLean(decreeId);
    if (!decree || decree.visibility !== 'public' || decree.isDeleted) {
      throw new NotFoundError('Decree not found');
    }
    if (isHiddenPublicDecreeStatus(decree.status) || decree.status === DecreeLifecycle.ARCHIVED || decree.status === DecreeLifecycle.SUPERSEDED) {
      throw new NotFoundError('Decree not found');
    }
    return decree;
  }

  /**
   * Records one engagement view for a signed-in public user (client should call after ~30s on the reader).
   * Repeat visits each add another `decree_views` row; category charts use the decree’s primary category.
   *
   * @param {string} decreeId
   * @param {import('mongoose').Types.ObjectId | null | undefined} ownerUserId
   */
  async recordDecreeView(decreeId, ownerUserId) {
    await this.#assertPublicCatalogDecree(decreeId);
    if (!ownerUserId) {
      return { recorded: false, note: 'Sign in to have your reading time count as views.' };
    }
    return decreeViewRepository.recordEngagementView(decreeId, String(ownerUserId));
  }

  /**
   * Generates a PDF on-demand from the decree's stored localized content and returns bytes.
   *
   * @param {string} decreeId
   * @param {{ locale?: string }} [opts]
   */
  async getDecreePdfForHttp(decreeId, opts = {}) {
    await this.#assertPublicCatalogDecree(decreeId);

    const decree = await this.decrees.findByIdLean(decreeId);
    if (!decree || !decree.currentPublishedVersionId) {
      throw new NotFoundError('Decree not found');
    }
    const version = await this.decreeVersions.findByIdLean(String(decree.currentPublishedVersionId));
    if (!version) {
      throw new NotFoundError('Decree version not found');
    }

    const localeRaw = String(opts.locale ?? 'ps').trim().toLowerCase();
    const locale = localeRaw === 'fa' || localeRaw === 'en' || localeRaw === 'ps' ? localeRaw : 'ps';

    const blocks = Array.isArray(version.localizedContent) ? version.localizedContent : [];
    const pick =
      blocks.find((b) => String(b?.locale ?? '').trim().toLowerCase() === locale) ??
      blocks.find((b) => String(b?.locale ?? '').trim().toLowerCase() === 'en') ??
      blocks[0] ??
      null;
    const body = String(pick?.bodyPlain ?? pick?.bodyRich ?? '').trim();

    await decreeRepository.incrementDownloadCount(decreeId);

    const decreeNumberLabel = buildDecreeNumberLabel(decree);
    const ts = String(decree.titleSummary ?? '').trim();
    const ps = String(decree.titlePs ?? '').trim();
    const fa = String(decree.titleFa ?? '').trim();
    const en = String(decree.titleEn ?? '').trim();
    const titleSummary =
      locale === 'en'
        ? en || ts || ps || fa
        : locale === 'fa'
          ? fa || ts || ps || en
          : ps || ts || fa || en || 'Decree';
    const settingsDoc = await deptUploadSettingsRepository.findSingletonLean();
    const dep =
      settingsDoc.department && typeof settingsDoc.department === 'object' ? settingsDoc.department : {};
    const departmentName =
      typeof dep.deptName === 'string' && dep.deptName.trim() ? dep.deptName.trim() : null;
    const safeBase = `${decreeNumberLabel}-${titleSummary}`.replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const filename = `${(safeBase || 'decree').slice(0, 88)}.pdf`;

    const buffer = await renderDecreePdf({
      decreeId: String(decree._id),
      decreeNumberLabel,
      officialReference: officialReferenceFromDecree(decree),
      titleSummary,
      locale,
      body,
      departmentName,
      departmentCode: departmentCodeFromDecree(decree),
      categoryLabel: await primaryCategoryLabelForPdf(decree, locale),
      publishedAtIso: decree.publishedAt ? new Date(decree.publishedAt).toISOString() : null,
      creationDateIso: decree.creationDate ? new Date(decree.creationDate).toISOString() : null,
      generatedAtIso: new Date().toISOString(),
    });
    return { buffer, filename };
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {import('zod').infer<import('./public-users.validation.js').listPublicBookmarksQuerySchema>} query
   */
  async listBookmarks(ownerUserId, query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items: bookmarkRows, total } = await this.decreeBookmarks.findPageByOwner({
      skip,
      limit,
      sort: query.sort,
      ownerUserId: String(ownerUserId),
    });

    const decreeIds = bookmarkRows.map((b) => String(b.decreeId));
    const decrees = decreeIds.length ? await this.decrees.findByIdsLean(decreeIds) : [];
    const decreeById = new Map(decrees.map((d) => [String(d._id), d]));

    const items = bookmarkRows.map((b) =>
      serializePublicBookmark(b, { decree: decreeById.get(String(b.decreeId)) ?? null }),
    );
    return paginatedList(items, query.page, limit, total);
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {string} decreeId
   */
  async addBookmark(ownerUserId, decreeId) {
    const decree = await this.decrees.findByIdLean(decreeId);
    if (!decree || decree.visibility !== 'public' || decree.isDeleted || isHiddenPublicDecreeStatus(decree.status)) {
      throw new NotFoundError('Decree not found');
    }

    const existing = await this.decreeBookmarks.findByOwnerAndDecreeLean({
      ownerUserId: String(ownerUserId),
      decreeId,
    });
    if (existing) {
      const fullDecree = await this.decrees.findByIdLean(decreeId);
      return serializePublicBookmark(existing, { decree: fullDecree ?? decree });
    }

    const created = await this.decreeBookmarks.createLean({
      ownerUserId,
      decreeId,
      tenantId: decree.tenantId ?? null,
    });
    return serializePublicBookmark(created, { decree });
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {string} bookmarkId
   */
  async removeBookmark(ownerUserId, bookmarkId) {
    const row = await this.decreeBookmarks.findByIdLean(bookmarkId);
    if (!row || String(row.ownerUserId) !== String(ownerUserId)) {
      throw new NotFoundError('Bookmark not found');
    }
    await this.decreeBookmarks.softDeleteById(bookmarkId, {
      updatedByUserId: ownerUserId,
    });
    return { ok: true };
  }

  /**
   * @param {import('mongoose').Types.ObjectId | null} ownerUserId
   * @param {import('zod').infer<import('./public-users.validation.js').listPublicNotificationsQuerySchema>} query
   */
  async listNotifications(ownerUserId, query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.notifications.findPageForPublicInbox({
      skip,
      limit,
      sort: query.sort,
      search: query.search,
      from: query.from,
      to: query.to,
      recipientUserId: ownerUserId ? String(ownerUserId) : null,
    });
    return paginatedList(
      items.map((n) => serializePublicNotification(n)),
      query.page,
      limit,
      total,
    );
  }

  /** @param {import('zod').infer<import('./public-users.validation.js').listPublicExamsQuerySchema>} query */
  async listExams(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.exams.findPublicCatalogPage({
      skip,
      limit,
      sort: query.sort,
      search: query.search,
      status: query.status,
      from: query.from,
      to: query.to,
      decreeCategoryId: query.decreeCategoryId,
    });
    return paginatedList(
      items.map((e) => serializePublicExamSummary(e)),
      query.page,
      limit,
      total,
    );
  }

  /** @param {string} id */
  async getExamById(id) {
    const exam = await this.exams.findByIdLean(id);
    if (!exam || exam.isDeleted || !PUBLIC_EXAM_DETAIL_STATUSES.has(exam.status) || !examIsOpenToPublicUser(exam)) {
      throw new NotFoundError('Exam not found');
    }
    return serializePublicExamSummary(exam);
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {string} examId
   * @param {{ locale?: string }} [opts]
   */
  async startExamAttempt(ownerUserId, examId, opts = {}) {
    const exam = await this.exams.findByIdLean(examId);
    if (!exam || exam.isDeleted || !PUBLIC_EXAM_DETAIL_STATUSES.has(exam.status) || !examIsOpenToPublicUser(exam)) {
      throw new NotFoundError('Exam not found');
    }

    if (
      exam.status !== ExamLifecycle.OPEN &&
      exam.status !== ExamLifecycle.PUBLISHED &&
      exam.status !== ExamLifecycle.SCHEDULED
    ) {
      throw new ConflictError('Exam is not accepting new attempts right now.', { status: exam.status });
    }

    let existing = await this.examAttempts.findLatestByExamAndExamineeLean({
      examId,
      examineeUserId: String(ownerUserId),
      status: ExamAttemptStatus.IN_PROGRESS,
    });
    if (existing && this.#isInProgressAttemptOverdue(exam, existing)) {
      const questions = await this.examQuestions.listByExamIdLean(examId, { activeOnly: true });
      const merged = mergeExamAnswersForSubmit(existing.answers ?? [], []);
      const full = fillMissingAnswersForQuestions(questions, merged);
      await this.#completeExamAttemptGrading(ownerUserId, existing, exam, full, { skipTimeCheck: true });
      existing = null;
    }
    if (existing) {
      const questions = await this.examQuestions.listByExamIdLean(examId, { activeOnly: true });
      let ordered = exam.randomizeQuestions ? shuffleArray(questions) : questions;
      const payload = ordered.map((q) =>
        serializePublicExamQuestion(q, {
          shuffleOptions: Boolean(exam.randomizeOptions),
          locale: opts.locale,
        }),
      );
      return {
        resumed: true,
        ...publicExamAttemptTimingMeta(exam, existing),
        attempt: this.#serializeAttempt(existing),
        exam: serializePublicExamSummary(exam),
        questions: payload,
      };
    }

    const certRow = await this.certificates.findExamPassByHolderAndExamLean(String(ownerUserId), examId);
    const completed = await this.examAttempts.listCompletedByExamAndExaminee(
      String(examId),
      String(ownerUserId),
    );
    const { attemptNumber } = assertEligibleForNewExamAttempt({
      certRow: certRow ?? null,
      completedAttempts: completed,
    });

    const doc = await this.examAttempts.createLean({
      examId,
      examineeUserId: ownerUserId,
      status: ExamAttemptStatus.IN_PROGRESS,
      attemptNumber,
      tenantId: exam.tenantId ?? null,
    });

    const questions = await this.examQuestions.listByExamIdLean(examId, { activeOnly: true });
    let ordered = exam.randomizeQuestions ? shuffleArray(questions) : questions;
    const payload = ordered.map((q) =>
      serializePublicExamQuestion(q, {
        shuffleOptions: Boolean(exam.randomizeOptions),
        locale: opts.locale,
      }),
    );

    return {
      resumed: false,
      ...publicExamAttemptTimingMeta(exam, doc),
      attempt: this.#serializeAttempt(doc),
      exam: serializePublicExamSummary(exam),
      questions: payload,
    };
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {string} attemptId
   * @param {Array<Record<string, unknown>>} incomingAnswers
   */
  async patchExamAttemptDraft(ownerUserId, attemptId, incomingAnswers) {
    const attempt = await this.examAttempts.findByIdLean(attemptId);
    if (!attempt || String(attempt.examineeUserId) !== String(ownerUserId)) {
      throw new NotFoundError('Attempt not found');
    }
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new ConflictError('Attempt is not in progress.', { status: attempt.status });
    }

    const exam = await this.exams.findByIdLean(String(attempt.examId));
    if (!exam || exam.isDeleted) {
      throw new NotFoundError('Exam not found');
    }

    const merged = mergeExamAnswersForSubmit(attempt.answers ?? [], incomingAnswers);
    await this.examAttempts.updateByIdLean(attemptId, {
      answers: merged,
      updatedByUserId: ownerUserId,
    });
    const next = await this.examAttempts.findByIdLean(attemptId);
    return { attempt: this.#serializeAttempt(next) };
  }

  /**
   * @param {Record<string, unknown>} exam
   * @param {Record<string, unknown>} attemptRow
   * @param {Date} [now]
   */
  #isInProgressAttemptOverdue(exam, attemptRow, now = new Date()) {
    if (exam.timeLimitMinutes == null || typeof exam.timeLimitMinutes !== 'number') return false;
    const limitMs = exam.timeLimitMinutes * 60_000;
    const t0 = new Date(attemptRow.startedAt).getTime();
    if (Number.isNaN(t0)) return false;
    return now.getTime() > t0 + limitMs;
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {Record<string, unknown>} attemptRow
   * @param {Record<string, unknown>} exam
   * @param {Array<Record<string, unknown>>} mergedAnswersInput
   * @param {{ skipTimeCheck?: boolean }} [opts]
   */
  async #completeExamAttemptGrading(ownerUserId, attemptRow, exam, mergedAnswersInput, opts = {}) {
    const attemptId = String(attemptRow._id);
    const questions = await this.examQuestions.listByExamIdLean(String(attemptRow.examId), { activeOnly: true });

    const attemptForRules = {
      startedAt: attemptRow.startedAt,
      answers: mergedAnswersInput.map((a) => ({ questionId: a.questionId })),
    };
    assertExamAttemptFollowsExamRules({
      exam,
      attempt: attemptForRules,
      activeQuestions: questions,
      skipTimeCheck: opts.skipTimeCheck === true,
    });

    const thresholdPct = examPassThresholdPercent(exam);
    const graded = buildGradedAnswers(questions, mergedAnswersInput, { passThresholdPct: thresholdPct });
    const { score, maxScore, answers, needsManualGrading } = graded;
    const passPct = maxScore > 0 ? (score / maxScore) * 100 : 0;

    if (needsManualGrading) {
      const updated = await this.examAttempts.updateByIdLean(attemptId, {
        status: ExamAttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        score,
        maxScore,
        passed: null,
        answers,
        gradedAt: null,
        certificateIssued: false,
        updatedByUserId: ownerUserId,
      });
      return {
        attempt: this.#serializeAttempt(updated),
        exam: serializePublicExamSummary(exam),
        score,
        maxScore,
        passPct: Math.round(passPct * 10) / 10,
        passed: null,
        pendingManualGrading: true,
        passingThreshold: {
          passingScore: exam.passingScore ?? null,
          passThresholdPercent: thresholdPct,
          maxScore,
          source: 'exam',
        },
      };
    }

    const passed = passPct >= thresholdPct;

    const updated = await this.examAttempts.updateByIdLean(attemptId, {
      status: ExamAttemptStatus.GRADED,
      submittedAt: new Date(),
      gradedAt: new Date(),
      score,
      maxScore,
      passed,
      answers,
      certificateIssued: Boolean(passed),
      updatedByUserId: ownerUserId,
    });

    /** @type {string | null} */
    let certificateIdOut = null;
    if (passed) {
      const level = proficiencyLevelFromPassPct(passPct);
      const decreeIds = [];
      const issue = await certificateIssueWorkflow.issue({
        holderUserId: String(ownerUserId),
        kind: CertificateKind.EXAM_PASS,
        sourceExamId: String(attemptRow.examId),
        sourceExamAttemptId: attemptId,
        passPct,
        level,
        decreeIds,
        actorUserId: String(ownerUserId),
        tenantId: exam.tenantId ?? null,
        category:
          typeof exam.decreeCategoryName === 'string' && exam.decreeCategoryName.trim()
            ? exam.decreeCategoryName.trim()
            : typeof exam.title === 'string'
              ? exam.title
              : null,
      });
      certificateIdOut = issue.certificateId;
      await NotificationModel.create({
        title: 'Certificate issued',
        body: `You passed the exam with ${Math.round(passPct)}% (${level} level). Your certificate is ready.`,
        recipientUserId: ownerUserId,
        recipientRoleKey: RoleKey.PUBLIC_USER,
        metadata: { kind: 'certificate_issued', certificateId: certificateIdOut, examId: String(attemptRow.examId) },
      });
    }

    return {
      attempt: this.#serializeAttempt(updated),
      exam: serializePublicExamSummary(exam),
      score,
      maxScore,
      passPct: Math.round(passPct * 10) / 10,
      passed,
      certificateId: certificateIdOut,
      /** Threshold structure for mobile UI — mirrors exam.passingScore / computed max. */
      passingThreshold: {
        passingScore: exam.passingScore ?? null,
        passThresholdPercent: thresholdPct,
        maxScore: maxScore,
        source: 'exam',
      },
    };
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {string} attemptId
   * @param {Array<Record<string, unknown>>} answersInput
   */
  async submitExamAttempt(ownerUserId, attemptId, answersInput) {
    const attempt = await this.examAttempts.findByIdLean(attemptId);
    if (!attempt || String(attempt.examineeUserId) !== String(ownerUserId)) {
      throw new NotFoundError('Attempt not found');
    }
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new ConflictError('Attempt is not in progress.', { status: attempt.status });
    }

    const exam = await this.exams.findByIdLean(String(attempt.examId));
    if (!exam || exam.isDeleted) {
      throw new NotFoundError('Exam not found');
    }

    const mergedAnswersInput = mergeExamAnswersForSubmit(attempt.answers ?? [], answersInput);
    return this.#completeExamAttemptGrading(ownerUserId, attempt, exam, mergedAnswersInput, { skipTimeCheck: false });
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {import('zod').infer<import('./public-users.validation.js').listPublicResultsQuerySchema>} query
   */
  async listResults(ownerUserId, query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items: attemptRows, total } = await this.examAttempts.findPageByExaminee({
      skip,
      limit,
      sort: query.sort,
      examineeUserId: String(ownerUserId),
      statusIn: [ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.GRADED],
    });

    const examIds = [...new Set(attemptRows.map((a) => String(a.examId)))];
    const exams = examIds.length ? await Promise.all(examIds.map((id) => this.exams.findByIdLean(id))) : [];
    const examById = new Map(exams.filter(Boolean).map((e) => [String(e._id), e]));

    const items = attemptRows.map((a) =>
      serializePublicExamResult(a, { exam: examById.get(String(a.examId)) ?? null }),
    );
    return paginatedList(items, query.page, limit, total);
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {import('zod').infer<import('./public-users.validation.js').listPublicCertificatesQuerySchema>} query
   */
  async listCertificates(ownerUserId, query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items: certRows, total } = await this.certificates.findPage({
      skip,
      limit,
      sort: query.sort,
      from: query.from,
      to: query.to,
      status: query.status,
      kind: query.kind,
      holderUserId: String(ownerUserId),
    });

    const examIds = [
      ...new Set(
        certRows
          .filter((c) => c.sourceExamId)
          .map((c) => String(c.sourceExamId))
          .filter(Boolean),
      ),
    ];
    const exams = examIds.length ? await Promise.all(examIds.map((id) => this.exams.findByIdLean(id))) : [];
    const examById = new Map(exams.filter(Boolean).map((e) => [String(e._id), e]));

    const items = certRows.map((row) => {
      const exam = row.sourceExamId ? examById.get(String(row.sourceExamId)) : null;
      return serializePublicCertificate(row, {
        passingThreshold: this.#certificateThreshold(row, exam),
      });
    });

    return paginatedList(items, query.page, limit, total);
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {string} id
   */
  async getCertificateById(ownerUserId, id) {
    const row = await this.certificates.findByHolderAndCertificateRefLean(String(ownerUserId), id);
    if (!row) {
      throw new NotFoundError('Certificate not found');
    }
    let exam = null;
    if (row.sourceExamId) {
      const examId = String(row.sourceExamId);
      try {
        exam = await this.exams.findByIdLean(examId);
      } catch {
        exam = null;
      }
    }
    let pdfUrl = null;
    if (row.pdfFileId) {
      try {
        pdfUrl = await resolveStoredFileUrl(String(row.pdfFileId), { download: true, ttlSeconds: 3600 });
      } catch {
        pdfUrl = null;
      }
    }
    return serializePublicCertificate(row, {
      passingThreshold: this.#certificateThreshold(row, exam),
      pdfUrl,
    });
  }

  /**
   * @param {import('mongoose').Types.ObjectId | null} ownerUserId
   * @param {{ locale?: string }} query
   */
  async getHome(ownerUserId, query) {
    const settings = await this.platformSettings.findGlobalLean();
    const portal = /** @type {Record<string, unknown>} */ (settings.portal ?? {});
    const featuredIds = /** @type {unknown} */ (portal.featuredDecreeIds);
    const announcementTag = String(portal.homeAnnouncementTag ?? 'announcement');
    const defaultLocale = String(portal.defaultLocale ?? 'ps');
    const locale = (query.locale ?? defaultLocale).trim().toLowerCase();

    const featuredFromSettings = Array.isArray(featuredIds)
      ? featuredIds.map(String).filter((id) => id.length === 24)
      : [];

    /** @type {Record<string, unknown>[]} */
    let featuredDecrees = [];
    if (featuredFromSettings.length) {
      const loaded = await this.decrees.findByIdsLean(featuredFromSettings);
      const byId = new Map(loaded.map((d) => [String(d._id), d]));
      featuredDecrees = featuredFromSettings
        .map((fid) => byId.get(String(fid)))
        .filter(
          (d) =>
            d &&
            !d.isDeleted &&
            d.visibility === 'public' &&
            !isHiddenPublicDecreeStatus(d.status),
        );
    }

    if (featuredDecrees.length < 3) {
      const { items } = await this.decrees.findPublicCatalogPage({
        skip: 0,
        limit: 6,
        language: locale,
      });
      const merged = new Map(featuredDecrees.map((d) => [String(d._id), d]));
      for (const d of items) {
        merged.set(String(d._id), d);
      }
      featuredDecrees = [...merged.values()].slice(0, 6);
    }

    const featuredRows = await loadCategoriesByDecree(featuredDecrees);
    const featured = featuredRows.map(({ decree, categories }) =>
      serializeDecree(decree, {
        categories,
        currentPublishedVersion: null,
        activeDraftVersion: null,
        listStripVersionBodies: true,
      }),
    );

    const { items: announcementRows } = await this.staticPages.findPage({
      skip: 0,
      limit: 5,
      locale,
      tag: announcementTag,
      status: 'published',
    });

    const announcements = announcementRows.map((p) => ({
      id: String(p._id),
      slug: p.slug,
      title: p.title,
      excerpt: String(p.body ?? '').slice(0, 220),
      publishedAt: p.publishedAt ?? null,
      sortOrder: p.sortOrder ?? 0,
    }));

    const { items: upcomingExams } = await this.exams.findPublicCatalogPage({
      skip: 0,
      limit: 5,
      sort: 'scheduledOpensAt',
    });

    const activeDecreeCount = await this.decrees.countDocuments({
      isDeleted: { $ne: true },
      visibility: 'public',
      status: DecreeLifecycle.ACTIVE,
    });

    const openExamCount = await this.exams.countDocuments({
      isDeleted: { $ne: true },
      status: ExamLifecycle.OPEN,
    });

    const unreadNotifications = await this.notifications.countUnreadForPublicInbox({
      recipientUserId: ownerUserId ? String(ownerUserId) : null,
    });

    return {
      locale,
      featuredDecrees: featured,
      announcements,
      upcomingExams: upcomingExams.map((e) => serializePublicExamSummary(e)),
      summary: {
        activeDecreeCount,
        openExamCount,
        unreadNotificationCount: unreadNotifications,
      },
      settingsHints: {
        defaultLocale: portal.defaultLocale ?? 'ps',
        supportedLocales: portal.supportedLocales ?? ['ps', 'en', 'fa'],
        publicSiteName: portal.publicSiteName ?? 'Sharia Decrees',
      },
    };
  }

  /**
   * Safe account summary for the public app shell (requires a resolved public user id).
   *
   * @param {import('mongoose').Types.ObjectId | null} ownerUserId
   */
  async getPublicProfile(ownerUserId) {
    if (!ownerUserId) {
      return { authenticated: false, account: null };
    }

    const user = await this.users.findByIdLean(String(ownerUserId));
    if (!user || user.isDeleted || user.roleKey !== RoleKey.PUBLIC_USER) {
      return { authenticated: false, account: null };
    }

    const profile =
      user.profile && typeof user.profile === 'object' && !Array.isArray(user.profile)
        ? /** @type {Record<string, unknown>} */ (user.profile)
        : {};

    return {
      authenticated: true,
      account: {
        id: String(user._id),
        displayName: user.displayName,
        email: user.email ?? null,
        phoneE164: user.phoneE164 ?? null,
        emailVerified: Boolean(user.emailVerifiedAt),
        preferredLocale: user.preferredLocale ?? 'ps',
        status: user.status,
        deactivatedAt: user.deactivatedAt ?? null,
        profile,
      },
    };
  }

  /**
   * @param {Record<string, unknown>} row
   */
  #serializeAttempt(row) {
    return {
      id: String(row._id),
      examId: String(row.examId),
      examineeUserId: String(row.examineeUserId),
      status: row.status,
      attemptNumber: typeof row.attemptNumber === 'number' ? row.attemptNumber : 1,
      startedAt: row.startedAt ?? null,
      submittedAt: row.submittedAt ?? null,
      gradedAt: row.gradedAt ?? null,
      score: row.score ?? null,
      maxScore: row.maxScore ?? null,
      passed: row.passed ?? null,
      certificateIssued: Boolean(row.certificateIssued),
      tenantId: row.tenantId ?? null,
    };
  }

  /**
   * @param {import('mongoose').Types.ObjectId} ownerUserId
   * @param {string} attemptId
   */
  async getExamAttemptById(ownerUserId, attemptId) {
    const row = await this.examAttempts.findByIdLean(attemptId);
    if (!row || String(row.examineeUserId) !== String(ownerUserId)) {
      throw new NotFoundError('Attempt not found');
    }
    const exam = await this.exams.findByIdLean(String(row.examId));
    if (!exam || exam.isDeleted) {
      throw new NotFoundError('Exam not found');
    }

    // Fetch questions and merge with the user's answers for per-question review.
    const [cert, questions] = await Promise.all([
      this.certificates.findOne({
        holderUserId: ownerUserId,
        sourceExamAttemptId: new mongoose.Types.ObjectId(attemptId),
        kind: CertificateKind.EXAM_PASS,
        isDeleted: { $ne: true },
      }),
      this.examQuestions.listByExamIdLean(String(row.examId), { activeOnly: true }),
    ]);

    const answerMap = new Map(
      (row.answers ?? []).map((a) => [String(a.questionId), a]),
    );

    const questionsWithAnswers = questions.map((q) => {
      const ans = answerMap.get(String(q._id));
      const selected = ans?.selectedOptionKeys ?? [];
      const correct = q.correctOptionKeys ?? [];
      const isCorrect =
        correct.length > 0 &&
        selected.length === correct.length &&
        correct.every((k) => selected.includes(k));
      const pointsEarned =
        typeof ans?.autoGradedPoints === 'number'
          ? ans.autoGradedPoints
          : typeof ans?.manualGradedPoints === 'number'
            ? ans.manualGradedPoints
            : null;
      return {
        questionId: String(q._id),
        order: q.order,
        stem: q.stem,
        type: q.type,
        points: q.points,
        pointsEarned,
        options: (q.options ?? []).map((o) => ({ optionKey: o.optionKey, label: o.label })),
        correctOptionKeys: correct,
        selectedOptionKeys: selected,
        isCorrect: ans ? isCorrect : null,
        wasAnswered: !!ans && (selected.length > 0 || ans.booleanAnswer != null || !!ans.textAnswer),
      };
    });

    const passPct =
      typeof row.maxScore === 'number' && row.maxScore > 0 && typeof row.score === 'number'
        ? Math.round(((row.score / row.maxScore) * 100) * 10) / 10
        : null;
    return {
      attempt: this.#serializeAttempt(row),
      exam: serializePublicExamSummary(exam),
      passPct,
      certificateId: cert ? String(cert._id) : null,
      questionsWithAnswers,
      passingThreshold: {
        passingScore: exam.passingScore ?? null,
        passThresholdPercent: examPassThresholdPercent(exam),
        maxScore: row.maxScore ?? null,
        source: 'exam',
      },
    };
  }

  /**
   * @param {Record<string, unknown>} certificate
   * @param {Record<string, unknown> | null | undefined} exam
   */
  #certificateThreshold(certificate, exam) {
    if (certificate.kind === CertificateKind.EXAM_PASS && exam) {
      return {
        passingScore: exam.passingScore ?? null,
        maxScore: exam.maxScore ?? null,
        source: 'exam',
      };
    }
    return null;
  }
}

export const publicUsersService = new PublicUsersService();
