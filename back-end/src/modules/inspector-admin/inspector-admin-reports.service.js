import mongoose from 'mongoose';
import { InspectionAssignmentModel } from '../../../database/models/inspection-assignment.model.js';
import { InspectionSubmissionModel } from '../../../database/models/inspection-submission.model.js';
import { CertificateModel } from '../../../database/models/certificate.model.js';
import { ExamAttemptModel } from '../../../database/models/exam-attempt.model.js';
import { ExamModel } from '../../../database/models/exam.model.js';
import { UserModel } from '../../../database/models/user.model.js';
import { DecreeModel } from '../../../database/models/decree.model.js';
import { InspectionAssignmentStatus } from '../shared/enums/inspection-assignment-status.js';

/**
 * @param {string | undefined} v
 */
function parseIsoDate(v) {
  if (!v || typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function escapeRx(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {unknown} v
 */
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string[]} columns
 */
function toCsv(rows, columns) {
  const header = columns.map(csvCell).join(',');
  const lines = rows.map((r) => columns.map((c) => csvCell(r[c])).join(','));
  return [header, ...lines].join('\n') + '\n';
}

function safeBasename(name) {
  const t = String(name || '')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return t.length > 0 ? t.slice(0, 88) : 'report';
}

export class InspectorAdminReportsService {
  /**
   * @param {{
   *   decreeId?: string,
   *   categoryId?: string,
   *   startDate?: string,
   *   endDate?: string,
   *   region?: string,
   * }} q
   */
  async getImplementationReport(q) {
    const from = parseIsoDate(q.startDate) ?? new Date(Date.now() - 90 * 86400000);
    const to = parseIsoDate(q.endDate) ?? new Date();

    const matchSub = /** @type {Record<string, unknown>} */ ({
      isDeleted: { $ne: true },
      approvedByUserId: { $ne: null },
      submissionKind: 'final',
      submittedAt: { $gte: from, $lte: to },
    });

    const pipeline = [
      { $match: matchSub },
      {
        $lookup: {
          from: 'inspection_assignments',
          localField: 'assignmentId',
          foreignField: '_id',
          as: 'a',
        },
      },
      { $unwind: '$a' },
      {
        $match: {
          'a.isDeleted': { $ne: true },
          'a.status': InspectionAssignmentStatus.FINALIZED,
        },
      },
      ...(q.region?.trim()
        ? [{ $match: { 'a.region': new RegExp(`^${escapeRx(q.region.trim())}$`, 'i') } }]
        : []),
      ...(q.decreeId && mongoose.Types.ObjectId.isValid(q.decreeId)
        ? [{ $match: { 'a.decreeId': new mongoose.Types.ObjectId(q.decreeId) } }]
        : []),
      ...(q.categoryId && mongoose.Types.ObjectId.isValid(q.categoryId)
        ? [
            {
              $lookup: {
                from: 'decrees',
                localField: 'a.decreeId',
                foreignField: '_id',
                as: '_dec',
              },
            },
            { $unwind: '$_dec' },
            {
              $match: {
                '_dec.categoryIds': new mongoose.Types.ObjectId(q.categoryId),
              },
            },
            { $project: { _dec: 0 } },
          ]
        : []),
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                approved: { $sum: 1 },
              },
            },
          ],
          byRegion: [
            {
              $group: {
                _id: { $ifNull: ['$a.region', 'unknown'] },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 48 },
          ],
          byDecree: [
            {
              $group: {
                _id: '$a.decreeId',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 80 },
          ],
        },
      },
    ];

    const [row] = await InspectionSubmissionModel.aggregate(pipeline);
    const approved = Number(row?.totals?.[0]?.approved ?? 0);

    const byRegion = (row?.byRegion ?? []).map((r) => ({
      region: String(r._id),
      approved: r.count,
      approvedPctOfTotal: approved > 0 ? Math.round((r.count / approved) * 1000) / 10 : 0,
    }));

    const byDecree = (row?.byDecree ?? []).map((r) => ({
      decreeId: r._id ? String(r._id) : null,
      approved: r.count,
      approvedPctOfTotal: approved > 0 ? Math.round((r.count / approved) * 1000) / 10 : 0,
    }));

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      summary: { approvedSubmissions: approved },
      byRegion,
      byDecree,
    };
  }

  /**
   * @param {{
   *   startDate?: string,
   *   endDate?: string,
   * }} q
   */
  async getInspectorPerformanceReport(q) {
    const from = parseIsoDate(q.startDate) ?? new Date(Date.now() - 90 * 86400000);
    const to = parseIsoDate(q.endDate) ?? new Date();
    const rows = await InspectionAssignmentModel.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          'reporting.finalizedAt': { $gte: from, $lte: to },
          status: InspectionAssignmentStatus.FINALIZED,
        },
      },
      {
        $group: {
          _id: '$inspectorUserId',
          finalized: { $sum: 1 },
        },
      },
      { $sort: { finalized: -1 } },
      { $limit: 100 },
    ]);

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      items: rows.map((r) => ({
        inspectorUserId: r._id ? String(r._id) : null,
        finalizedCount: r.finalized,
      })),
    };
  }

  /**
   * @param {{
   *   type: 'inspection_summary' | 'implementation_audit' | 'certification_registry' | 'evaluation_performance',
   *   startDate?: string,
   *   endDate?: string,
   *   region?: string,
   *   anonymize?: boolean,
   * }} q
   */
  async exportCsv(q) {
    const from = parseIsoDate(q.startDate) ?? new Date(Date.now() - 30 * 86400000);
    const to = parseIsoDate(q.endDate) ?? new Date();
    const region = typeof q.region === 'string' && q.region.trim() ? q.region.trim() : null;
    const anonymize = q.anonymize === true;

    const rangeTag = `${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}`;
    const baseName = safeBasename(`inspector_admin_${q.type}_${rangeTag}${region ? `_region_${region}` : ''}`);
    const filename = `${baseName}.csv`;

    if (q.type === 'inspection_summary') {
      const pipeline = [
        {
          $match: {
            isDeleted: { $ne: true },
            submissionKind: 'final',
            submittedAt: { $gte: from, $lte: to },
          },
        },
        {
          $lookup: {
            from: 'inspection_assignments',
            localField: 'assignmentId',
            foreignField: '_id',
            as: 'a',
          },
        },
        { $unwind: '$a' },
        {
          $match: {
            'a.isDeleted': { $ne: true },
            'a.status': InspectionAssignmentStatus.FINALIZED,
            ...(region ? { 'a.region': new RegExp(`^${escapeRx(region)}$`, 'i') } : {}),
          },
        },
        {
          $project: {
            assignmentId: '$assignmentId',
            region: '$a.region',
            inspectorUserId: '$a.inspectorUserId',
            decreeId: '$a.decreeId',
            submittedAt: '$submittedAt',
            score: { $ifNull: ['$review.score', '$autoScore'] },
          },
        },
        { $sort: { submittedAt: -1 } },
        { $limit: 5000 },
      ];

      const raw = await InspectionSubmissionModel.aggregate(pipeline);
      const inspectorIds = [...new Set(raw.map((r) => (r.inspectorUserId ? String(r.inspectorUserId) : '')).filter(Boolean))];
      const decreeIds = [...new Set(raw.map((r) => (r.decreeId ? String(r.decreeId) : '')).filter(Boolean))];
      const [inspectors, decrees] = await Promise.all([
        inspectorIds.length
          ? UserModel.find({ _id: { $in: inspectorIds.map((id) => new mongoose.Types.ObjectId(id)) }, isDeleted: { $ne: true } })
              .select({ displayName: 1, email: 1 })
              .lean()
          : Promise.resolve([]),
        decreeIds.length
          ? DecreeModel.find({ _id: { $in: decreeIds.map((id) => new mongoose.Types.ObjectId(id)) }, isDeleted: { $ne: true } })
              .select({ decreeNumber: 1, titleSummary: 1 })
              .lean()
          : Promise.resolve([]),
      ]);
      const inspectorById = new Map(inspectors.map((u) => [String(u._id), u]));
      const decreeById = new Map(decrees.map((d) => [String(d._id), d]));

      const rows = raw.map((r) => {
        const inspector = r.inspectorUserId ? inspectorById.get(String(r.inspectorUserId)) : null;
        const decree = r.decreeId ? decreeById.get(String(r.decreeId)) : null;
        const score = typeof r.score === 'number' && Number.isFinite(r.score) ? Math.round(r.score) : '';
        return {
          reportType: 'inspection_summary',
          assignmentId: r.assignmentId ? String(r.assignmentId) : '',
          submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
          region: r.region ? String(r.region) : '',
          decreeNumber: decree ? String(decree.decreeNumber ?? '') : '',
          decreeTitle: decree ? String(decree.titleSummary ?? '') : '',
          inspectorName: anonymize ? '—' : inspector ? String(inspector.displayName ?? '') : '',
          inspectorEmail: anonymize ? '—' : inspector ? String(inspector.email ?? '') : '',
          scorePct: score,
        };
      });
      const csv = toCsv(rows, [
        'reportType',
        'assignmentId',
        'submittedAt',
        'region',
        'decreeNumber',
        'decreeTitle',
        'inspectorName',
        'inspectorEmail',
        'scorePct',
      ]);
      return { csv, filename };
    }

    if (q.type === 'implementation_audit') {
      const pipeline = [
        {
          $match: {
            isDeleted: { $ne: true },
            status: InspectionAssignmentStatus.FINALIZED,
            finalizedAt: { $gte: from, $lte: to },
            ...(region ? { region: new RegExp(`^${escapeRx(region)}$`, 'i') } : {}),
          },
        },
        {
          $project: {
            decreeId: 1,
            decreeVersionId: 1,
            inspectorUserId: 1,
            region: 1,
            dueAt: 1,
            assignedAt: 1,
            submittedAt: 1,
            finalizedAt: 1,
            reviewScore: '$reporting.reviewScore',
            evidenceFileCount: '$reporting.implementationSignals.evidenceFileCount',
            answerCount: '$reporting.implementationSignals.answerCount',
            sectionsTouchedCount: '$reporting.implementationSignals.sectionsTouchedCount',
          },
        },
        { $sort: { finalizedAt: -1 } },
        { $limit: 5000 },
      ];

      const raw = await InspectionAssignmentModel.aggregate(pipeline);
      const inspectorIds = [...new Set(raw.map((r) => (r.inspectorUserId ? String(r.inspectorUserId) : '')).filter(Boolean))];
      const decreeIds = [...new Set(raw.map((r) => (r.decreeId ? String(r.decreeId) : '')).filter(Boolean))];
      const [inspectors, decrees] = await Promise.all([
        inspectorIds.length
          ? UserModel.find({ _id: { $in: inspectorIds.map((id) => new mongoose.Types.ObjectId(id)) }, isDeleted: { $ne: true } })
              .select({ displayName: 1, email: 1 })
              .lean()
          : Promise.resolve([]),
        decreeIds.length
          ? DecreeModel.find({ _id: { $in: decreeIds.map((id) => new mongoose.Types.ObjectId(id)) }, isDeleted: { $ne: true } })
              .select({ decreeNumber: 1, titleSummary: 1 })
              .lean()
          : Promise.resolve([]),
      ]);
      const inspectorById = new Map(inspectors.map((u) => [String(u._id), u]));
      const decreeById = new Map(decrees.map((d) => [String(d._id), d]));

      const rows = raw.map((r) => {
        const inspector = r.inspectorUserId ? inspectorById.get(String(r.inspectorUserId)) : null;
        const decree = r.decreeId ? decreeById.get(String(r.decreeId)) : null;
        const reviewScore =
          typeof r.reviewScore === 'number' && Number.isFinite(r.reviewScore) ? Math.round(r.reviewScore) : '';
        return {
          reportType: 'implementation_audit',
          assignmentId: r._id ? String(r._id) : '',
          region: r.region ? String(r.region) : '',
          decreeNumber: decree ? String(decree.decreeNumber ?? '') : '',
          decreeTitle: decree ? String(decree.titleSummary ?? '') : '',
          inspectorName: anonymize ? '—' : inspector ? String(inspector.displayName ?? '') : '',
          inspectorEmail: anonymize ? '—' : inspector ? String(inspector.email ?? '') : '',
          assignedAt: r.assignedAt ? new Date(r.assignedAt).toISOString() : '',
          submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
          finalizedAt: r.finalizedAt ? new Date(r.finalizedAt).toISOString() : '',
          reviewScorePct: reviewScore,
          answerCount: typeof r.answerCount === 'number' ? r.answerCount : '',
          sectionsTouchedCount: typeof r.sectionsTouchedCount === 'number' ? r.sectionsTouchedCount : '',
          evidenceFileCount: typeof r.evidenceFileCount === 'number' ? r.evidenceFileCount : '',
        };
      });
      const csv = toCsv(rows, [
        'reportType',
        'assignmentId',
        'region',
        'decreeNumber',
        'decreeTitle',
        'inspectorName',
        'inspectorEmail',
        'assignedAt',
        'submittedAt',
        'finalizedAt',
        'reviewScorePct',
        'answerCount',
        'sectionsTouchedCount',
        'evidenceFileCount',
      ]);
      return { csv, filename };
    }

    if (q.type === 'certification_registry') {
      const certs = await CertificateModel.find({
        isDeleted: { $ne: true },
        status: 'issued',
        issuedAt: { $gte: from, $lte: to },
      })
        .sort({ issuedAt: -1 })
        .limit(5000)
        .lean();

      const holderIds = [...new Set(certs.map((c) => (c.holderUserId ? String(c.holderUserId) : '')).filter(Boolean))];
      const holders = holderIds.length
        ? await UserModel.find({ _id: { $in: holderIds.map((id) => new mongoose.Types.ObjectId(id)) }, isDeleted: { $ne: true } })
            .select({ displayName: 1, email: 1 })
            .lean()
        : [];
      const holderById = new Map(holders.map((u) => [String(u._id), u]));

      const rows = certs.map((c) => {
        const holder = c.holderUserId ? holderById.get(String(c.holderUserId)) : null;
        const issuedAt = c.issuedAt ? new Date(c.issuedAt).toISOString() : '';
        const revokedAt = c.revokedAt ? new Date(c.revokedAt).toISOString() : '';
        return {
          reportType: 'certification_registry',
          certificateId: c._id ? String(c._id) : '',
          certificateNumber: c.certificateNumber ? String(c.certificateNumber) : '',
          status: String(c.status ?? ''),
          kind: String(c.kind ?? ''),
          issuedAt,
          revokedAt,
          holderName: anonymize ? '—' : holder ? String(holder.displayName ?? '') : '',
          holderEmail: anonymize ? '—' : holder ? String(holder.email ?? '') : '',
        };
      });
      const csv = toCsv(rows, [
        'reportType',
        'certificateId',
        'certificateNumber',
        'status',
        'kind',
        'issuedAt',
        'revokedAt',
        'holderName',
        'holderEmail',
      ]);
      return { csv, filename };
    }

    if (q.type === 'evaluation_performance') {
      const attempts = await ExamAttemptModel.find({
        isDeleted: { $ne: true },
        submittedAt: { $gte: from, $lte: to },
        status: { $in: ['submitted', 'graded'] },
      })
        .select({ examId: 1, passed: 1, score: 1, maxScore: 1, submittedAt: 1 })
        .limit(20000)
        .lean();

      const examIds = [...new Set(attempts.map((a) => (a.examId ? String(a.examId) : '')).filter(Boolean))];
      const exams = examIds.length
        ? await ExamModel.find({ _id: { $in: examIds.map((id) => new mongoose.Types.ObjectId(id)) }, isDeleted: { $ne: true } })
            .select({ title: 1, decreeCategoryName: 1 })
            .lean()
        : [];
      const examById = new Map(exams.map((e) => [String(e._id), e]));

      /** @type {Map<string, { examId: string, attempts: number, passed: number, failed: number, sumScorePct: number, scored: number }>} */
      const agg = new Map();
      for (const a of attempts) {
        const eid = a.examId ? String(a.examId) : '';
        if (!eid) continue;
        const row = agg.get(eid) ?? { examId: eid, attempts: 0, passed: 0, failed: 0, sumScorePct: 0, scored: 0 };
        row.attempts += 1;
        if (a.passed === true) row.passed += 1;
        else if (a.passed === false) row.failed += 1;
        const sc = typeof a.score === 'number' ? a.score : null;
        const mx = typeof a.maxScore === 'number' && a.maxScore > 0 ? a.maxScore : null;
        if (sc !== null && mx !== null) {
          row.sumScorePct += (sc / mx) * 100;
          row.scored += 1;
        }
        agg.set(eid, row);
      }

      const rows = [...agg.values()]
        .map((r) => {
          const ex = examById.get(r.examId);
          const passRate = r.attempts > 0 ? Math.round((r.passed / r.attempts) * 1000) / 10 : 0;
          const avgScorePct = r.scored > 0 ? Math.round((r.sumScorePct / r.scored) * 10) / 10 : '';
          return {
            reportType: 'evaluation_performance',
            examId: r.examId,
            examTitle: ex ? String(ex.title ?? '') : '',
            category: ex ? String(ex.decreeCategoryName ?? '') : '',
            attempts: r.attempts,
            passed: r.passed,
            failed: r.failed,
            passRatePct: passRate,
            avgScorePct,
          };
        })
        .sort((a, b) => Number(b.attempts) - Number(a.attempts));

      const csv = toCsv(rows, [
        'reportType',
        'examId',
        'examTitle',
        'category',
        'attempts',
        'passed',
        'failed',
        'passRatePct',
        'avgScorePct',
      ]);
      return { csv, filename };
    }

    return { csv: 'reportType\n', filename };
  }
}

export const inspectorAdminReportsService = new InspectorAdminReportsService();
