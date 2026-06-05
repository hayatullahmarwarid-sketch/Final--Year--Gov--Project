import mongoose from 'mongoose';
import { API_VERSION } from '../shared/constants/api.js';
import { inspectionTemplateRepository } from '../../../database/repositories/inspection-template.repository.js';
import { inspectionAssignmentRepository } from '../../../database/repositories/inspection-assignment.repository.js';
import { inspectionSubmissionRepository } from '../../../database/repositories/inspection-submission.repository.js';
import { examRepository } from '../../../database/repositories/exam.repository.js';
import { examQuestionBankRepository } from '../../../database/repositories/exam-question-bank.repository.js';
import { examQuestionRepository } from '../../../database/repositories/exam-question.repository.js';
import { examAttemptRepository } from '../../../database/repositories/exam-attempt.repository.js';
import { certificateRepository } from '../../../database/repositories/certificate.repository.js';
import { decreeRepository } from '../../../database/repositories/decree.repository.js';
import { decreeCategoryRepository } from '../../../database/repositories/decree-category.repository.js';
import { userRepository } from '../../../database/repositories/user.repository.js';
import { DecreeVersionModel } from '../../../database/models/decree-version.model.js';
import { InspectionAssignmentModel } from '../../../database/models/inspection-assignment.model.js';
import { InspectionTemplateModel } from '../../../database/models/inspection-template.model.js';
import { ExamModel } from '../../../database/models/exam.model.js';
import { CertificateModel } from '../../../database/models/certificate.model.js';
import { InspectionSubmissionModel } from '../../../database/models/inspection-submission.model.js';
import { toOffsetLimit } from '../shared/query/pagination.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../shared/http/index.js';
import { RoleKey } from '../shared/enums/roles.js';
import { InspectionAssignmentStatus } from '../shared/enums/inspection-assignment-status.js';
import { CertificateStatus } from '../shared/enums/certificate-status.js';
import { ExamLifecycle } from '../shared/enums/exam-lifecycle.js';
import { ExamQuestionType } from '../shared/enums/exam-question-type.js';
import { assertExamAdminLifecycleTransition } from '../exams/exam-lifecycle.rules.js';
import { inspectionSubmissionReviewWorkflow } from '../inspections/inspection-submission-review.workflow.js';
import { inspectionEvidenceFileRepository } from '../../../database/repositories/inspection-evidence-file.repository.js';
import { resolveStoredFileUrl } from '../../services/storage/upload.service.js';
import { INSPECTOR_ADMIN_ROUTE_MAP } from './inspector-admin.constants.js';
import { serializeInspectionTemplate } from './serializers/inspection-template.serializer.js';
import { serializeInspectionAssignment } from './serializers/inspection-assignment.serializer.js';
import { serializeInspectionSubmission } from './serializers/inspection-submission.serializer.js';
import { serializeExam } from './serializers/exam.serializer.js';
import { serializeCertificate } from './serializers/certificate.serializer.js';
import { serializeExamQuestionAdmin } from './serializers/exam-question.serializer.js';
import { serializeExamQuestionBankEntry } from './serializers/exam-question-bank.serializer.js';
import { serializeExamAttemptAdmin } from './serializers/exam-attempt-admin.serializer.js';
import {
  answersArrayToRecord,
  assignmentUiStatus,
  calendarInspectionWindowDays,
  priorityToUi,
  regionKeyFromText,
  submissionUiStatus,
} from './lib/workspace-presenters.js';
import { UserAccountStatus } from '../shared/enums/user-account-status.js';
import { ExamAttemptStatus } from '../shared/enums/exam-attempt-status.js';
import { CertificateKind } from '../shared/enums/certificate-kind.js';
import {
  applyManualEssayGrades,
  allEssaysHaveManualScores,
  totalScoreFromAnswers,
} from '../exams/grading.service.js';
import { certificateIssueWorkflow } from '../certificates/certificate-issue.workflow.js';
import { NotificationModel } from '../../../database/models/notification.model.js';

/**
 * @param {Record<string, unknown> | null | undefined} exam
 */
function examPassThresholdPercent(exam) {
  const v = exam?.passingScore;
  if (typeof v === 'number' && v >= 1 && v <= 100) return v;
  return 55;
}

/**
 * Integer split: `n` parts sum to `total`, first `remainder` parts are one point larger.
 * @param {number} total
 * @param {number} n
 * @returns {number[]}
 */
function splitTotalAcrossQuestionCount(total, n) {
  if (n <= 0) return [];
  const safeTotal = Math.max(0, Math.round(total));
  const base = Math.floor(safeTotal / n);
  const rem = safeTotal - base * n;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(base + (i < rem ? 1 : 0));
  }
  return out;
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
 * Map an internal `CertificateKind` enum value to a human-friendly label
 * suitable for the admin certificates table when no `metadata.category`
 * was provided at issue time.
 *
 * @param {string} kind
 */
function kindToCategoryLabel(kind) {
  switch (kind) {
    case 'exam_pass':
      return 'Exam pass';
    case 'decree_literacy':
      return 'Decree literacy';
    case 'inspection_qualification':
      return 'Inspection qualification';
    default:
      return kind ? kind.replace(/_/g, ' ') : 'Certificate';
  }
}

/**
 * @param {unknown} v
 * @returns {Date | null | undefined}
 */
function normalizeOptionalDate(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestError('Invalid date value');
  return d;
}

/**
 * @param {string} catalog
 * @returns {string | null}
 */
function catalogStatusToLifecycle(catalog) {
  if (catalog === 'draft') return ExamLifecycle.DRAFT;
  if (catalog === 'published') return ExamLifecycle.OPEN;
  if (catalog === 'archived') return ExamLifecycle.CLOSED;
  return null;
}

/**
 * @param {unknown} prevSections
 * @param {unknown} nextSections
 */
function templateSectionsChanged(prevSections, nextSections) {
  const a = prevSections ?? [];
  const b = nextSections ?? [];
  return JSON.stringify(a) !== JSON.stringify(b);
}

export class InspectorAdminService {
  /**
   * @param {{
   *   templates?: import('../../../database/repositories/inspection-template.repository.js').InspectionTemplateRepository,
   *   assignments?: import('../../../database/repositories/inspection-assignment.repository.js').InspectionAssignmentRepository,
   *   submissions?: import('../../../database/repositories/inspection-submission.repository.js').InspectionSubmissionRepository,
   *   exams?: import('../../../database/repositories/exam.repository.js').ExamRepository,
   *   certificates?: import('../../../database/repositories/certificate.repository.js').CertificateRepository,
   *   users?: import('../../../database/repositories/user.repository.js').UserRepository,
   *   examQuestions?: import('../../../database/repositories/exam-question.repository.js').ExamQuestionRepository,
   *   examQuestionBank?: import('../../../database/repositories/exam-question-bank.repository.js').ExamQuestionBankRepository,
   *   examAttempts?: import('../../../database/repositories/exam-attempt.repository.js').ExamAttemptRepository,
   *   decrees?: import('../../../database/repositories/decree.repository.js').DecreeRepository,
   *   decreeCategories?: import('../../../database/repositories/decree-category.repository.js').DecreeCategoryRepository,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.templates = deps.templates ?? inspectionTemplateRepository;
    this.assignments = deps.assignments ?? inspectionAssignmentRepository;
    this.submissions = deps.submissions ?? inspectionSubmissionRepository;
    this.exams = deps.exams ?? examRepository;
    this.certificates = deps.certificates ?? certificateRepository;
    this.users = deps.users ?? userRepository;
    this.examQuestions = deps.examQuestions ?? examQuestionRepository;
    this.examQuestionBank = deps.examQuestionBank ?? examQuestionBankRepository;
    this.examAttempts = deps.examAttempts ?? examAttemptRepository;
    this.decrees = deps.decrees ?? decreeRepository;
    this.decreeCategories = deps.decreeCategories ?? decreeCategoryRepository;
  }

  getModuleMeta() {
    return {
      module: 'inspector-admin',
      apiVersion: API_VERSION,
      description:
        'Inspector administration: templates, assignments, submission review, exams, certificates, and dashboards.',
      routes: INSPECTOR_ADMIN_ROUTE_MAP,
    };
  }

  /** @param {Record<string, unknown>} query */
  async listTemplates(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.templates.findPage({
      skip,
      limit,
      search: query.search,
      isActive: query.isActive,
      sort: query.sort,
      from: query.from,
      to: query.to,
    });
    return {
      items: items.map((r) => serializeInspectionTemplate(r)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async listTemplateCatalog() {
    const [catPage, decPage] = await Promise.all([
      this.decreeCategories.findPage({
        skip: 0,
        limit: 1000,
        isActive: true,
        includeDeleted: false,
        sort: 'sortOrder:asc,name:asc',
      }),
      this.decrees.findPage({
        skip: 0,
        limit: 2000,
        status: 'active',
        includeDeleted: false,
        sort: 'updatedAt:desc',
      }),
    ]);

    const categories = catPage.items.map((c) => ({
      id: String(c._id),
      name: String(c.name ?? ''),
      decrees: [],
    }));
    const byId = new Map(categories.map((c) => [c.id, c]));

    for (const d of decPage.items) {
      const decreeId = String(d._id);
      const decreeTitle = String(d.titleSummary ?? d.decreeNumber ?? 'Untitled decree');
      const categoryIds = Array.isArray(d.categoryIds) ? d.categoryIds : [];
      for (const rawCid of categoryIds) {
        const cid = String(rawCid);
        const cat = byId.get(cid);
        if (!cat) continue;
        const versionId = d.currentPublishedVersionId ? String(d.currentPublishedVersionId) : '';
        if (!versionId) continue;
        if (!cat.decrees.some((x) => x.id === decreeId)) {
          cat.decrees.push({ id: decreeId, title: decreeTitle, decreeVersionId: versionId });
        }
      }
    }

    for (const c of categories) {
      c.decrees.sort((a, b) => a.title.localeCompare(b.title));
    }
    return categories;
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').createTemplateBodySchema>} body
   */
  async createTemplate(body) {
    const created = await this.templates.create({
      name: body.name,
      description: body.description ?? null,
      location: body.location ?? body.inspectionLocation ?? null,
      isActive: body.isActive ?? true,
      sections: body.sections ?? [],
      revision: 1,
    });
    return serializeInspectionTemplate(created);
  }

  /**
   * @param {string} id
   */
  async getTemplateById(id) {
    const row = await this.templates.findByIdLean(id);
    if (!row) throw new NotFoundError('Template not found');
    return serializeInspectionTemplate(row);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').patchTemplateBodySchema>} body
   */
  async patchTemplate(id, body) {
    const existing = await this.templates.findByIdLean(id);
    if (!existing) throw new NotFoundError('Template not found');

    /** @type {Record<string, unknown>} */
    const $set = {};
    if (body.name !== undefined) $set.name = body.name;
    if (body.description !== undefined) $set.description = body.description;
    if (body.location !== undefined) $set.location = body.location;
    if (body.inspectionLocation !== undefined) $set.location = body.inspectionLocation;
    if (body.isActive !== undefined) $set.isActive = body.isActive;
    if (body.sections !== undefined) {
      $set.sections = body.sections;
      if (templateSectionsChanged(existing.sections, body.sections)) {
        $set.revision = (existing.revision ?? 1) + 1;
      }
    }

    const updated = await this.templates.updateByIdLean(id, $set);
    return serializeInspectionTemplate(updated);
  }

  /**
   * @param {string} id
   */
  async deleteTemplate(id) {
    const existing = await this.templates.findByIdLean(id);
    if (!existing) throw new NotFoundError('Template not found');
    await this.templates.softDeleteByIdLean(id);
    return { id, deleted: true };
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').listAssignmentsQuerySchema>} query
   */
  async listAssignments(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.assignments.findPage({
      skip,
      limit,
      status: query.status,
      inspectorUserId: query.inspectorUserId,
      templateId: query.templateId,
      decreeId: query.decreeId,
      region: query.region,
      search: query.search,
      sort: query.sort,
      from: query.from,
      to: query.to,
    });
    const decorated = await this.decorateAssignmentsForWorkspace(items);
    return {
      items: decorated,
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {Array<Record<string, unknown>>} items
   */
  async decorateAssignmentsForWorkspace(items) {
    const now = new Date();
    const decreeIds = [...new Set(items.map((r) => String(r.decreeId)).filter(Boolean))];
    const inspectorIds = [...new Set(items.map((r) => String(r.inspectorUserId)).filter(Boolean))];
    const [decrees, inspectors] = await Promise.all([
      decreeIds.length ? this.decrees.findByIdsLean(decreeIds) : Promise.resolve([]),
      inspectorIds.length ? this.users.findByIdsLean(inspectorIds) : Promise.resolve([]),
    ]);
    const decreeTitleById = new Map(
      decrees.map((d) => [String(d._id), String(d.titleSummary ?? d.decreeNumber ?? '—')]),
    );
    const inspectorNameById = new Map(inspectors.map((u) => [String(u._id), String(u.displayName ?? '—')]));

    return items.map((row) => {
      const base = serializeInspectionAssignment(row);
      const due = row.dueAt ? new Date(row.dueAt) : null;
      const deadlineYmd = due ? due.toISOString().slice(0, 10) : '';
      const createdAt = row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString();
      const createdYmd = createdAt.slice(0, 10);
      const initialInspectionWindowDays =
        deadlineYmd && /^\d{4}-\d{2}-\d{2}$/.test(deadlineYmd)
          ? calendarInspectionWindowDays(createdYmd, deadlineYmd)
          : 1;
      return {
        ...base,
        decreeTitle: decreeTitleById.get(String(row.decreeId)) ?? '—',
        inspectorName: inspectorNameById.get(String(row.inspectorUserId)) ?? '—',
        inspectorId: String(row.inspectorUserId ?? ''),
        templateId: String(row.templateId ?? ''),
        deadline: deadlineYmd,
        createdAt,
        initialInspectionWindowDays,
        priority: priorityToUi(String(row.priority ?? 'normal')),
        status: assignmentUiStatus(row, now),
        notes: String(row.notes ?? ''),
      };
    });
  }

  /**
   * @param {Array<Record<string, unknown>>} items
   */
  async decorateSubmissionsForWorkspace(items) {
    const assignmentIds = [...new Set(items.map((s) => String(s.assignmentId)).filter(Boolean))];
    const assignments = assignmentIds.length
      ? await InspectionAssignmentModel.find({
          _id: { $in: assignmentIds.map((id) => new mongoose.Types.ObjectId(id)) },
          isDeleted: { $ne: true },
        }).lean()
      : [];
    const aById = new Map(assignments.map((a) => [String(a._id), a]));
    const templateIds = [...new Set(assignments.map((a) => String(a.templateId)).filter(Boolean))];
    const decreeIds = [...new Set(assignments.map((a) => String(a.decreeId)).filter(Boolean))];
    const inspectorIds = [...new Set(assignments.map((a) => String(a.inspectorUserId)).filter(Boolean))];
    const [decrees, inspectors, templates] = await Promise.all([
      decreeIds.length ? this.decrees.findByIdsLean(decreeIds) : Promise.resolve([]),
      inspectorIds.length ? this.users.findByIdsLean(inspectorIds) : Promise.resolve([]),
      templateIds.length
        ? InspectionTemplateModel.find({
            _id: { $in: templateIds.map((id) => new mongoose.Types.ObjectId(id)) },
            isDeleted: { $ne: true },
          }).lean()
        : Promise.resolve([]),
    ]);
    const decreeTitleById = new Map(
      decrees.map((d) => [String(d._id), String(d.titleSummary ?? d.decreeNumber ?? '—')]),
    );
    const inspectorNameById = new Map(inspectors.map((u) => [String(u._id), String(u.displayName ?? '—')]));
    const templateById = new Map(templates.map((t) => [String(t._id), t]));

    /** @type {Map<string, string[]>} */
    const evidenceUrlsByAssignment = new Map();
    await Promise.all(
      assignmentIds.map(async (aid) => {
        const rows = await inspectionEvidenceFileRepository.listByAssignmentLean(aid);
        const urls = [];
        for (const ev of rows) {
          const fid = ev.fileId ? String(ev.fileId) : '';
          if (!fid) continue;
          try {
            const u = await resolveStoredFileUrl(fid, { ttlSeconds: 3600 });
            if (typeof u === 'string' && u) urls.push(u);
          } catch {
            /* ignore */
          }
        }
        evidenceUrlsByAssignment.set(aid, urls);
      }),
    );

    return items.map((row) => {
      const base = serializeInspectionSubmission(row);
      const a = aById.get(String(row.assignmentId));
      const tpl = a ? templateById.get(String(a.templateId)) : null;
      const decreeTitle = a ? decreeTitleById.get(String(a.decreeId)) ?? '—' : '—';
      const inspectorName = a ? inspectorNameById.get(String(a.inspectorUserId)) ?? '—' : '—';
      const region = a ? String(a.region ?? '') : '';
      const review = row.review && typeof row.review === 'object' ? row.review : {};
      const autoScore = typeof row.autoScore === 'number' && Number.isFinite(row.autoScore) ? row.autoScore : null;
      const score = typeof review.score === 'number' ? review.score : typeof autoScore === 'number' ? autoScore : 0;
      const submittedAt = row.submittedAt ? new Date(row.submittedAt).toISOString() : '';
      const date = submittedAt.slice(0, 10);
      const status = submissionUiStatus(row, a);
      const revisionFocusNotes =
        a && String(a.status) === InspectionAssignmentStatus.RETURNED_FOR_REVISION
          ? String(a.returnReason ?? '')
          : undefined;

      /**
       * Normalize signature:
       * - Some clients send a full data URI `data:image/png;base64,...`
       * - Some send raw base64 (no prefix)
       * - Some legacy clients may send a remote URL
       * - Some signature pad libs can output JSON strokes (not renderable as <Image uri>)
       */
      let signature;
      for (const ans of /** @type {Array<Record<string, unknown>>} */ (row.answers ?? [])) {
        const key = String(ans.itemKey ?? '').toLowerCase();
        const vt = ans.valueText != null ? String(ans.valueText) : '';
        if (!vt) continue;
        const trimmed = vt.trim();
        if (!trimmed) continue;
        const looksLikeJson = /^[\[{]/.test(trimmed);
        const looksLikeUrl = /^https?:\/\//i.test(trimmed);
        const looksLikeDataUri = /^data:image\/[a-zA-Z+.-]+;base64,/i.test(trimmed);
        const looksLikeRawBase64 =
          !looksLikeJson &&
          !looksLikeUrl &&
          !looksLikeDataUri &&
          trimmed.length > 80 &&
          /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed);
        if (key.includes('signature') || looksLikeUrl || looksLikeDataUri || looksLikeRawBase64) {
          signature = looksLikeRawBase64 ? `data:image/png;base64,${trimmed}` : trimmed;
          break;
        }
      }

      const aid = String(row.assignmentId);
      const evidence = evidenceUrlsByAssignment.get(aid) ?? [];
      const selectionMode =
        tpl && typeof tpl.description === 'string' && tpl.description.includes('"decreeSelectionMode":"category"')
          ? 'category'
          : 'decrees';
      const categoryDecreeLabel =
        selectionMode === 'category'
          ? `Category (Whole): ${decreeTitle}`
          : `Category + Decree: ${decreeTitle}`;

      const templateItems = [];
      for (const sec of /** @type {Array<Record<string, unknown>>} */ (tpl?.sections ?? [])) {
        for (const it of /** @type {Array<Record<string, unknown>>} */ (sec.items ?? [])) {
          templateItems.push({
            itemKey: String(it.itemKey ?? ''),
            label: String(it.label ?? it.itemKey ?? 'Field'),
            type: String(it.type ?? 'text'),
          });
        }
      }
      const itemMetaByKey = new Map(templateItems.map((x) => [x.itemKey, x]));
      const answerDetails = /** @type {Array<Record<string, unknown>>} */ (row.answers ?? []).map((ans) => {
        const key = String(ans.itemKey ?? '');
        const meta = itemMetaByKey.get(key);
        return {
          itemKey: key,
          label: meta?.label ?? key,
          type: meta?.type ?? 'text',
          valueText: ans.valueText ?? null,
          valueNumber: ans.valueNumber ?? null,
          valueBoolean: ans.valueBoolean ?? null,
          valueDate: ans.valueDate ?? null,
          selectedOptionKeys: Array.isArray(ans.selectedOptionKeys) ? ans.selectedOptionKeys : [],
          evidenceFileIds: Array.isArray(ans.evidenceFileIds) ? ans.evidenceFileIds : [],
        };
      });

      return {
        ...base,
        title: `${decreeTitle} — inspection`,
        categoryDecreeLabel,
        inspector: inspectorName,
        region,
        date,
        status,
        score,
        answers: answersArrayToRecord(/** @type {Array<Record<string, unknown>>} */ (row.answers)),
        answerDetails,
        evidence,
        signature,
        revisionFocusNotes,
      };
    });
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').createAssignmentBodySchema>} body
   */
  async createAssignment(body) {
    const templateId = body.formId ?? body.templateId;
    const template = await this.templates.findByIdLean(String(templateId));
    if (!template) throw new NotFoundError('Template not found');

    const inspectorIds =
      Array.isArray(body.inspectorIds) && body.inspectorIds.length
        ? body.inspectorIds
        : body.inspectorUserId
          ? [body.inspectorUserId]
          : [];

    const decreeVersion = await DecreeVersionModel.findOne({
      _id: new mongoose.Types.ObjectId(body.decreeVersionId),
      isDeleted: { $ne: true },
    }).lean();
    if (!decreeVersion) throw new NotFoundError('Decree version not found');
    if (String(decreeVersion.decreeId) !== String(body.decreeId)) {
      throw new BadRequestError('decreeVersionId does not belong to the provided decreeId');
    }

    const dueAt = normalizeOptionalDate(body.dueAt ?? body.deadline);
    const notes = body.instructions ?? body.notes ?? null;
    const location = body.location ?? template.location ?? null;

    /** @type {Record<string, unknown>[]} */
    const createdRows = [];
    for (const iid of inspectorIds) {
      const inspector = await this.users.findByIdLean(String(iid));
      if (!inspector) throw new NotFoundError('Inspector user not found');
      if (inspector.roleKey !== RoleKey.INSPECTOR) {
        throw new BadRequestError('Assignments can only be targeted to users with the inspector roleKey');
      }

      const created = await this.assignments.create({
        templateId: new mongoose.Types.ObjectId(String(templateId)),
        templateRevisionSnapshot: template.revision ?? 1,
        decreeId: new mongoose.Types.ObjectId(body.decreeId),
        decreeVersionId: new mongoose.Types.ObjectId(body.decreeVersionId),
        inspectorUserId: new mongoose.Types.ObjectId(String(iid)),
        assignedByUserId: body.assignedByUserId ? new mongoose.Types.ObjectId(body.assignedByUserId) : null,
        status: InspectionAssignmentStatus.ASSIGNED,
        priority: body.priority ?? 'normal',
        dueAt: dueAt ?? null,
        notes,
        region: body.region ?? null,
        location,
      });
      createdRows.push(created);

      const dueLabel = dueAt ? new Date(dueAt).toISOString().slice(0, 10) : 'TBD';
      await NotificationModel.create({
        title: 'Inspection assigned',
        body: notes
          ? `You have a new inspection assignment (due ${dueLabel}). ${String(notes).slice(0, 200)}`
          : `You have a new inspection assignment (due ${dueLabel}).`,
        recipientUserId: inspector._id,
        recipientRoleKey: RoleKey.INSPECTOR,
        metadata: {
          kind: 'inspection_assigned',
          assignmentId: String(created._id),
          templateId: String(templateId),
          decreeId: String(body.decreeId),
          location: location ? String(location) : undefined,
        },
      });
    }

    const decorated = await this.decorateAssignmentsForWorkspace(createdRows);
    return decorated.length === 1 ? decorated[0] : { assignments: decorated };
  }

  /**
   * @param {string} id
   */
  async getAssignmentById(id) {
    const row = await this.assignments.findByIdLean(id);
    if (!row) throw new NotFoundError('Assignment not found');
    const [decorated] = await this.decorateAssignmentsForWorkspace([row]);
    return decorated;
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').patchAssignmentBodySchema>} body
   */
  async patchAssignment(id, body) {
    const existing = await this.assignments.findByIdLean(id);
    if (!existing) throw new NotFoundError('Assignment not found');
    if (existing.status === InspectionAssignmentStatus.FINALIZED) {
      throw new ConflictError('Finalized assignments cannot be updated');
    }

    /** @type {Record<string, unknown>} */
    const $set = {};
    if (body.priority !== undefined) $set.priority = body.priority;
    if (body.notes !== undefined) $set.notes = body.notes;
    if (body.location !== undefined) $set.location = body.location;
    if (body.region !== undefined) $set.region = body.region;
    if (body.inspectorUserId !== undefined) {
      const inspector = await this.users.findByIdLean(body.inspectorUserId);
      if (!inspector) throw new NotFoundError('Inspector user not found');
      if (inspector.roleKey !== RoleKey.INSPECTOR) {
        throw new BadRequestError('Assignments can only be reassigned to users with the inspector roleKey');
      }
      $set.inspectorUserId = new mongoose.Types.ObjectId(body.inspectorUserId);
    }
    if (body.dueAt !== undefined) {
      $set.dueAt = normalizeOptionalDate(body.dueAt);
    }

    const updated = await this.assignments.updateByIdLean(id, $set);
    const [decorated] = await this.decorateAssignmentsForWorkspace([updated]);
    return decorated;
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').listSubmissionsQuerySchema>} query
   */
  async listSubmissions(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.submissions.findPageForAdmin({
      skip,
      limit,
      assignmentId: query.assignmentId,
      assignmentStatus: query.assignmentStatus,
      submissionKind: query.submissionKind,
      sort: query.sort,
      from: query.from,
      to: query.to,
    });
    const decorated = await this.decorateSubmissionsForWorkspace(items);
    return {
      items: decorated,
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {string} id
   */
  async getSubmissionById(id) {
    const row = await this.submissions.findByIdLean(id);
    if (!row) throw new NotFoundError('Submission not found');
    const assignment = await this.assignments.findByIdLean(String(row.assignmentId));
    const base = serializeInspectionSubmission(row, { assignment });
    const [workspace] = await this.decorateSubmissionsForWorkspace([row]);
    return { ...base, ...workspace };
  }

  /**
   * @param {string} submissionId
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').returnSubmissionBodySchema>} body
   */
  async returnSubmission(submissionId, body) {
    const submission = await this.submissions.findByIdLean(submissionId);
    if (!submission) throw new NotFoundError('Submission not found');

    const wfInput = {
      assignmentId: String(submission.assignmentId),
      submissionId,
      notes: body.notes,
      reviewerUserId: body.reviewerUserId ?? null,
      score: body.score ?? null,
    };
    if (body.extendDueAt !== undefined) {
      Object.assign(wfInput, { extendDueAt: normalizeOptionalDate(body.extendDueAt) });
    }

    const { assignment, submission: updatedSubmission } =
      await inspectionSubmissionReviewWorkflow.returnForRevision(wfInput);

    const [assignmentDecorated] = await this.decorateAssignmentsForWorkspace([assignment]);
    const [submissionDecorated] = await this.decorateSubmissionsForWorkspace([updatedSubmission]);

    return {
      assignment: assignmentDecorated,
      submission: submissionDecorated,
    };
  }

  /**
   * @param {string} submissionId
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').finalizeSubmissionBodySchema>} body
   */
  async finalizeSubmission(submissionId, body) {
    const submission = await this.submissions.findByIdLean(submissionId);
    if (!submission) throw new NotFoundError('Submission not found');

    const { assignment, submission: updatedSubmission } = await inspectionSubmissionReviewWorkflow.finalize({
      assignmentId: String(submission.assignmentId),
      submissionId,
      reviewerUserId: body.reviewerUserId ?? null,
      score: body.score ?? null,
      comment: body.comment ?? null,
    });

    const [assignmentDecorated] = await this.decorateAssignmentsForWorkspace([assignment]);
    const [submissionDecorated] = await this.decorateSubmissionsForWorkspace([updatedSubmission]);

    return {
      assignment: assignmentDecorated,
      submission: submissionDecorated,
    };
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').listExamsQuerySchema>} query
   */
  async listExams(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.exams.findPage({
      skip,
      limit,
      search: query.search,
      status: query.status,
      sort: query.sort,
      from: query.from,
      to: query.to,
      decreeCategoryId: query.decreeCategoryId,
    });
    return {
      items: items.map((r) => {
        const x = serializeExam(r);
        const st = String(r.status ?? '');
        const catalogStatus =
          st === ExamLifecycle.DRAFT ? 'draft' : st === ExamLifecycle.CLOSED ? 'archived' : 'published';
        return {
          ...x,
          catalogStatus,
          decree: r.decreeCategoryName != null ? String(r.decreeCategoryName) : '',
          timeLimit: r.timeLimitMinutes ?? null,
          passCriteria: r.passingScore ?? null,
          questions: [],
        };
      }),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').createExamBodySchema>} body
   */
  async createExam(body) {
    let decreeCategoryId = body.decreeCategoryId ? new mongoose.Types.ObjectId(body.decreeCategoryId) : null;
    let decreeCategoryName = body.decreeCategoryName != null ? String(body.decreeCategoryName).trim() : null;
    if (decreeCategoryId) {
      const cat = await this.decreeCategories.findByIdLean(String(decreeCategoryId));
      if (!cat) throw new BadRequestError('Decree category not found');
      decreeCategoryName = String(cat.name ?? '').trim() || decreeCategoryName;
    } else if (decreeCategoryName) {
      /* keep name-only for legacy clients */
    } else {
      decreeCategoryId = null;
    }

    const fromCatalog = body.catalogStatus ? catalogStatusToLifecycle(body.catalogStatus) : null;
    const initialStatus = fromCatalog ?? ExamLifecycle.DRAFT;
    const now = new Date();
    const created = await this.exams.create({
      title: body.title,
      description: body.description ?? null,
      decreeCategoryId,
      decreeCategoryName,
      status: initialStatus,
      /** Public mobile exams are the only use case; audience is not configurable. */
      audienceRoleKeys: ['public_user'],
      /** Availability starts when the exam is published; optional close only (no scheduled open). */
      scheduledOpensAt: null,
      scheduledClosesAt: normalizeOptionalDate(body.scheduledClosesAt) ?? null,
      passingScore: body.passingScore ?? null,
      maxScore: body.maxScore ?? null,
      timeLimitMinutes: body.timeLimitMinutes ?? null,
      randomizeQuestions: body.randomizeQuestions ?? false,
      randomizeOptions: body.randomizeOptions ?? false,
      publishedAt:
        initialStatus === ExamLifecycle.OPEN || initialStatus === ExamLifecycle.PUBLISHED ? now : null,
      createdByUserId: body.createdByUserId ? new mongoose.Types.ObjectId(body.createdByUserId) : null,
    });
    const x = serializeExam(created);
    const st = String(created.status ?? '');
    const catalogStatus =
      st === ExamLifecycle.DRAFT ? 'draft' : st === ExamLifecycle.CLOSED ? 'archived' : 'published';
    return {
      ...x,
      catalogStatus,
      decree: created.decreeCategoryName != null ? String(created.decreeCategoryName) : '',
      timeLimit: created.timeLimitMinutes ?? null,
      passCriteria: created.passingScore ?? null,
      questions: [],
    };
  }

  /**
   * @param {string} id
   */
  async getExamById(id) {
    const row = await this.exams.findByIdLean(id);
    if (!row) throw new NotFoundError('Exam not found');
    const x = serializeExam(row);
    const st = String(row.status ?? '');
    const catalogStatus =
      st === ExamLifecycle.DRAFT ? 'draft' : st === ExamLifecycle.CLOSED ? 'archived' : 'published';
    const qRows = await this.examQuestions.listByExamIdLean(id, { activeOnly: false });
    return {
      ...x,
      catalogStatus,
      decree: row.decreeCategoryName != null ? String(row.decreeCategoryName) : '',
      timeLimit: row.timeLimitMinutes ?? null,
      passCriteria: row.passingScore ?? null,
      questions: qRows.map((q) => String(q._id)),
    };
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').patchExamBodySchema>} body
   */
  async patchExam(id, body) {
    const existing = await this.exams.findByIdLean(id);
    if (!existing) throw new NotFoundError('Exam not found');

    let nextStatus = body.status;
    if (body.catalogStatus) {
      const mapped = catalogStatusToLifecycle(body.catalogStatus);
      if (mapped) nextStatus = mapped;
    }

    if (nextStatus !== undefined) {
      assertExamAdminLifecycleTransition({ fromStatus: String(existing.status), toStatus: nextStatus });
    }

    /** @type {Record<string, unknown>} */
    const $set = {};
    if (body.title !== undefined) $set.title = body.title;
    if (body.description !== undefined) $set.description = body.description;
    if (nextStatus !== undefined) $set.status = nextStatus;
    /** Always public-user audience for catalog eligibility. */
    $set.audienceRoleKeys = ['public_user'];
    /** Public availability is immediate when published; optional `scheduledClosesAt` only. */
    $set.scheduledOpensAt = null;
    if (body.scheduledClosesAt !== undefined) $set.scheduledClosesAt = normalizeOptionalDate(body.scheduledClosesAt);
    if (body.passingScore !== undefined) $set.passingScore = body.passingScore;
    if (body.maxScore !== undefined) $set.maxScore = body.maxScore;
    if (body.timeLimitMinutes !== undefined) $set.timeLimitMinutes = body.timeLimitMinutes;
    if (body.randomizeQuestions !== undefined) $set.randomizeQuestions = body.randomizeQuestions;
    if (body.randomizeOptions !== undefined) $set.randomizeOptions = body.randomizeOptions;
    if (body.updatedByUserId !== undefined) {
      $set.updatedByUserId = body.updatedByUserId ? new mongoose.Types.ObjectId(body.updatedByUserId) : null;
    }

    if (body.decreeCategoryId !== undefined) {
      if (body.decreeCategoryId) {
        const cat = await this.decreeCategories.findByIdLean(String(body.decreeCategoryId));
        if (!cat) throw new BadRequestError('Decree category not found');
        $set.decreeCategoryId = new mongoose.Types.ObjectId(String(body.decreeCategoryId));
        if (body.decreeCategoryName === undefined) {
          $set.decreeCategoryName = String(cat.name ?? '').trim() || null;
        }
      } else {
        $set.decreeCategoryId = null;
        $set.decreeCategoryName = null;
      }
    }
    if (body.decreeCategoryName !== undefined && body.decreeCategoryId === undefined) {
      $set.decreeCategoryName = body.decreeCategoryName;
    }

    if ((nextStatus === ExamLifecycle.OPEN || nextStatus === ExamLifecycle.PUBLISHED) && !existing.publishedAt) {
      $set.publishedAt = new Date();
    }

    const updated = await this.exams.updateByIdLean(id, $set);
    if (!updated) throw new NotFoundError('Exam not found');
    if (body.maxScore !== undefined) {
      await this.redistributeEqualPointsForExam(id);
    }
    return this.getExamById(id);
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').listCertificatesQuerySchema>} query
   */
  async listCertificates(query) {
    const { skip, limit } = toOffsetLimit(query);

    /** @type {string | undefined} */
    let resolvedHolderId = query.holderUserId;
    /** @type {Set<string> | null} */
    let holderIdAllowlist = null;

    // Free-text holder filter: when the caller passes `holderName`, resolve to a
    // shortlist of matching user ids (case-insensitive partial match on
    // displayName / email). Combine with `holderUserId` if both are present.
    if (typeof query.holderName === 'string' && query.holderName.trim()) {
      const matches = await this.users.findByDisplayNameSearch?.(query.holderName.trim(), 200);
      const ids = Array.isArray(matches) ? matches.map((u) => String(u._id)) : [];
      holderIdAllowlist = new Set(ids);
      if (resolvedHolderId && !holderIdAllowlist.has(resolvedHolderId)) {
        return { items: [], page: query.page, limit: query.limit, total: 0 };
      }
      if (!resolvedHolderId && ids.length === 1) {
        resolvedHolderId = ids[0];
      }
    }

    const baseFilter = {
      skip,
      limit,
      status: query.status,
      holderUserId: resolvedHolderId,
      search: query.search,
      sort: query.sort,
      from: query.from,
      to: query.to,
    };

    let items;
    let total;
    if (holderIdAllowlist && !resolvedHolderId) {
      const allIds = [...holderIdAllowlist];
      if (allIds.length === 0) {
        return { items: [], page: query.page, limit: query.limit, total: 0 };
      }
      const big = await this.certificates.findPage({
        ...baseFilter,
        skip: 0,
        limit: 5000,
      });
      const filtered = big.items.filter((c) => holderIdAllowlist.has(String(c.holderUserId)));
      total = filtered.length;
      items = filtered.slice(skip, skip + limit);
    } else {
      const page = await this.certificates.findPage(baseFilter);
      items = page.items;
      total = page.total;
    }

    const holderIds = [...new Set(items.map((r) => String(r.holderUserId)).filter(Boolean))];
    const holders = holderIds.length ? await this.users.findByIdsLean(holderIds) : [];
    const holderNameById = new Map(holders.map((u) => [String(u._id), String(u.displayName ?? '—')]));
    const holderEmailById = new Map(holders.map((u) => [String(u._id), String(u.email ?? '')]));

    return {
      items: items.map((r) => {
        const base = serializeCertificate(r);
        const meta = r.metadata && typeof r.metadata === 'object' ? r.metadata : {};
        const holderName = holderNameById.get(String(r.holderUserId)) ?? '—';
        const holderEmail = holderEmailById.get(String(r.holderUserId)) ?? '';
        const issueYmd = r.issuedAt ? new Date(r.issuedAt).toISOString().slice(0, 10) : '';
        const expiryYmd =
          typeof meta.validToYmd === 'string'
            ? meta.validToYmd
            : typeof meta.validTo === 'string'
              ? meta.validTo.slice(0, 10)
              : meta.validTo && typeof meta.validTo === 'object' && 'toISOString' in meta.validTo
                ? /** @type {Date} */ (meta.validTo).toISOString().slice(0, 10)
                : '';
        const scoreCandidate =
          typeof meta.score === 'number'
            ? meta.score
            : typeof meta.scorePct === 'number'
              ? meta.scorePct
              : typeof meta.passPct === 'number'
                ? meta.passPct
                : null;
        return {
          ...base,
          holderDisplayName: holderName,
          recipientName: holderName,
          holderEmail,
          category:
            typeof meta.category === 'string' && meta.category
              ? meta.category
              : kindToCategoryLabel(String(r.kind ?? '')),
          kind: String(r.kind ?? ''),
          issueDate: issueYmd,
          expiryDate: expiryYmd,
          score: typeof scoreCandidate === 'number' ? Math.round(scoreCandidate) : null,
          revokeReason: r.revokeReason ?? null,
          revokedAt: r.revokedAt ? new Date(r.revokedAt).toISOString() : null,
          status: r.status === CertificateStatus.ISSUED ? 'active' : 'revoked',
        };
      }),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').revokeCertificateBodySchema>} body
   */
  async revokeCertificate(id, body) {
    const existing = await this.certificates.findByIdLean(id);
    if (!existing) throw new NotFoundError('Certificate not found');
    if (existing.status !== CertificateStatus.ISSUED) {
      throw new ConflictError('Only issued certificates can be revoked');
    }

    const updated = await this.certificates.updateByIdLean(id, {
      status: CertificateStatus.REVOKED,
      revokedAt: new Date(),
      revokeReason: body.reason,
      revokedByUserId: body.revokedByUserId ? new mongoose.Types.ObjectId(body.revokedByUserId) : null,
    });

    return serializeCertificate(updated);
  }

  async getDashboard() {
    const since = new Date();
    since.setDate(since.getDate() - 56);

    const start7 = new Date();
    start7.setUTCDate(start7.getUTCDate() - 6);
    start7.setUTCHours(0, 0, 0, 0);

    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

    const [
      assignmentBreakdown,
      pendingReviewCount,
      examBreakdown,
      certificateBreakdown,
      implementationTrends,
      submissionsByDay,
      assignmentsByDay,
      finalizedByMonth,
      scoreAgg,
    ] = await Promise.all([
      this.assignments.countByStatusGrouped({}),
      InspectionAssignmentModel.countDocuments({
        isDeleted: { $ne: true },
        status: InspectionAssignmentStatus.SUBMITTED,
      }),
      ExamModel.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      CertificateModel.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      InspectionAssignmentModel.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            status: InspectionAssignmentStatus.FINALIZED,
            finalizedAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              y: { $isoWeekYear: '$finalizedAt' },
              w: { $isoWeek: '$finalizedAt' },
            },
            finalizedCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.w': 1 } },
      ]),
      InspectionSubmissionModel.aggregate([
        { $match: { isDeleted: { $ne: true }, updatedAt: { $gte: start7 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt', timezone: 'UTC' } },
            total: { $sum: 1 },
          },
        },
      ]),
      InspectionAssignmentModel.aggregate([
        { $match: { isDeleted: { $ne: true }, createdAt: { $gte: start7 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            total: { $sum: 1 },
          },
        },
      ]),
      InspectionAssignmentModel.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            status: InspectionAssignmentStatus.FINALIZED,
            finalizedAt: { $gte: yearStart },
          },
        },
        { $group: { _id: { $month: '$finalizedAt' }, total: { $sum: 1 } } },
      ]),
      InspectionSubmissionModel.aggregate([
        {
          $match: {
            isDeleted: { $ne: true },
            $or: [{ 'review.score': { $type: 'number' } }, { autoScore: { $type: 'number' } }],
          },
        },
        {
          $project: {
            effectiveScore: { $ifNull: ['$review.score', '$autoScore'] },
          },
        },
        { $match: { effectiveScore: { $type: 'number' } } },
        { $group: { _id: null, avg: { $avg: '$effectiveScore' } } },
      ]),
    ]);

    const subMap = new Map(submissionsByDay.map((r) => [String(r._id), r.total]));
    const asMap = new Map(assignmentsByDay.map((r) => [String(r._id), r.total]));
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activityLast7Days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const count = (subMap.get(key) ?? 0) + (asMap.get(key) ?? 0);
      activityLast7Days.push({
        day: dayNames[d.getUTCDay()],
        date: key,
        count,
        chartVal: count * 14 + 6,
      });
    }

    const monthTo = new Map(finalizedByMonth.map((r) => [r._id, r.total]));
    const qSum = (months) => months.reduce((s, m) => s + (monthTo.get(m) ?? 0), 0);
    const quarterlyFinalized = [
      { quarterKey: 'Q1', finalizedCount: qSum([1, 2, 3]) },
      { quarterKey: 'Q2', finalizedCount: qSum([4, 5, 6]) },
      { quarterKey: 'Q3', finalizedCount: qSum([7, 8, 9]) },
      { quarterKey: 'Q4', finalizedCount: qSum([10, 11, 12]) },
    ].map((row) => ({
      ...row,
      implementationPct: Math.min(100, Math.round(18 + row.finalizedCount * 4)),
    }));

    const avgSubmissionScorePct =
      scoreAgg[0] && typeof scoreAgg[0].avg === 'number' && Number.isFinite(scoreAgg[0].avg)
        ? `${Math.round(scoreAgg[0].avg)}%`
        : '0%';

    return {
      generatedAt: new Date().toISOString(),
      assignments: {
        byStatus: Object.fromEntries(assignmentBreakdown.map((r) => [r.status, r.total])),
        pendingReviewCount,
      },
      exams: {
        byStatus: Object.fromEntries(examBreakdown.map((r) => [String(r._id), r.total])),
      },
      certificates: {
        byStatus: Object.fromEntries(certificateBreakdown.map((r) => [String(r._id), r.total])),
      },
      implementationTrends: implementationTrends.map((r) => ({
        isoWeekYear: r._id.y,
        isoWeek: r._id.w,
        finalizedCount: r.finalizedCount,
      })),
      activityLast7Days,
      quarterlyFinalized,
      avgSubmissionScorePct,
    };
  }

  /**
   * @param {string} examId
   */
  async assertExamForAdmin(examId) {
    const ex = await this.exams.findByIdLean(examId);
    if (!ex) throw new NotFoundError('Exam not found');
    return ex;
  }

  /**
   * Assign whole-number `points` on each active exam question so their sum equals
   * the exam `maxScore` when set (else previous total, else one point per question).
   * @param {string} examId
   */
  async redistributeEqualPointsForExam(examId) {
    const exam = await this.exams.findByIdLean(examId);
    if (!exam) return;
    const questions = await this.examQuestions.listByExamIdLean(examId, { activeOnly: true });
    const n = questions.length;
    if (n === 0) return;
    let total =
      typeof exam.maxScore === 'number' && !Number.isNaN(exam.maxScore) && exam.maxScore > 0
        ? Math.round(exam.maxScore)
        : questions.reduce((s, q) => s + (typeof q.points === 'number' ? q.points : 0), 0);
    if (total <= 0) total = n;
    const parts = splitTotalAcrossQuestionCount(total, n);
    const sorted = [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (let i = 0; i < n; i++) {
      const pts = parts[i] ?? 0;
      const q = sorted[i];
      const id = String(q._id);
      if ((q.points ?? 0) !== pts) {
        await this.examQuestions.updateByIdLean(id, { points: pts });
      }
    }
  }

  /**
   * Keep `Exam.questionsCount` aligned with active `ExamQuestion` rows (public list, admin UI).
   * @param {string} examId
   */
  async syncExamQuestionsCount(examId) {
    const n = await this.examQuestions.countActiveForExam(examId);
    await this.exams.updateByIdLean(examId, { questionsCount: n });
  }

  /**
   * @param {string} examId
   */
  async listExamQuestions(examId) {
    await this.assertExamForAdmin(examId);
    const rows = await this.examQuestions.listByExamIdLean(examId, { activeOnly: false });
    return { items: rows.map((r) => serializeExamQuestionAdmin(r)) };
  }

  /**
   * @param {string} examId
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').createExamQuestionBodySchema>} body
   */
  async createExamQuestion(examId, body) {
    await this.assertExamForAdmin(examId);
    if (body.type === ExamQuestionType.MULTIPLE_CHOICE && !(body.options && body.options.length > 0)) {
      throw new BadRequestError('Multiple choice questions require at least one option');
    }
    if (body.type === ExamQuestionType.TRUE_FALSE && body.correctBoolean === undefined) {
      throw new BadRequestError('True/false questions require correctBoolean');
    }
    const order = body.order ?? (await this.examQuestions.maxOrderForExam(examId)) + 1;
    const created = await this.examQuestions.create({
      examId: new mongoose.Types.ObjectId(examId),
      order,
      type: body.type,
      stem: body.stem,
      explanation: body.explanation ?? null,
      options: body.options,
      correctOptionKeys: body.correctOptionKeys,
      correctBoolean: body.correctBoolean ?? null,
      correctTextNormalized: body.correctTextNormalized ?? null,
      points: body.points ?? 1,
      isActive: body.isActive !== false,
      createdByUserId: body.createdByUserId ? new mongoose.Types.ObjectId(body.createdByUserId) : null,
    });
    await this.redistributeEqualPointsForExam(examId);
    await this.syncExamQuestionsCount(examId);
    return serializeExamQuestionAdmin(created);
  }

  /**
   * @param {string} examId
   * @param {string} questionId
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').patchExamQuestionBodySchema>} body
   */
  async patchExamQuestion(examId, questionId, body) {
    await this.assertExamForAdmin(examId);
    const existing = await this.examQuestions.findByIdLean(questionId);
    if (!existing || String(existing.examId) !== String(examId)) {
      throw new NotFoundError('Question not found');
    }
    /** @type {Record<string, unknown>} */
    const $set = {};
    if (body.type !== undefined) $set.type = body.type;
    if (body.stem !== undefined) $set.stem = body.stem;
    if (body.explanation !== undefined) $set.explanation = body.explanation;
    if (body.options !== undefined) $set.options = body.options;
    if (body.correctOptionKeys !== undefined) $set.correctOptionKeys = body.correctOptionKeys;
    if (body.correctBoolean !== undefined) $set.correctBoolean = body.correctBoolean;
    if (body.correctTextNormalized !== undefined) $set.correctTextNormalized = body.correctTextNormalized;
    if (body.points !== undefined) $set.points = body.points;
    if (body.isActive !== undefined) $set.isActive = body.isActive;
    if (body.order !== undefined) $set.order = body.order;
    if (body.updatedByUserId !== undefined) {
      $set.updatedByUserId = body.updatedByUserId ? new mongoose.Types.ObjectId(body.updatedByUserId) : null;
    }
    const updated = await this.examQuestions.updateByIdLean(questionId, $set);
    await this.syncExamQuestionsCount(examId);
    return serializeExamQuestionAdmin(updated);
  }

  /**
   * @param {string} examId
   * @param {string} questionId
   */
  async deleteExamQuestion(examId, questionId) {
    await this.assertExamForAdmin(examId);
    const existing = await this.examQuestions.findByIdLean(questionId);
    if (!existing || String(existing.examId) !== String(examId)) {
      throw new NotFoundError('Question not found');
    }
    await this.examQuestions.softDeleteByIdLean(questionId);
    await this.redistributeEqualPointsForExam(examId);
    await this.syncExamQuestionsCount(examId);
    return { id: questionId, deleted: true };
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').listQuestionBankQuerySchema>} query
   */
  async listQuestionBank(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.examQuestionBank.findPageByDecreeCategory({
      skip,
      limit,
      decreeCategoryId: query.decreeCategoryId,
      sort: query.sort,
    });
    return {
      items: items.map((r) => serializeExamQuestionBankEntry(r)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').createQuestionBankEntryBodySchema>} body
   * @param {string | null} [actorUserId]
   */
  async createQuestionBankEntry(body, actorUserId = null) {
    const cat = await this.decreeCategories.findByIdLean(String(body.decreeCategoryId));
    if (!cat) throw new BadRequestError('Decree category not found');
    if (body.type === ExamQuestionType.MULTIPLE_CHOICE) {
      if (!body.options || !body.options.length) {
        throw new BadRequestError('Multiple choice questions require at least one option');
      }
      if (!body.correctOptionKeys || !body.correctOptionKeys.length) {
        throw new BadRequestError('Multiple choice questions require at least one correct option key');
      }
    }
    if (body.type === ExamQuestionType.TRUE_FALSE && body.correctBoolean === undefined) {
      throw new BadRequestError('True/false questions require correctBoolean');
    }
    const created = await this.examQuestionBank.createLean({
      decreeCategoryId: new mongoose.Types.ObjectId(String(body.decreeCategoryId)),
      decreeCategoryName: String(cat.name ?? '').trim() || null,
      type: body.type,
      stem: body.stem,
      explanation: body.explanation ?? null,
      options: body.options,
      correctOptionKeys: body.correctOptionKeys,
      correctBoolean: body.correctBoolean ?? null,
      correctTextNormalized: body.correctTextNormalized ?? null,
      points: body.points ?? 1,
      isActive: body.isActive !== false,
      createdByUserId: actorUserId ? new mongoose.Types.ObjectId(actorUserId) : null,
    });
    return serializeExamQuestionBankEntry(created);
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').patchQuestionBankBodySchema>} body
   * @param {string | null} [actorUserId]
   */
  async updateQuestionBankEntry(id, body, actorUserId = null) {
    const existing = await this.examQuestionBank.findByIdLean(id);
    if (!existing) throw new NotFoundError('Question bank entry not found');

    let decreeCategoryId = existing.decreeCategoryId;
    let decreeCategoryName = existing.decreeCategoryName ?? null;
    if (body.decreeCategoryId !== undefined) {
      const cat = await this.decreeCategories.findByIdLean(String(body.decreeCategoryId));
      if (!cat) throw new BadRequestError('Decree category not found');
      decreeCategoryId = new mongoose.Types.ObjectId(String(body.decreeCategoryId));
      decreeCategoryName = String(cat.name ?? '').trim() || null;
    }

    const nextType = body.type ?? existing.type;
    if (nextType === ExamQuestionType.MULTIPLE_CHOICE) {
      const opts = body.options !== undefined ? body.options : existing.options;
      if (!opts || !opts.length) throw new BadRequestError('Multiple choice questions require at least one option');
    }
    if (nextType === ExamQuestionType.TRUE_FALSE) {
      const cb = body.correctBoolean !== undefined ? body.correctBoolean : existing.correctBoolean;
      if (cb === undefined) throw new BadRequestError('True/false questions require correctBoolean');
    }

    /** @type {Record<string, unknown>} */
    const $set = {};
    if (body.decreeCategoryId !== undefined) {
      $set.decreeCategoryId = decreeCategoryId;
      $set.decreeCategoryName = decreeCategoryName;
    }
    if (body.type !== undefined) $set.type = body.type;
    if (body.stem !== undefined) $set.stem = body.stem;
    if (body.explanation !== undefined) $set.explanation = body.explanation;
    if (body.options !== undefined) $set.options = body.options;
    if (body.correctOptionKeys !== undefined) $set.correctOptionKeys = body.correctOptionKeys;
    if (body.correctBoolean !== undefined) $set.correctBoolean = body.correctBoolean;
    if (body.correctTextNormalized !== undefined) $set.correctTextNormalized = body.correctTextNormalized;
    if (body.points !== undefined) $set.points = body.points;
    if (body.isActive !== undefined) $set.isActive = body.isActive;
    if (actorUserId) {
      $set.updatedByUserId = new mongoose.Types.ObjectId(actorUserId);
    }

    if (Object.keys($set).length === 0) {
      return serializeExamQuestionBankEntry(existing);
    }

    const updated = await this.examQuestionBank.updateByIdLean(id, $set);
    return serializeExamQuestionBankEntry(updated);
  }

  /**
   * Soft-delete a bank question and remove it from all exams that cloned it.
   * Rebalances per-question points on each affected exam to match the exam's `maxScore`.
   *
   * @param {string} id
   */
  async deleteQuestionBankEntry(id) {
    const existing = await this.examQuestionBank.findByIdLean(id);
    if (!existing) throw new NotFoundError('Question bank entry not found');
    await this.examQuestionBank.softDeleteByIdLean(id);

    const linked = await this.examQuestions.listBySourceBankQuestionIdLean(id);
    const examIds = new Set(/** @type {string[]} */ (linked.map((q) => String(q.examId))));
    for (const row of linked) {
      await this.examQuestions.softDeleteByIdLean(String(row._id));
    }
    for (const eid of examIds) {
      await this.redistributeEqualPointsForExam(eid);
      await this.syncExamQuestionsCount(eid);
    }
    return { id, deleted: true, examsUpdated: examIds.size };
  }

  /**
   * Copy question-bank rows into an exam (same `decreeCategoryId` as the exam).
   *
   * @param {string} examId
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').cloneBankQuestionsToExamBodySchema>} body
   */
  async cloneBankQuestionsToExam(examId, body) {
    const exam = await this.exams.findByIdLean(examId);
    if (!exam) throw new NotFoundError('Exam not found');
    if (!exam.decreeCategoryId) {
      throw new BadRequestError('Exam must have a decree category before attaching bank questions');
    }
    const examCat = String(exam.decreeCategoryId);
    /** Preserve order, drop duplicate ids (avoids re-inserting the same bank row). */
    const uniqueBankIds = [];
    const seen = new Set();
    for (const raw of body.bankQuestionIds) {
      const id = String(raw);
      if (seen.has(id)) continue;
      seen.add(id);
      uniqueBankIds.push(id);
    }

    const currentRows = await this.examQuestions.listByExamIdLean(examId, { activeOnly: false });
    const alreadyCloned = new Set(
      currentRows
        .map((q) => (q.sourceBankQuestionId ? String(q.sourceBankQuestionId) : null))
        .filter(Boolean),
    );
    const banksToCreate = [];
    for (const bankId of uniqueBankIds) {
      if (alreadyCloned.has(bankId)) {
        /* Idempotent: already on this exam (e.g. double save or re-run without delete). */
        continue;
      }
      const bank = await this.examQuestionBank.findByIdLean(bankId);
      if (!bank || String(bank.decreeCategoryId) !== examCat) {
        throw new BadRequestError('A selected bank question is missing or not in this exam category');
      }
      banksToCreate.push(bank);
    }

    if (banksToCreate.length === 0) {
      await this.redistributeEqualPointsForExam(examId);
      await this.syncExamQuestionsCount(examId);
      return { items: [] };
    }

    /** One `maxOrder` read + monotonic `order` avoids E11000 on { examId, order } (same insert batch / races). */
    let nextOrder = (await this.examQuestions.maxOrderForExam(examId)) + 1;
    const created = [];
    for (const bank of banksToCreate) {
      const order = nextOrder;
      nextOrder += 1;
      const row = await this.examQuestions.create({
        examId: new mongoose.Types.ObjectId(examId),
        sourceBankQuestionId: new mongoose.Types.ObjectId(String(bank._id)),
        order,
        type: bank.type,
        stem: bank.stem,
        explanation: bank.explanation ?? null,
        options: bank.options,
        correctOptionKeys: bank.correctOptionKeys,
        correctBoolean: bank.correctBoolean ?? null,
        correctTextNormalized: bank.correctTextNormalized ?? null,
        points: bank.points ?? 1,
        isActive: bank.isActive !== false,
        createdByUserId: null,
      });
      created.push(serializeExamQuestionAdmin(row));
    }
    await this.redistributeEqualPointsForExam(examId);
    await this.syncExamQuestionsCount(examId);
    return { items: created };
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').listExamAttemptsQuerySchema>} query
   */
  async listExamAttempts(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.examAttempts.findPageForAdmin({
      skip,
      limit,
      examId: query.examId,
      status: query.status,
      search: query.search,
      sort: query.sort,
      from: query.from,
      to: query.to,
    });
    return {
      items: items.map((r) => serializeExamAttemptAdmin(r)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {string} attemptId
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').gradeExamAttemptBodySchema>} body
   * @param {string | undefined} actorUserId
   */
  async gradeExamAttempt(attemptId, body, actorUserId) {
    const attempt = await this.examAttempts.findByIdLean(attemptId);
    if (!attempt || attempt.isDeleted) throw new NotFoundError('Attempt not found');
    if (attempt.status !== ExamAttemptStatus.SUBMITTED) {
      throw new ConflictError('Attempt is not awaiting manual grading.', { status: attempt.status });
    }

    const examId = String(attempt.examId);
    const exam = await this.assertExamForAdmin(examId);
    const questions = await this.examQuestions.listByExamIdLean(examId, { activeOnly: true });
    const hasEssay = questions.some((q) => q.type === ExamQuestionType.ESSAY);
    if (!hasEssay) {
      throw new BadRequestError('This exam has no essay questions to grade manually.');
    }

    const mergedAnswers = applyManualEssayGrades(questions, attempt.answers ?? [], body.grades ?? []);
    const { score, maxScore } = totalScoreFromAnswers(questions, mergedAnswers);
    const allEssayGraded = allEssaysHaveManualScores(questions, mergedAnswers);

    if (!allEssayGraded) {
      const partial = await this.examAttempts.updateByIdLean(attemptId, {
        answers: mergedAnswers,
        score,
        maxScore,
        passed: null,
        updatedByUserId: actorUserId ? new mongoose.Types.ObjectId(actorUserId) : null,
      });
      return serializeExamAttemptAdmin(partial);
    }

    const passPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const thresholdPct = examPassThresholdPercent(exam);
    const passing = passPct >= thresholdPct;
    const updated = await this.examAttempts.updateByIdLean(attemptId, {
      status: ExamAttemptStatus.GRADED,
      gradedAt: new Date(),
      answers: mergedAnswers,
      score,
      maxScore,
      passed: passing,
      certificateIssued: Boolean(passing),
      updatedByUserId: actorUserId ? new mongoose.Types.ObjectId(actorUserId) : null,
    });

    if (passing) {
      const level = proficiencyLevelFromPassPct(passPct);
      const issued = await certificateIssueWorkflow.issue({
        holderUserId: String(attempt.examineeUserId),
        kind: CertificateKind.EXAM_PASS,
        sourceExamId: examId,
        sourceExamAttemptId: attemptId,
        passPct,
        level,
        decreeIds: [],
        actorUserId: actorUserId ?? null,
        tenantId: exam.tenantId ?? null,
        category: typeof exam.title === 'string' ? exam.title : null,
      });
      await NotificationModel.create({
        title: 'Certificate issued',
        body: `You passed the exam with ${Math.round(passPct)}% (${level} level). Your certificate is ready.`,
        recipientUserId: attempt.examineeUserId,
        recipientRoleKey: RoleKey.PUBLIC_USER,
        metadata: {
          kind: 'certificate_issued',
          examId,
          attemptId,
          certificateId: issued.certificateId,
        },
      });
    } else {
      await NotificationModel.create({
        title: 'Exam result ready',
        body: `Your exam has been graded (score ${Math.round(score)}/${maxScore}).`,
        recipientUserId: attempt.examineeUserId,
        recipientRoleKey: RoleKey.PUBLIC_USER,
        metadata: { kind: 'exam_results', examId, attemptId },
      });
    }

    return serializeExamAttemptAdmin(updated);
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').listInspectorsQuerySchema>} query
   */
  async listInspectors(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.users.findStaffPage({
      skip,
      limit,
      roleKey: RoleKey.INSPECTOR,
      status: query.status,
      search: query.search,
      sort: query.sort,
      from: query.from,
      to: query.to,
    });
    return {
      items: items.map((u) => {
        const profile = u.profile && typeof u.profile === 'object' ? u.profile : {};
        const regionId =
          typeof profile.inspectorRegionId === 'string' && profile.inspectorRegionId
            ? profile.inspectorRegionId
            : 'central';
        const regionLabel =
          typeof profile.inspectorRegionLabel === 'string' && profile.inspectorRegionLabel
            ? profile.inspectorRegionLabel
            : '';
        return {
          id: String(u._id),
          name: String(u.displayName ?? ''),
          regionId,
          regionLabel,
          mobileFieldAgent: profile.mobileFieldAgent !== false,
          device: profile.device === 'tablet' ? 'tablet' : 'phone',
          active: u.status === UserAccountStatus.ACTIVE && !u.deactivatedAt,
          status: u.status ?? null,
          email: u.email ?? null,
        };
      }),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {string} id
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').patchInspectorBodySchema>} body
   */
  async patchInspectorUser(id, body) {
    const existing = await this.users.findByIdLean(id);
    if (!existing) throw new NotFoundError('User not found');
    if (existing.roleKey !== RoleKey.INSPECTOR) {
      throw new BadRequestError('Only inspector accounts can be updated from this workspace');
    }
    /** @type {Record<string, unknown>} */
    const $set = {};
    if (body.status === 'active') {
      $set.status = UserAccountStatus.ACTIVE;
      $set.deactivatedAt = null;
    } else if (body.status === 'suspended') {
      $set.status = UserAccountStatus.SUSPENDED;
      $set.deactivatedAt = new Date();
    }
    const updated = await this.users.updateByIdLean(id, $set);
    const profile = updated.profile && typeof updated.profile === 'object' ? updated.profile : {};
    return {
      id: String(updated._id),
      name: String(updated.displayName ?? ''),
      regionId: typeof profile.inspectorRegionId === 'string' ? profile.inspectorRegionId : 'central',
      regionLabel: typeof profile.inspectorRegionLabel === 'string' ? profile.inspectorRegionLabel : '',
      mobileFieldAgent: profile.mobileFieldAgent !== false,
      device: profile.device === 'tablet' ? 'tablet' : 'phone',
      active: updated.status === UserAccountStatus.ACTIVE && !updated.deactivatedAt,
      status: updated.status ?? null,
    };
  }

  async buildOperationalSignals() {
    const now = new Date();
    const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const overdue = await InspectionAssignmentModel.find({
      isDeleted: { $ne: true },
      dueAt: { $lt: startToday },
      status: {
        $in: [
          InspectionAssignmentStatus.ASSIGNED,
          InspectionAssignmentStatus.IN_PROGRESS,
          InspectionAssignmentStatus.DRAFT_SAVED,
        ],
      },
    })
      .sort({ dueAt: 1 })
      .limit(80)
      .lean();

    const revisions = await InspectionAssignmentModel.find({
      isDeleted: { $ne: true },
      status: InspectionAssignmentStatus.RETURNED_FOR_REVISION,
    })
      .sort({ updatedAt: -1 })
      .limit(40)
      .lean();

    const since = new Date();
    since.setDate(since.getDate() - 120);
    const revoked = await CertificateModel.find({
      isDeleted: { $ne: true },
      status: CertificateStatus.REVOKED,
      revokedAt: { $gte: since },
    })
      .sort({ revokedAt: -1 })
      .limit(30)
      .lean();

    const decreeIds = [
      ...new Set([...overdue, ...revisions].map((a) => String(a.decreeId)).filter(Boolean)),
    ];
    const decrees = decreeIds.length ? await this.decrees.findByIdsLean(decreeIds) : [];
    const decreeTitleById = new Map(
      decrees.map((d) => [String(d._id), String(d.titleSummary ?? d.decreeNumber ?? '—')]),
    );

    /** @type {Array<Record<string, unknown>>} */
    const out = [];

    for (const a of overdue) {
      const regionId = regionKeyFromText(a.region);
      const title = `Overdue inspection — ${decreeTitleById.get(String(a.decreeId)) ?? 'decree'}`;
      const sev = a.priority === 'urgent' || a.priority === 'high' ? 'high' : 'medium';
      out.push({
        id: `sig-overdue-${String(a._id)}`,
        regionId,
        title,
        severity: sev,
        status: 'open',
        date: a.dueAt ? new Date(a.dueAt).toISOString().slice(0, 10) : '',
        description: `Assignment was due before today and is still ${String(a.status)}.`,
      });
    }

    for (const a of revisions) {
      const regionId = regionKeyFromText(a.region);
      out.push({
        id: `sig-revision-${String(a._id)}`,
        regionId,
        title: `Returned for revision — ${decreeTitleById.get(String(a.decreeId)) ?? 'decree'}`,
        severity: 'medium',
        status: 'investigating',
        date: a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0, 10) : '',
        description: String(a.returnReason ?? 'Inspector must address review notes and resubmit.'),
      });
    }

    for (const c of revoked) {
      out.push({
        id: `sig-revoked-${String(c._id)}`,
        regionId: 'central',
        title: `Certificate revoked (${String(c.certificateNumber ?? c._id)})`,
        severity: 'high',
        status: 'open',
        date: c.revokedAt ? new Date(c.revokedAt).toISOString().slice(0, 10) : '',
        description: String(c.revokeReason ?? 'Certificate revoked by authority.'),
      });
    }

    return out;
  }

  /**
   * @param {import('zod').infer<typeof import('./inspector-admin.validation.js').listOperationalReportsQuerySchema>} query
   */
  async listOperationalReports(query) {
    const { skip, limit } = toOffsetLimit(query);
    const rows = await this.buildOperationalSignals();
    const total = rows.length;
    const items = rows.slice(skip, skip + limit);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
    };
  }
}

export const inspectorAdminService = new InspectorAdminService();
