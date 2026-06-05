import mongoose from 'mongoose';
import { AuditLogModel } from '../../../database/models/audit-log.model.js';
import { CertificateModel } from '../../../database/models/certificate.model.js';
import { DecreeBookmarkModel } from '../../../database/models/decree-bookmark.model.js';
import { DecreeModel } from '../../../database/models/decree.model.js';
import { ExamAttemptModel } from '../../../database/models/exam-attempt.model.js';
import { ExamModel } from '../../../database/models/exam.model.js';
import { InspectionAssignmentModel } from '../../../database/models/inspection-assignment.model.js';
import { InspectionSubmissionModel } from '../../../database/models/inspection-submission.model.js';
import { UserModel } from '../../../database/models/user.model.js';
import { notificationRepository } from '../../../database/repositories/notification.repository.js';
import { systemAdminService } from '../system-admin/system-admin.service.js';
import { RoleKey } from '../shared/enums/roles.js';
import {
  serializeDecreeUploadDashboardDto,
  serializeInspectorAdminDashboardDto,
  serializeInspectorDashboardDto,
  serializePublicDashboardDto,
  serializeSystemAdminDashboardDto,
} from './serializers/dashboards.serializer.js';
import {
  readDashboardSnapshot,
  writeDashboardSnapshot,
} from './dashboard-snapshot.service.js';
import { getLogger } from '../../config/logger.js';
import { decreeViewRepository } from '../../../database/repositories/decree-view.repository.js';
import { decreeCategoryRepository } from '../../../database/repositories/decree-category.repository.js';
import { DecreeLifecycle } from '../shared/enums/decree-lifecycle.js';
import { buildDecreeNumberLabel } from '../decree-upload/serializers/decree.serializer.js';

const MS_DAY = 24 * 60 * 60 * 1000;

/** @returns {Date} */
function utcStartOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/**
 * @param {number} dayCount
 */
function rollingUtcStart(dayCount) {
  const start = utcStartOfDay(new Date());
  start.setUTCDate(start.getUTCDate() - (dayCount - 1));
  return start;
}

/**
 * @param {Array<{ _id: string, count?: number, n?: number }>} rows
 * @param {string} field
 */
function rowsToMap(rows, field = 'count') {
  const m = new Map();
  for (const r of rows) {
    m.set(String(r._id), Number(r[field] ?? r.n ?? 0));
  }
  return m;
}

/**
 * @param {number} dayCount
 * @param {Map<string, number>} map
 */
function fillDailySeries(dayCount, map) {
  const out = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = utcStartOfDay(new Date(Date.now() - i * MS_DAY));
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  return out;
}

/** Last `monthCount` UTC months (YYYY-MM) ending with the current month. */
function rollingUtcMonthKeys(monthCount) {
  const keys = [];
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCMonth(d.getUTCMonth() - i);
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

/**
 * @param {Array<{ month: string, count: number }>} rows
 * @param {number} monthCount
 */
function fillMonthlySeriesFromRows(rows, monthCount) {
  const m = new Map(rows.map((r) => [r.month, r.count]));
  return rollingUtcMonthKeys(monthCount).map((month) => ({ month, count: m.get(month) ?? 0 }));
}

export class DashboardsService {
  /**
   * @param {{
   *   systemAdmin?: import('../system-admin/system-admin.service.js').SystemAdminService,
   *   notifications?: import('../../../database/repositories/notification.repository.js').NotificationRepository,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.systemAdmin = deps.systemAdmin ?? systemAdminService;
    this.notifications = deps.notifications ?? notificationRepository;
  }

  /**
   * @param {number} dayCount
   */
  async collectAuditDailyTrend(dayCount) {
    const start = rollingUtcStart(dayCount);
    const rows = await AuditLogModel.aggregate([
      { $match: { occurredAt: { $gte: start } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$occurredAt', timezone: 'UTC' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return fillDailySeries(dayCount, rowsToMap(rows, 'count'));
  }

  async collectPlatformEntityTotals() {
    const [
      decrees,
      inspectionAssignments,
      inspectionSubmissions,
      exams,
      certificates,
      publicUsers,
    ] = await Promise.all([
      DecreeModel.countDocuments({ isDeleted: { $ne: true } }),
      InspectionAssignmentModel.countDocuments({ isDeleted: { $ne: true } }),
      InspectionSubmissionModel.countDocuments({ isDeleted: { $ne: true } }),
      ExamModel.countDocuments({ isDeleted: { $ne: true } }),
      CertificateModel.countDocuments({ isDeleted: { $ne: true } }),
      UserModel.countDocuments({ isDeleted: { $ne: true }, roleKey: RoleKey.PUBLIC_USER }),
    ]);

    return {
      decrees,
      inspectionAssignments,
      inspectionSubmissions,
      exams,
      certificates,
      publicUsers,
    };
  }

  async getSummary() {
    const notificationsTotal = await this.notifications.countDocuments({});
    return {
      generatedAt: new Date().toISOString(),
      notifications: { total: notificationsTotal },
    };
  }

  /**
   * Returns a cached dashboard payload (if fresh) and schedules a refresh write otherwise.
   * Callers pass the same `role` key the worker uses so hits/misses stay aligned.
   *
   * @template T
   * @param {string} role
   * @param {() => Promise<T>} compute
   * @param {{ dimensionsKey?: string }} [options]
   * @returns {Promise<T>}
   */
  async #snapshotOrCompute(role, compute, options = {}) {
    const snapshotKey = `dashboard:${role}`;
    const dimensionsKey = options.dimensionsKey ?? 'global';
    const snap = await readDashboardSnapshot(snapshotKey, dimensionsKey).catch(() => null);
    if (snap) return /** @type {T} */ (snap.metrics);

    const fresh = await compute();
    writeDashboardSnapshot(snapshotKey, fresh, { dimensionsKey }).catch((err) => {
      getLogger().warn({ err, role }, 'dashboard.snapshot_write_failed');
    });
    return fresh;
  }

  async getSystemAdminDashboard() {
    return this.#snapshotOrCompute('system_admin', () => this.#computeSystemAdminDashboard());
  }

  async #computeSystemAdminDashboard() {
    const [base, dailyTrend, totals] = await Promise.all([
      this.systemAdmin.getDashboard(),
      this.collectAuditDailyTrend(14),
      this.collectPlatformEntityTotals(),
    ]);

    return serializeSystemAdminDashboardDto({
      generatedAt: base.generatedAt,
      headline: base.headline,
      cards: [
        ...base.cards,
        { key: 'decrees_total', label: 'Decree records', value: totals.decrees },
        { key: 'inspection_assignments_total', label: 'Inspection assignments', value: totals.inspectionAssignments },
        { key: 'exams_total', label: 'Exams', value: totals.exams },
        { key: 'certificates_total', label: 'Certificates', value: totals.certificates },
      ],
      staff: base.staff,
      audit: {
        ...base.audit,
        dailyTrend,
      },
      system: {
        maintenance: base.maintenance,
        settings: base.settings,
        health: { api: 'ok', database: 'ok' },
      },
      totals,
      notifications: base.notifications,
      governance: base.governance,
    });
  }

  /**
   * @param {string} actorUserId Mongo id string of the signed-in uploader (JWT `sub`).
   */
  async getDecreeUploadDashboard(actorUserId) {
    // Always compute fresh: uploader-facing counts/lists must not lag behind cache TTLs.
    return this.#computeDecreeUploadDashboard(actorUserId);
  }

  /**
   * @param {string} actorUserId
   */
  async #computeDecreeUploadDashboard(actorUserId) {
    const generatedAt = new Date().toISOString();
    const notDeleted = { isDeleted: { $ne: true } };
    const ownerMatch =
      actorUserId && mongoose.Types.ObjectId.isValid(actorUserId)
        ? { createdByUserId: new mongoose.Types.ObjectId(actorUserId) }
        : { _id: { $exists: false } };

    const to = new Date();
    const from = new Date(to.getTime() - 29 * MS_DAY);
    from.setUTCHours(0, 0, 0, 0);

    const recentWeekStart = rollingUtcStart(7);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const prevMonthStart = new Date(monthStart);
    prevMonthStart.setUTCMonth(prevMonthStart.getUTCMonth() - 1);

    const viewsMonthFrom = new Date();
    viewsMonthFrom.setUTCDate(1);
    viewsMonthFrom.setUTCHours(0, 0, 0, 0);
    viewsMonthFrom.setUTCMonth(viewsMonthFrom.getUTCMonth() - 11);

    const [
      total,
      active,
      archived,
      draft,
      pending,
      superseded,
      newDecreesThisMonth,
      newDecreesLastMonth,
      metaAgg,
      bucketAgg,
      topCats,
      topCategoriesByViews,
      mostViewedDecrees,
      recent,
      sumEngagement,
      viewsByDayRaw,
      viewsByMonthRaw,
      uploadsByMonthRaw,
      categoryViewRows,
      recentAuditRows,
    ] = await Promise.all([
      DecreeModel.countDocuments({ ...notDeleted, ...ownerMatch }),
      DecreeModel.countDocuments({ ...notDeleted, ...ownerMatch, status: 'active' }),
      DecreeModel.countDocuments({ ...notDeleted, ...ownerMatch, status: 'archived' }),
      DecreeModel.countDocuments({ ...notDeleted, ...ownerMatch, status: 'draft' }),
      DecreeModel.countDocuments({ ...notDeleted, ...ownerMatch, status: DecreeLifecycle.PENDING }),
      DecreeModel.countDocuments({ ...notDeleted, ...ownerMatch, status: 'superseded' }),
      DecreeModel.countDocuments({ ...notDeleted, ...ownerMatch, createdAt: { $gte: monthStart } }),
      DecreeModel.countDocuments({
        ...notDeleted,
        ...ownerMatch,
        createdAt: { $gte: prevMonthStart, $lt: monthStart },
      }),
      DecreeModel.aggregate([
        {
          $match: {
            ...notDeleted,
            ...ownerMatch,
            'metadataCompleteness.score': { $exists: true, $type: 'number' },
          },
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$metadataCompleteness.score' },
            evaluated: { $sum: 1 },
          },
        },
      ]),
      DecreeModel.aggregate([
        {
          $match: {
            ...notDeleted,
            ...ownerMatch,
            'metadataCompleteness.score': { $exists: true, $type: 'number' },
          },
        },
        {
          $bucket: {
            groupBy: '$metadataCompleteness.score',
            boundaries: [0, 25, 50, 75, 90, 101],
            default: 'other',
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      DecreeModel.aggregate([
        { $match: { ...notDeleted, ...ownerMatch, categoryIds: { $exists: true, $ne: [] } } },
        { $unwind: '$categoryIds' },
        { $group: { _id: '$categoryIds', decreeCount: { $sum: 1 } } },
        { $sort: { decreeCount: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: 'decree_categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            categoryId: '$_id',
            slug: '$category.slug',
            name: '$category.name',
            namePs: '$category.namePs',
            decreeCount: 1,
          },
        },
      ]),
      DecreeModel.aggregate([
        { $match: { ...notDeleted, ...ownerMatch, categoryIds: { $exists: true, $ne: [] } } },
        { $unwind: '$categoryIds' },
        {
          $group: {
            _id: '$categoryIds',
            viewSum: { $sum: { $ifNull: ['$viewCount', 0] } },
          },
        },
        { $sort: { viewSum: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'decree_categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            categoryId: '$_id',
            slug: '$category.slug',
            name: '$category.name',
            viewSum: 1,
          },
        },
      ]),
      DecreeModel.find({ ...notDeleted, ...ownerMatch })
        .sort({ viewCount: -1, updatedAt: -1 })
        .limit(5)
        .select({ _id: 1, decreeNumber: 1, categorySequence: 1, titleSummary: 1, viewCount: 1, categoryIds: 1 })
        .lean(),
      DecreeModel.find({ ...notDeleted, ...ownerMatch, updatedAt: { $gte: recentWeekStart } })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select({
          decreeNumber: 1,
          categorySequence: 1,
          titleSummary: 1,
          status: 1,
          updatedAt: 1,
          publishedAt: 1,
          viewCount: 1,
          downloadCount: 1,
        })
        .lean(),
      DecreeModel.aggregate([
        { $match: { ...notDeleted, ...ownerMatch } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: { $ifNull: ['$viewCount', 0] } },
            totalDownloads: { $sum: { $ifNull: ['$downloadCount', 0] } },
          },
        },
      ]),
      actorUserId && mongoose.Types.ObjectId.isValid(actorUserId)
        ? decreeViewRepository.aggregateViewsByDayForUploader(actorUserId, from, to)
        : Promise.resolve([]),
      actorUserId && mongoose.Types.ObjectId.isValid(actorUserId)
        ? decreeViewRepository.aggregateViewsByMonthForUploader(actorUserId, viewsMonthFrom, to)
        : Promise.resolve([]),
      actorUserId && mongoose.Types.ObjectId.isValid(actorUserId)
        ? DecreeModel.aggregate([
            {
              $match: {
                ...notDeleted,
                ...ownerMatch,
                createdAt: { $gte: viewsMonthFrom },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, month: '$_id', count: 1 } },
          ])
        : Promise.resolve([]),
      actorUserId && mongoose.Types.ObjectId.isValid(actorUserId)
        ? decreeViewRepository.aggregateViewsByMonthByPrimaryCategoryForUploader(
            actorUserId,
            viewsMonthFrom,
            to,
          )
        : Promise.resolve([]),
      actorUserId && mongoose.Types.ObjectId.isValid(actorUserId)
        ? AuditLogModel.find({
            actorUserId: new mongoose.Types.ObjectId(actorUserId),
            entityType: 'Decree',
            occurredAt: { $gte: recentWeekStart },
            actionKey: {
              $in: ['decree.create', 'decree.update', 'decree.publish', 'decree.archive', 'decree.supersede'],
            },
          })
            .sort({ occurredAt: -1 })
            .limit(25)
            .select({ actionKey: 1, summary: 1, entityId: 1, occurredAt: 1, payload: 1 })
            .lean()
        : Promise.resolve([]),
    ]);

    const metaRow = metaAgg[0] ?? {};
    const evaluated = Number(metaRow.evaluated ?? 0);
    const avgScore = metaRow.avgScore == null ? null : Math.round(Number(metaRow.avgScore) * 10) / 10;

    const distribution = {
      '0_24': 0,
      '25_49': 0,
      '50_74': 0,
      '75_89': 0,
      '90_100': 0,
    };
    for (const b of bucketAgg) {
      const k = b._id;
      if (k === 0) distribution['0_24'] = b.count;
      else if (k === 25) distribution['25_49'] = b.count;
      else if (k === 50) distribution['50_74'] = b.count;
      else if (k === 75) distribution['75_89'] = b.count;
      else if (k === 90) distribution['90_100'] = b.count;
    }

    const engRow = sumEngagement[0] ?? {};
    const totalViewsAll = Math.max(0, Number(engRow.totalViews ?? 0));
    const viewsMap = new Map((viewsByDayRaw ?? []).map((r) => [r.date, r.count]));
    const viewsOverTime = fillDailySeries(30, viewsMap);
    const viewsByMonth12 = fillMonthlySeriesFromRows(viewsByMonthRaw ?? [], 12);
    const vThis = viewsByMonth12[11]?.count ?? 0;
    const vPrevM = viewsByMonth12[10]?.count ?? 0;
    const viewsMomPct =
      vPrevM === 0 ? (vThis > 0 ? 100 : 0) : Math.round(((vThis - vPrevM) / vPrevM) * 1000) / 10;
    const viewsMomUp = vThis >= vPrevM;

    const nNow = Number(newDecreesThisMonth) || 0;
    const nLast = Number(newDecreesLastMonth) || 0;
    const newDecreesMomPct = nLast === 0 ? (nNow > 0 ? 100 : 0) : Math.round(((nNow - nLast) / nLast) * 1000) / 10;
    const newDecreesMomUp = nNow >= nLast;

    const denom = totalViewsAll > 0 ? totalViewsAll : 1;
    const topCategoriesByViewsChart = (topCategoriesByViews ?? []).map((c) => ({
      categoryId: String(c.categoryId),
      slug: c.slug ?? null,
      name: c.name ?? '—',
      viewSum: Number(c.viewSum ?? 0),
      sharePct: Math.min(100, Math.round((100 * Number(c.viewSum ?? 0)) / denom)),
    }));

    const mvCatIds = [
      ...new Set((mostViewedDecrees ?? []).map((d) => (d.categoryIds?.[0] ? String(d.categoryIds[0]) : null)).filter(Boolean)),
    ];
    const mvCats = mvCatIds.length ? await decreeCategoryRepository.findByIdsLean(mvCatIds) : [];
    const mvName = new Map(mvCats.map((c) => [String(c._id), c.name ?? '—']));
    const mostViewed = (mostViewedDecrees ?? []).map((d) => ({
      id: String(d._id),
      decreeNumber: d.decreeNumber,
      decreeNumberLabel: buildDecreeNumberLabel(d),
      titleSummary: d.titleSummary,
      viewCount: typeof d.viewCount === 'number' ? d.viewCount : 0,
      categoryId: d.categoryIds?.[0] ? String(d.categoryIds[0]) : null,
      categoryName: d.categoryIds?.[0] ? (mvName.get(String(d.categoryIds[0])) ?? '—') : '—',
    }));

    const uploadsByMonth12 = fillMonthlySeriesFromRows(uploadsByMonthRaw ?? [], 12);
    const categoryViewTrends = (topCategoriesByViews ?? []).slice(0, 5).map((c) => {
      const cid = String(c.categoryId);
      const sub = (categoryViewRows ?? [])
        .filter((r) => r.categoryId === cid)
        .map((r) => ({ month: r.month, count: r.count }));
      return {
        categoryId: cid,
        name: c.name ?? '—',
        months: fillMonthlySeriesFromRows(sub, 12),
      };
    });

    const recentActivity = (recentAuditRows ?? []).map((row) => ({
      id: String(row._id),
      actionKey: row.actionKey,
      summary: row.summary ?? null,
      entityId: row.entityId ? String(row.entityId) : null,
      occurredAt: row.occurredAt ? new Date(row.occurredAt).toISOString() : null,
    }));

    return serializeDecreeUploadDashboardDto({
      generatedAt,
      newDecreesThisMonth: nNow,
      newDecreesLastMonth: nLast,
      newDecreesMonthOverMonth: {
        changePct: newDecreesMomPct,
        up: newDecreesMomUp,
        currentMonth: nNow,
        previousMonth: nLast,
      },
      viewsMonthOverMonth: {
        changePct: viewsMomPct,
        up: viewsMomUp,
        currentMonth: vThis,
        previousMonth: vPrevM,
        currentMonthLabel: viewsByMonth12[11]?.month ?? null,
        previousMonthLabel: viewsByMonth12[10]?.month ?? null,
      },
      viewsByMonth12,
      topCategoriesByViews: topCategoriesByViewsChart,
      topViewedCategoryId: topCategoriesByViewsChart[0]?.categoryId ?? null,
      mostViewedDecrees: mostViewed,
      decrees: {
        total,
        active,
        archived,
        other: { draft, superseded, pending },
      },
      metadataCompleteness: {
        evaluatedDecrees: evaluated,
        averageScore: avgScore,
        distribution,
      },
      topCategories: topCats.map((c) => ({
        categoryId: String(c.categoryId),
        slug: c.slug ?? null,
        name: c.name ?? null,
        namePs: c.namePs ?? null,
        decreeCount: c.decreeCount,
      })),
      engagement: {
        totalViews: totalViewsAll,
        totalDownloads: Number(engRow.totalDownloads ?? 0),
      },
      viewsOverTime,
      uploadsByMonth12,
      categoryViewTrends,
      recentActivity,
      recentUploads: recent.map((d) => ({
        id: String(d._id),
        decreeNumber: d.decreeNumber,
        decreeNumberLabel: buildDecreeNumberLabel(d),
        titleSummary: d.titleSummary,
        titlePs: d.titlePs ?? '',
        titleFa: d.titleFa ?? '',
        titleEn: d.titleEn ?? '',
        status: d.status,
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
        publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
        viewCount: typeof d.viewCount === 'number' ? d.viewCount : 0,
        downloadCount: typeof d.downloadCount === 'number' ? d.downloadCount : 0,
      })),
    });
  }

  async getInspectorAdminDashboard() {
    return this.#snapshotOrCompute('inspector_admin', () => this.#computeInspectorAdminDashboard());
  }

  async #computeInspectorAdminDashboard() {
    const generatedAt = new Date().toISOString();
    const now = new Date();
    const since30 = rollingUtcStart(30);
    const since14 = rollingUtcStart(14);

    const notDeleted = { isDeleted: { $ne: true } };
    const openStatuses = ['assigned', 'in_progress', 'draft_saved', 'submitted', 'returned_for_revision'];

    const [facet, regionTrends, submissionSeries, examFacet, certByStatus] = await Promise.all([
      InspectionAssignmentModel.aggregate([
        { $match: notDeleted },
        {
          $facet: {
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            overdue: [
              {
                $match: {
                  dueAt: { $type: 'date', $lt: now },
                  status: { $in: openStatuses },
                },
              },
              { $count: 'n' },
            ],
          },
        },
      ]),
      InspectionAssignmentModel.aggregate([
        {
          $match: {
            ...notDeleted,
            updatedAt: { $gte: since30 },
            region: { $type: 'string', $nin: [null, ''] },
          },
        },
        { $group: { _id: '$region', assignmentCount: { $sum: 1 } } },
        { $sort: { assignmentCount: -1 } },
        { $limit: 16 },
      ]),
      InspectionSubmissionModel.aggregate([
        { $match: { ...notDeleted, createdAt: { $gte: since14 } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ExamAttemptModel.aggregate([
        { $match: { ...notDeleted, createdAt: { $gte: since30 } } },
        {
          $facet: {
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            uniqueExaminees: [
              { $group: { _id: null, users: { $addToSet: '$examineeUserId' } } },
              { $project: { count: { $size: '$users' } } },
            ],
          },
        },
      ]),
      CertificateModel.aggregate([
        { $match: notDeleted },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const f = facet[0] ?? { byStatus: [], overdue: [] };
    const byStatusRows = f.byStatus ?? [];
    const statusMap = rowsToMap(
      byStatusRows.map((r) => ({ _id: r._id, count: r.count })),
      'count',
    );

    const assigned = statusMap.get('assigned') ?? 0;
    const inProgressOnly = statusMap.get('in_progress') ?? 0;
    const draftSaved = statusMap.get('draft_saved') ?? 0;
    const returned = statusMap.get('returned_for_revision') ?? 0;
    const finalized = statusMap.get('finalized') ?? 0;
    const submitted = statusMap.get('submitted') ?? 0;
    const overdue = f.overdue?.[0]?.n ?? 0;

    const activeWorking = inProgressOnly + draftSaved;
    const pendingQueue = assigned + submitted;

    const ex = examFacet[0] ?? { byStatus: [], uniqueExaminees: [] };
    const attemptByStatus = Object.fromEntries(
      (ex.byStatus ?? []).map((r) => [String(r._id), Number(r.count ?? 0)]),
    );
    const uniqueExaminees30d = ex.uniqueExaminees?.[0]?.count ?? 0;

    const publishedOpenExams = await ExamModel.countDocuments({
      ...notDeleted,
      status: { $in: ['published', 'open', 'scheduled'] },
    });

    return serializeInspectorAdminDashboardDto({
      generatedAt,
      assignments: {
        byStatus: Object.fromEntries(statusMap),
        overdue,
        activeWorking,
        pendingQueue,
        assigned,
        inProgress: inProgressOnly,
        draftSaved,
        returnedForRevision: returned,
        submitted,
        finalized,
      },
      regionTrends: regionTrends.map((r) => ({
        region: String(r._id),
        assignmentCount: r.assignmentCount,
      })),
      submissionVolumes: fillDailySeries(14, rowsToMap(submissionSeries, 'count')),
      exams: {
        publishedOrOpenScheduled: publishedOpenExams,
        attemptsLast30Days: {
          byStatus: attemptByStatus,
          uniqueExaminees: uniqueExaminees30d,
        },
      },
      certificates: {
        byStatus: Object.fromEntries(
          certByStatus.map((r) => [String(r._id), Number(r.count ?? 0)]),
        ),
      },
    });
  }

  /**
   * @param {string | null} inspectorUserId
   */
  async getInspectorDashboard(inspectorUserId) {
    const generatedAt = new Date().toISOString();

    if (!inspectorUserId || !mongoose.Types.ObjectId.isValid(inspectorUserId)) {
      return serializeInspectorDashboardDto({
        generatedAt,
        binding: { inspectorUserId: null, resolution: 'missing_identity' },
        assignments: {
          assigned: 0,
          inProgress: 0,
          draftSaved: 0,
          submitted: 0,
          returnedForRevision: 0,
          finalized: 0,
          total: 0,
        },
        syncQueue: {
          draftsPendingSync: 0,
          submittedAwaitingReview: 0,
          returnedAwaitingRevision: 0,
          note: 'Provide `X-Inspector-User-Id` until JWT auth populates `req.context.actor`.',
        },
      });
    }

    const oid = new mongoose.Types.ObjectId(inspectorUserId);
    const notDeleted = { isDeleted: { $ne: true }, inspectorUserId: oid };

    const byStatus = await InspectionAssignmentModel.aggregate([
      { $match: notDeleted },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const m = rowsToMap(byStatus.map((r) => ({ _id: r._id, count: r.count })), 'count');

    const assigned = m.get('assigned') ?? 0;
    const inProgress = m.get('in_progress') ?? 0;
    const draftSaved = m.get('draft_saved') ?? 0;
    const submitted = m.get('submitted') ?? 0;
    const returned = m.get('returned_for_revision') ?? 0;
    const finalized = m.get('finalized') ?? 0;
    const total = [...m.values()].reduce((a, b) => a + b, 0);

    return serializeInspectorDashboardDto({
      generatedAt,
      binding: { inspectorUserId, resolution: 'header_or_actor' },
      assignments: {
        assigned,
        inProgress,
        draftSaved,
        submitted,
        returnedForRevision: returned,
        finalized,
        total,
      },
      syncQueue: {
        draftsPendingSync: draftSaved,
        submittedAwaitingReview: submitted,
        returnedAwaitingRevision: returned,
      },
    });
  }

  /**
   * @param {import('mongoose').Types.ObjectId | null} ownerUserId
   */
  async getPublicDashboard(ownerUserId) {
    const generatedAt = new Date().toISOString();
    const notDeleted = { isDeleted: { $ne: true } };

    const [featuredDecrees, upcomingExams] = await Promise.all([
      DecreeModel.find({
        ...notDeleted,
        visibility: 'public',
        status: 'active',
      })
        .sort({ publishedAt: -1, updatedAt: -1 })
        .limit(8)
        .select({ decreeNumber: 1, titleSummary: 1, publishedAt: 1, status: 1 })
        .lean(),
      ExamModel.find({
        ...notDeleted,
        status: { $in: ['scheduled', 'open'] },
        $or: [{ scheduledClosesAt: null }, { scheduledClosesAt: { $gte: new Date() } }],
      })
        .sort({ scheduledOpensAt: 1, scheduledClosesAt: 1 })
        .limit(10)
        .select({ title: 1, status: 1, scheduledOpensAt: 1, scheduledClosesAt: 1 })
        .lean(),
    ]);

    const hasUser = Boolean(ownerUserId);

    let bookmarkCount = null;
    let certificateCount = null;
    let notificationsUnread = null;

    if (hasUser) {
      const uid = /** @type {import('mongoose').Types.ObjectId} */ (ownerUserId);
      ;[bookmarkCount, certificateCount, notificationsUnread] = await Promise.all([
        DecreeBookmarkModel.countDocuments({ ...notDeleted, ownerUserId: uid }),
        CertificateModel.countDocuments({ ...notDeleted, holderUserId: uid, status: 'issued' }),
        this.notifications.countUnreadForPublicInbox({ recipientUserId: String(uid) }),
      ]);
    }

    return serializePublicDashboardDto({
      generatedAt,
      identity: {
        ownerUserId: hasUser ? String(ownerUserId) : null,
        personalizedMetrics: hasUser,
      },
      featuredDecrees,
      upcomingExams,
      bookmarks: hasUser
        ? { placeholder: false, count: bookmarkCount }
        : { placeholder: true, count: null, hint: 'Set `X-Public-User-Id` or `PUBLIC_API_STANDALONE_USER_ID` for real counts.' },
      certificates: hasUser
        ? { placeholder: false, issuedCount: certificateCount }
        : { placeholder: true, issuedCount: null, hint: 'Requires a resolved public user id.' },
      notifications: hasUser
        ? { placeholder: false, unreadCount: notificationsUnread }
        : { placeholder: true, unreadCount: null, hint: 'Requires a resolved public user id.' },
    });
  }
}

export const dashboardsService = new DashboardsService();
