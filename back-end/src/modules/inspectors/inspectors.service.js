import mongoose from 'mongoose';
import { API_VERSION } from '../shared/constants/api.js';
import { inspectionAssignmentRepository } from '../../../database/repositories/inspection-assignment.repository.js';
import { inspectionSubmissionRepository } from '../../../database/repositories/inspection-submission.repository.js';
import { inspectionEvidenceFileRepository } from '../../../database/repositories/inspection-evidence-file.repository.js';
import { inspectionTemplateRepository } from '../../../database/repositories/inspection-template.repository.js';
import { storedFileRepository } from '../../../database/repositories/stored-file.repository.js';
import { userRepository } from '../../../database/repositories/user.repository.js';
import { decreeRepository } from '../../../database/repositories/decree.repository.js';
import { InspectionAssignmentModel } from '../../../database/models/inspection-assignment.model.js';
import { InspectionSubmissionModel } from '../../../database/models/inspection-submission.model.js';
import { PendingInspectionOfflineModel } from '../../../database/models/pending-inspection-offline.model.js';
import { InspectionTemplateModel } from '../../../database/models/inspection-template.model.js';
import { DecreeCategoryModel } from '../../../database/models/decree-category.model.js';
import { withMongoTransaction } from '../../core/database/mongo-session.js';
import { toOffsetLimit } from '../shared/query/pagination.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../shared/http/index.js';
import { InspectionAssignmentStatus } from '../shared/enums/inspection-assignment-status.js';
import { assertInspectionSubmissionMatchesTemplate } from '../inspections/inspection-submission.rules.js';
import {
  assertInspectionAnswerPayloadsForFinalSubmit,
  assertInspectionDraftAnswersPartial,
  normalizeInspectionAnswersForPersistence,
} from '../inspections/inspection-answer.rules.js';
import { computeInspectionAuditScore } from '../inspections/inspection-audit-score.js';
import { INSPECTORS_ROUTE_MAP } from './inspectors.constants.js';
import { serializeInspectionAssignment } from '../inspector-admin/serializers/inspection-assignment.serializer.js';
import { serializeInspectionSubmission } from '../inspector-admin/serializers/inspection-submission.serializer.js';
import { serializeInspectionTemplate } from '../inspector-admin/serializers/inspection-template.serializer.js';
import { serializeInspectionEvidenceFile } from './serializers/inspection-evidence.serializer.js';

/** @param {Record<string, unknown>} assignment */
function targetRevisionNumber(assignment) {
  return (assignment.revisionCount ?? 0) + 1;
}

/**
 * @param {Record<string, unknown>} assignment
 * @param {string} inspectorUserId
 */
function assertAssignmentForInspector(assignment, inspectorUserId) {
  if (!assignment) throw new NotFoundError('Assignment not found');
  if (String(assignment.inspectorUserId) !== inspectorUserId) {
    throw new ForbiddenError('This assignment is not assigned to the current inspector');
  }
}

const EDITABLE_STATUSES = new Set([
  InspectionAssignmentStatus.ASSIGNED,
  InspectionAssignmentStatus.IN_PROGRESS,
  InspectionAssignmentStatus.DRAFT_SAVED,
  InspectionAssignmentStatus.RETURNED_FOR_REVISION,
  InspectionAssignmentStatus.SUBMITTED,
]);

const EVIDENCE_ALLOWED_STATUSES = new Set([
  InspectionAssignmentStatus.ASSIGNED,
  InspectionAssignmentStatus.IN_PROGRESS,
  InspectionAssignmentStatus.DRAFT_SAVED,
  InspectionAssignmentStatus.RETURNED_FOR_REVISION,
  InspectionAssignmentStatus.SUBMITTED,
]);

/**
 * @param {string} status
 */
function assertEditableAssignmentStatus(status) {
  if (!EDITABLE_STATUSES.has(status)) {
    throw new ConflictError('Assignment is not editable in its current status', { status });
  }
}

/**
 * @param {string} status
 */
function assertSubmittableAssignmentStatus(status) {
  if (!EDITABLE_STATUSES.has(status)) {
    throw new ConflictError('Assignment cannot be submitted in its current status', { status });
  }
}

/**
 * @param {Array<Record<string, unknown>>} answers
 */
function collectEvidenceFileIdsFromAnswers(answers) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const a of answers) {
    const list = Array.isArray(a.evidenceFileIds) ? a.evidenceFileIds : [];
    for (const id of list) {
      if (id) ids.add(String(id));
    }
  }
  return [...ids];
}

/**
 * @param {unknown} priority
 */
function mapInspectorPriorityLevel(priority) {
  const p = String(priority ?? 'normal');
  if (p === 'urgent' || p === 'high') return 'high';
  if (p === 'low') return 'low';
  return 'medium';
}

/**
 * Mobile task board status (derived from DB lifecycle + due date).
 * @param {Record<string, unknown>} row
 */
function toMobileInspectorTaskStatus(row) {
  const st = String(row.status ?? '');
  const due = row.dueAt ? new Date(row.dueAt) : null;
  const now = new Date();
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const overdueCalculated =
    due &&
    !Number.isNaN(due.getTime()) &&
    due < startToday &&
    st !== InspectionAssignmentStatus.FINALIZED &&
    st !== InspectionAssignmentStatus.SUBMITTED;

  if (st === InspectionAssignmentStatus.FINALIZED) return 'completed';
  if (st === InspectionAssignmentStatus.RETURNED_FOR_REVISION) return 'returned';
  if (st === InspectionAssignmentStatus.SUBMITTED) return 'in-progress';
  if (overdueCalculated) return 'overdue';
  if (st === InspectionAssignmentStatus.DRAFT_SAVED) return 'draft';
  if (st === InspectionAssignmentStatus.IN_PROGRESS) return 'in-progress';
  if (st === InspectionAssignmentStatus.ASSIGNED) return 'assigned';
  return 'in-progress';
}

/**
 * @param {Record<string, unknown> | null | undefined} tpl
 */
function requirementHintsFromTemplate(tpl) {
  const out = [];
  if (!tpl || typeof tpl !== 'object') return out;
  const sections = /** @type {Array<{ items?: Array<{ required?: boolean, label?: string, itemKey?: string }> }>} */ (
    tpl.sections ?? []
  );
  for (const sec of sections) {
    for (const it of sec.items ?? []) {
      if (it.required) out.push(String(it.label ?? it.itemKey ?? 'Field'));
    }
  }
  return out.slice(0, 12);
}

/**
 * @param {Record<string, unknown> | null | undefined} tpl
 */
function instructionsFromTemplate(tpl) {
  if (!tpl || typeof tpl !== 'object') return '';
  const parts = [];
  if (tpl.description) {
    const cleaned = String(tpl.description)
      .split('\n')
      .filter((line) => !String(line).trim().startsWith('SelectionMeta:'))
      .join('\n')
      .trim();
    if (cleaned) parts.push(cleaned);
  }
  const sections = /** @type {Array<{ title?: string, description?: string | null }>} */ (tpl.sections ?? []);
  for (const sec of sections) {
    if (sec.description) parts.push(`${String(sec.title ?? '')}: ${String(sec.description)}`);
  }
  return parts.length
    ? parts.join('\n\n')
    : 'Complete the inspection following all required checklist items.';
}

/**
 * Best-effort parse of human-readable location embedded in template description.
 * Supports legacy templates that stored `Location: <text>` only in `description`.
 * @param {Record<string, unknown> | null | undefined} tpl
 * @returns {string}
 */
function locationFromTemplateDescription(tpl) {
  if (!tpl || typeof tpl !== 'object') return '';
  const raw = typeof tpl.description === 'string' ? tpl.description : '';
  if (!raw) return '';
  for (const line of raw.split('\n')) {
    const trimmed = String(line ?? '').trim();
    if (!trimmed) continue;
    if (/^location\s*:/i.test(trimmed)) {
      return trimmed.replace(/^location\s*:\s*/i, '').trim();
    }
  }
  return '';
}

/**
 * Best-effort parse of template selection metadata embedded in description.
 * @param {Record<string, unknown> | null | undefined} tpl
 */
function parseTemplateSelectionMeta(tpl) {
  if (!tpl || typeof tpl !== 'object') return null;
  const raw = typeof tpl.description === 'string' ? tpl.description : '';
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.decreeSelectionMode === 'category' || parsed.decreeSelectionMode === 'decrees') {
      return parsed;
    }
  } catch {
    // Ignore metadata parse failures; keep inspector flow operational.
  }
  return null;
}

export class InspectorsService {
  /**
   * @param {{
   *   assignments?: import('../../../database/repositories/inspection-assignment.repository.js').InspectionAssignmentRepository,
   *   submissions?: import('../../../database/repositories/inspection-submission.repository.js').InspectionSubmissionRepository,
   *   evidence?: import('../../../database/repositories/inspection-evidence-file.repository.js').InspectionEvidenceFileRepository,
   *   templates?: import('../../../database/repositories/inspection-template.repository.js').InspectionTemplateRepository,
   *   files?: import('../../../database/repositories/stored-file.repository.js').StoredFileRepository,
   *   users?: import('../../../database/repositories/user.repository.js').UserRepository,
   *   decrees?: import('../../../database/repositories/decree.repository.js').DecreeRepository,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.assignments = deps.assignments ?? inspectionAssignmentRepository;
    this.submissions = deps.submissions ?? inspectionSubmissionRepository;
    this.evidence = deps.evidence ?? inspectionEvidenceFileRepository;
    this.templates = deps.templates ?? inspectionTemplateRepository;
    this.files = deps.files ?? storedFileRepository;
    this.users = deps.users ?? userRepository;
    this.decrees = deps.decrees ?? decreeRepository;
  }

  getModuleMeta() {
    return {
      module: 'inspectors',
      apiVersion: API_VERSION,
      description: 'Inspector mobile operations: assignments, drafts, submissions, evidence, sync, profile.',
      routes: INSPECTORS_ROUTE_MAP,
    };
  }

  /**
   * @param {string} inspectorUserId
   * @param {import('zod').infer<typeof import('./inspectors.validation.js').listInspectorAssignmentsQuerySchema>} query
   */
  async listAssignments(inspectorUserId, query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.assignments.findPage({
      skip,
      limit,
      status: query.status,
      inspectorUserId,
      search: query.search,
      sort: query.sort,
      from: query.from,
      to: query.to,
    });
    const enriched = await this.enrichAssignmentsForInspectorClient(items);
    return {
      items: enriched,
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {Array<Record<string, unknown>>} rows
   */
  async enrichAssignmentsForInspectorClient(rows) {
    if (!rows.length) return [];
    const decreeIds = [...new Set(rows.map((r) => String(r.decreeId)).filter(Boolean))];
    const templateIds = [...new Set(rows.map((r) => String(r.templateId)).filter(Boolean))];
    const [decrees, templates] = await Promise.all([
      decreeIds.length ? this.decrees.findByIdsLean(decreeIds) : Promise.resolve([]),
      templateIds.length
        ? InspectionTemplateModel.find({
            _id: { $in: templateIds.map((id) => new mongoose.Types.ObjectId(id)) },
            isDeleted: { $ne: true },
          }).lean()
        : Promise.resolve([]),
    ]);
    const decreeById = new Map(decrees.map((d) => [String(d._id), d]));
    const templateById = new Map(templates.map((t) => [String(t._id), t]));

    const categoryIds = [
      ...new Set(
        decrees.flatMap((d) => (Array.isArray(d.categoryIds) ? d.categoryIds : []).map((x) => String(x))),
      ),
    ];
    const categories = categoryIds.length
      ? await DecreeCategoryModel.find({
          _id: { $in: categoryIds.map((id) => new mongoose.Types.ObjectId(id)) },
          isDeleted: { $ne: true },
        })
          .select({ name: 1 })
          .lean()
      : [];
    const categoryById = new Map(categories.map((c) => [String(c._id), String(c.name ?? '')]));

    return rows.map((row) => {
      const base = serializeInspectionAssignment(row);
      const dec = decreeById.get(String(row.decreeId));
      const tpl = templateById.get(String(row.templateId));
      const selectionMeta = parseTemplateSelectionMeta(tpl);
      const firstCatId = dec && Array.isArray(dec.categoryIds) && dec.categoryIds[0] ? String(dec.categoryIds[0]) : '';
      const categoryName = firstCatId ? categoryById.get(firstCatId) || 'General' : 'General';
      const decreeNumber = dec ? String(dec.decreeNumber ?? '') : '';
      const decreeTitle = dec ? String(dec.titleSummary ?? dec.decreeNumber ?? '—') : '—';
      const templateName = tpl ? String(tpl.name ?? 'Inspection') : 'Inspection';
      const categoryScope = selectionMeta?.decreeSelectionMode === 'category';
      const inspectionScope = categoryScope ? 'category' : 'single-decree';
      const displayTarget = categoryScope
        ? `${categoryName} (Whole Category) · ${decreeTitle}`
        : `${categoryName} · ${decreeTitle}`;
      const due = row.dueAt ? new Date(row.dueAt) : null;
      // Location is captured on the template and copied to assignments at creation time.
      // For legacy assignments that predate `assignment.location`, fall back to the template's location.
      // For legacy templates that predate `template.location`, fall back to `Location: ...` inside `template.description`.
      const regionLabel =
        String(
          row.location ??
            tpl?.location ??
            locationFromTemplateDescription(tpl) ??
            row.region ??
            row.locationName ??
            '',
        ).trim() ||
        'Location not set';
      const deadlineYmd = due && !Number.isNaN(due.getTime()) ? due.toISOString().slice(0, 10) : '';
      const taskStatus = toMobileInspectorTaskStatus(row);
      const priorityLevel = mapInspectorPriorityLevel(row.priority);
      const instructions = instructionsFromTemplate(tpl);
      const requirementHints = requirementHintsFromTemplate(tpl);
      return {
        ...base,
        taskTitle: `${templateName} — ${decreeTitle}`,
        decreeTitle,
        decreeNumber,
        categoryName,
        inspectionScope,
        displayTarget,
        templateName,
        region: regionLabel,
        // Explicit alias for clients/UI that expect `location` naming.
        location: regionLabel,
        deadline: deadlineYmd,
        taskStatus,
        priorityLevel,
        instructions,
        requirementHints,
        returnReason: row.returnReason ? String(row.returnReason) : null,
      };
    });
  }

  /**
   * @param {string} inspectorUserId
   */
  async getInspectorDashboard(inspectorUserId) {
    const filter = {
      inspectorUserId: new mongoose.Types.ObjectId(inspectorUserId),
      isDeleted: { $ne: true },
    };
    const rows = await InspectionAssignmentModel.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    const assignments = await this.enrichAssignmentsForInspectorClient(rows);

    const stats = {
      assigned: 0,
      inProgress: 0,
      overdue: 0,
      draft: 0,
      completed: 0,
      returned: 0,
    };
    for (const a of assignments) {
      const s = String(a.taskStatus ?? '');
      if (s === 'assigned') stats.assigned += 1;
      else if (s === 'in-progress') stats.inProgress += 1;
      else if (s === 'overdue') stats.overdue += 1;
      else if (s === 'draft') stats.draft += 1;
      else if (s === 'completed') stats.completed += 1;
      else if (s === 'returned') stats.returned += 1;
    }

    const activeSet = new Set(['assigned', 'in-progress', 'overdue', 'draft', 'returned']);
    const activeTaskPreviews = assignments.filter((a) => activeSet.has(String(a.taskStatus ?? ''))).slice(0, 4);

    const recentActivity = this.buildInspectorRecentActivity(rows, assignments);

    return {
      stats,
      assignments,
      activeTaskPreviews,
      recentActivity,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * @param {Array<Record<string, unknown>>} rawRows
   * @param {Array<Record<string, unknown>>} enriched
   */
  buildInspectorRecentActivity(rawRows, enriched) {
    const pairs = rawRows.map((raw, i) => ({ raw, en: enriched[i] }));
    pairs.sort((a, b) => {
      const ta = a.raw.updatedAt ? new Date(a.raw.updatedAt).getTime() : 0;
      const tb = b.raw.updatedAt ? new Date(b.raw.updatedAt).getTime() : 0;
      return tb - ta;
    });
    /** @type {Array<Record<string, unknown>>} */
    const out = [];
    for (const { raw, en } of pairs) {
      if (out.length >= 6) break;
      const id = String(en.id ?? raw._id ?? '');
      const title = String(en.taskTitle ?? en.decreeTitle ?? 'Assignment');
      const st = String(raw.status ?? '');
      const timeIso = raw.updatedAt
        ? new Date(raw.updatedAt).toISOString()
        : new Date().toISOString();

      if (st === InspectionAssignmentStatus.RETURNED_FOR_REVISION) {
        out.push({
          id: `${id}-revision`,
          kind: 'revision',
          title: raw.returnReason ? `Revision: ${String(raw.returnReason).slice(0, 120)}` : `Revision requested — ${title}`,
          time: timeIso,
        });
        continue;
      }
      if (raw.finalizedAt) {
        out.push({
          id: `${id}-final`,
          kind: 'finalized',
          title: `Inspection finalized — ${title}`,
          time: new Date(raw.finalizedAt).toISOString(),
        });
        continue;
      }
      if (raw.submittedAt && st === InspectionAssignmentStatus.SUBMITTED) {
        out.push({
          id: `${id}-submitted`,
          kind: 'submitted',
          title: `Submitted for review — ${title}`,
          time: new Date(raw.submittedAt).toISOString(),
        });
        continue;
      }
      out.push({
        id: `${id}-active`,
        kind: 'active',
        title: `Assignment active — ${title}`,
        time: timeIso,
      });
    }
    return out;
  }

  /**
   * @param {string} inspectorUserId
   * @param {string} assignmentId
   */
  async getAssignmentDetail(inspectorUserId, assignmentId) {
    const assignment = await this.assignments.findByIdLean(assignmentId);
    assertAssignmentForInspector(assignment, inspectorUserId);

    const template = await this.templates.findByIdLean(String(assignment.templateId));
    if (!template) throw new NotFoundError('Inspection template not found');

    const rev = targetRevisionNumber(assignment);
    const draft = await this.submissions.findDraftForAssignmentRevision(assignmentId, rev);
    const evidenceRows = await this.evidence.listByAssignmentLean(assignmentId);

    const [enrichedRow] = await this.enrichAssignmentsForInspectorClient([assignment]);
    const snap = assignment.templateRevisionSnapshot;
    const templateRevisionMatches = Number(template.revision) === Number(snap);

    const decree = assignment.decreeId
      ? await this.decrees.findByIdLean(String(assignment.decreeId))
      : null;

    return {
      assignment: enrichedRow,
      template: serializeInspectionTemplate(template),
      templateRevisionSnapshot: snap ?? null,
      templateRevisionMatches,
      targetRevisionNumber: rev,
      draftSubmission: draft ? serializeInspectionSubmission(draft) : null,
      evidenceFiles: evidenceRows.map((r) => serializeInspectionEvidenceFile(r)),
      decree: decree
        ? {
            id: String(decree._id),
            decreeNumber: decree.decreeNumber ?? null,
            titleSummary: decree.titleSummary ?? null,
          }
        : null,
    };
  }

  /**
   * @param {string} inspectorUserId
   * @param {string} assignmentId
   * @param {import('zod').infer<typeof import('./inspectors.validation.js').saveDraftBodySchema>} body
   */
  async saveDraft(inspectorUserId, assignmentId, body) {
    const assignment = await this.assignments.findByIdLean(assignmentId);
    assertAssignmentForInspector(assignment, inspectorUserId);
    assertEditableAssignmentStatus(String(assignment.status));

    const template = await this.templates.findByIdLean(String(assignment.templateId));
    if (!template) throw new NotFoundError('Inspection template not found');

    const answers = normalizeInspectionAnswersForPersistence(body.answers);
    assertInspectionDraftAnswersPartial({
      template,
      templateRevisionSnapshot: assignment.templateRevisionSnapshot,
      answers,
    });

    const revision = targetRevisionNumber(assignment);
    const oid = new mongoose.Types.ObjectId(inspectorUserId);
    const now = new Date();

    if (body.clientRequestId) {
      const existing = await this.submissions.findByAssignmentAndClientRequestId(assignmentId, body.clientRequestId);
      if (existing) {
        if (existing.submissionKind === 'final') {
          throw new ConflictError('clientRequestId is already associated with a final submission for this assignment');
        }
        if (Number(existing.revisionNumber) !== revision) {
          throw new ConflictError('clientRequestId is bound to a different revision cycle');
        }
      }
    }

    return withMongoTransaction(async (session) => {
      const fresh = await InspectionAssignmentModel.findById(assignmentId).session(session).lean();
      if (!fresh || fresh.isDeleted) throw new NotFoundError('Assignment not found');
      assertAssignmentForInspector(fresh, inspectorUserId);
      assertEditableAssignmentStatus(String(fresh.status));

      let draftRow = await InspectionSubmissionModel.findOne({
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        revisionNumber: revision,
        submissionKind: { $in: ['autosave_draft', 'manual_draft'] },
        isDeleted: { $ne: true },
      })
        .session(session)
        .lean();
      let finalRow = await InspectionSubmissionModel.findOne({
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        revisionNumber: revision,
        submissionKind: 'final',
        isDeleted: { $ne: true },
      })
        .session(session)
        .lean();

      if (!draftRow && body.clientRequestId) {
        draftRow = await InspectionSubmissionModel.findOne({
          assignmentId: new mongoose.Types.ObjectId(assignmentId),
          revisionNumber: revision,
          clientRequestId: body.clientRequestId,
          submissionKind: { $in: ['autosave_draft', 'manual_draft'] },
          isDeleted: { $ne: true },
        })
          .session(session)
          .lean();
      }

      /** @type {string | null} */
      let submissionId;

      if (draftRow || finalRow) {
        const target = draftRow ?? finalRow;
        submissionId = String(target._id);
        await InspectionSubmissionModel.findByIdAndUpdate(
          submissionId,
          {
            $set: {
              answers,
              revisionNumber: revision,
              submissionKind: body.submissionKind,
              submittedAt: null,
              clientRequestId: body.clientRequestId ?? target.clientRequestId ?? null,
              updatedByUserId: oid,
              updatedAt: now,
            },
          },
          { session, runValidators: true },
        );
      } else {
        const [created] = await InspectionSubmissionModel.create(
          [
            {
              assignmentId: new mongoose.Types.ObjectId(assignmentId),
              revisionNumber: revision,
              submissionKind: body.submissionKind,
              answers,
              submittedByUserId: oid,
              submittedAt: null,
              clientRequestId: body.clientRequestId ?? null,
              createdByUserId: oid,
              updatedByUserId: oid,
            },
          ],
          { session },
        );
        submissionId = String(created._id);
      }

      const nextStatus =
        String(fresh.status) === InspectionAssignmentStatus.RETURNED_FOR_REVISION
          ? InspectionAssignmentStatus.RETURNED_FOR_REVISION
          : InspectionAssignmentStatus.DRAFT_SAVED;

      /** @type {Record<string, unknown>} */
      const $set = {
        status: nextStatus,
        updatedByUserId: oid,
        updatedAt: now,
      };
      if (!fresh.startedAt) {
        $set.startedAt = now;
      }

      await InspectionAssignmentModel.findByIdAndUpdate(assignmentId, { $set }, { session, runValidators: true });

      const updatedAssignment = await InspectionAssignmentModel.findById(assignmentId).session(session).lean();
      const updatedSubmission = await InspectionSubmissionModel.findById(submissionId).session(session).lean();

      return {
        assignment: serializeInspectionAssignment(updatedAssignment),
        submission: serializeInspectionSubmission(updatedSubmission),
      };
    });
  }

  /**
   * @param {string} inspectorUserId
   * @param {string} assignmentId
   * @param {import('zod').infer<typeof import('./inspectors.validation.js').submitInspectionBodySchema>} body
   */
  async submitInspection(inspectorUserId, assignmentId, body) {
    const assignment = await this.assignments.findByIdLean(assignmentId);
    assertAssignmentForInspector(assignment, inspectorUserId);
    assertSubmittableAssignmentStatus(String(assignment.status));

    const template = await this.templates.findByIdLean(String(assignment.templateId));
    if (!template) throw new NotFoundError('Inspection template not found');

    const answers = normalizeInspectionAnswersForPersistence(body.answers);
    // Scoring must NEVER break the submit workflow; if scoring fails, fall back to null.
    let autoScore = null;
    try {
      const computed = computeInspectionAuditScore({ template, answers });
      autoScore = typeof computed === 'number' && Number.isFinite(computed) ? computed : null;
    } catch {
      autoScore = null;
    }

    if (body.clientRequestId) {
      const existing = await this.submissions.findByAssignmentAndClientRequestId(assignmentId, body.clientRequestId);
      if (existing && existing.submissionKind === 'final') {
        const a = await this.assignments.findByIdLean(assignmentId);
        return {
          idempotent: true,
          assignment: serializeInspectionAssignment(a),
          submission: serializeInspectionSubmission(existing),
        };
      }
    }

    assertInspectionSubmissionMatchesTemplate({
      template,
      templateRevisionSnapshot: assignment.templateRevisionSnapshot,
      answers,
    });
    assertInspectionAnswerPayloadsForFinalSubmit({ template, answers });

    const evidenceIds = collectEvidenceFileIdsFromAnswers(answers);
    if (evidenceIds.length > 0) {
      const registered = await this.evidence.countRegisteredFiles(assignmentId, evidenceIds);
      if (registered !== evidenceIds.length) {
        throw new BadRequestError(
          'One or more evidence file references are not registered for this assignment (upload evidence first)',
          { expected: evidenceIds.length, registered },
        );
      }
    }

    const revision = targetRevisionNumber(assignment);
    const oid = new mongoose.Types.ObjectId(inspectorUserId);
    const now = new Date();

    return withMongoTransaction(async (session) => {
      const fresh = await InspectionAssignmentModel.findById(assignmentId).session(session).lean();
      if (!fresh || fresh.isDeleted) throw new NotFoundError('Assignment not found');
      assertAssignmentForInspector(fresh, inspectorUserId);
      assertSubmittableAssignmentStatus(String(fresh.status));

      if (body.clientRequestId) {
        const existing = await InspectionSubmissionModel.findOne({
          assignmentId: new mongoose.Types.ObjectId(assignmentId),
          clientRequestId: body.clientRequestId,
          isDeleted: { $ne: true },
        })
          .session(session)
          .lean();
        if (existing && existing.submissionKind === 'final') {
          return {
            idempotent: true,
            assignment: serializeInspectionAssignment(fresh),
            submission: serializeInspectionSubmission(existing),
          };
        }
      }

      let draftRow = await InspectionSubmissionModel.findOne({
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        revisionNumber: revision,
        submissionKind: { $in: ['autosave_draft', 'manual_draft'] },
        isDeleted: { $ne: true },
      })
        .session(session)
        .lean();
      let finalRow = await InspectionSubmissionModel.findOne({
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        revisionNumber: revision,
        submissionKind: 'final',
        isDeleted: { $ne: true },
      })
        .session(session)
        .lean();

      /** @type {string} */
      let submissionId;

      if (draftRow || finalRow) {
        const target = draftRow ?? finalRow;
        submissionId = String(target._id);
        await InspectionSubmissionModel.findByIdAndUpdate(
          submissionId,
          {
            $set: {
              answers,
              submissionKind: 'final',
              submittedAt: now,
              submittedByUserId: oid,
              autoScore,
              clientRequestId: body.clientRequestId ?? target.clientRequestId ?? null,
              updatedByUserId: oid,
              updatedAt: now,
            },
          },
          { session, runValidators: true },
        );
      } else {
        const [created] = await InspectionSubmissionModel.create(
          [
            {
              assignmentId: new mongoose.Types.ObjectId(assignmentId),
              revisionNumber: revision,
              submissionKind: 'final',
              answers,
              submittedByUserId: oid,
              submittedAt: now,
              autoScore,
              clientRequestId: body.clientRequestId ?? null,
              createdByUserId: oid,
              updatedByUserId: oid,
            },
          ],
          { session },
        );
        submissionId = String(created._id);
      }

      /** @type {Record<string, unknown>} */
      const $set = {
        status: InspectionAssignmentStatus.SUBMITTED,
        submittedAt: now,
        latestSubmissionId: new mongoose.Types.ObjectId(submissionId),
        updatedByUserId: oid,
        updatedAt: now,
      };
      if (!fresh.startedAt) {
        $set.startedAt = now;
      }

      await InspectionAssignmentModel.findByIdAndUpdate(assignmentId, { $set }, { session, runValidators: true });

      const updatedAssignment = await InspectionAssignmentModel.findById(assignmentId).session(session).lean();
      const updatedSubmission = await InspectionSubmissionModel.findById(submissionId).session(session).lean();

      return {
        idempotent: false,
        assignment: serializeInspectionAssignment(updatedAssignment),
        submission: serializeInspectionSubmission(updatedSubmission),
      };
    });
  }

  /**
   * @param {string} inspectorUserId
   * @param {import('zod').infer<typeof import('./inspectors.validation.js').syncStatusQuerySchema>} query
   */
  async getSyncStatus(inspectorUserId, query) {
    const filter = {
      inspectorUserId: new mongoose.Types.ObjectId(inspectorUserId),
      isDeleted: { $ne: true },
    };
    if (!query.includeFinalized) {
      filter.status = { $ne: InspectionAssignmentStatus.FINALIZED };
    }

    const rows = await InspectionAssignmentModel.find(filter)
      .sort({ updatedAt: -1 })
      .limit(query.limit)
      .lean();

    const items = await Promise.all(
      rows.map(async (a) => {
        const id = String(a._id);
        const rev = targetRevisionNumber(a);
        const draft = await this.submissions.findDraftForAssignmentRevision(id, rev);
        const evidenceCount = await this.evidence.countByAssignment(id);
        return {
          assignmentId: id,
          status: a.status,
          assignmentUpdatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : null,
          targetRevisionNumber: rev,
          draft: draft
            ? {
                submissionId: String(draft._id),
                submissionKind: draft.submissionKind,
                updatedAt: draft.updatedAt ? new Date(draft.updatedAt).toISOString() : null,
                clientRequestId: draft.clientRequestId ?? null,
              }
            : null,
          evidenceFileCount: evidenceCount,
          latestSubmissionId: a.latestSubmissionId ? String(a.latestSubmissionId) : null,
        };
      }),
    );

    return {
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  /**
   * Batch-apply a sequence of offline ops. Each op is executed independently so one failure
   * doesn't block the rest — callers get a per-op result and can retry only the failed entries.
   *
   * Conflict detection: when the client passes `lastKnownRevision`, we compare it against the
   * assignment's current `revisionCount + 1` target. A mismatch returns `{ ok: false, conflict: 'stale_revision' }`
   * and the client can re-fetch + merge.
   *
   * @param {string} inspectorUserId
   * @param {{ ops: Array<{
   *   clientOpId: string,
   *   assignmentId: string,
   *   kind: 'save_draft' | 'submit',
   *   answers: Array<Record<string, unknown>>,
   *   submissionKind: 'autosave_draft' | 'manual_draft',
   *   lastKnownRevision?: number,
   *   clientRequestId?: string,
   * }> }} body
   */
  async syncBatch(inspectorUserId, body) {
    /** @type {Array<Record<string, unknown>>} */
    const results = [];

    for (const op of body.ops) {
      try {
        const assignment = await this.assignments.findByIdLean(op.assignmentId);
        if (!assignment || String(assignment.inspectorUserId) !== inspectorUserId) {
          results.push({
            clientOpId: op.clientOpId,
            ok: false,
            error: 'not_found',
            assignmentId: op.assignmentId,
          });
          continue;
        }

        const target = targetRevisionNumber(assignment);
        if (typeof op.lastKnownRevision === 'number' && op.lastKnownRevision !== target) {
          results.push({
            clientOpId: op.clientOpId,
            ok: false,
            error: 'stale_revision',
            assignmentId: op.assignmentId,
            serverRevision: target,
          });
          continue;
        }

        if (op.kind === 'submit') {
          const r = await this.submitInspection(inspectorUserId, op.assignmentId, {
            answers: op.answers,
            clientRequestId: op.clientRequestId,
          });
          results.push({
            clientOpId: op.clientOpId,
            ok: true,
            kind: 'submit',
            assignmentId: op.assignmentId,
            serverRevision: target,
            idempotent: r.idempotent,
          });
        } else {
          const r = await this.saveDraft(inspectorUserId, op.assignmentId, {
            answers: op.answers,
            submissionKind: op.submissionKind,
            clientRequestId: op.clientRequestId,
          });
          results.push({
            clientOpId: op.clientOpId,
            ok: true,
            kind: 'save_draft',
            assignmentId: op.assignmentId,
            serverRevision: target,
            submissionId: r.submission?.id ?? null,
          });
        }
      } catch (err) {
        results.push({
          clientOpId: op.clientOpId,
          ok: false,
          error: 'op_failed',
          assignmentId: op.assignmentId,
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    return {
      appliedAt: new Date().toISOString(),
      results,
    };
  }

  /**
   * @param {string} inspectorUserId
   * @param {{ authState: 'anonymous' | 'authenticated' }} ctx
   */
  async getProfileSummary(inspectorUserId, ctx) {
    const user = await this.users.findByIdLean(inspectorUserId);
    const breakdown = await this.assignments.countByStatusGrouped({
      inspectorUserId: new mongoose.Types.ObjectId(inspectorUserId),
    });

    return {
      inspectorUserId,
      authState: ctx.authState,
      user: user
        ? {
            id: String(user._id),
            displayName: user.displayName ?? null,
            roleKey: user.roleKey ?? null,
            status: user.status ?? null,
            preferredLocale: user.preferredLocale ?? null,
          }
        : null,
      assignmentSummary: {
        byStatus: Object.fromEntries(breakdown.map((r) => [r.status, r.total])),
        total: breakdown.reduce((acc, r) => acc + r.total, 0),
      },
    };
  }

  /**
   * @param {string} inspectorUserId
   * @param {string} assignmentId
   * @param {import('zod').infer<typeof import('./inspectors.validation.js').attachEvidenceBodySchema>} body
   */
  async attachEvidence(inspectorUserId, assignmentId, body) {
    const assignment = await this.assignments.findByIdLean(assignmentId);
    assertAssignmentForInspector(assignment, inspectorUserId);

    const st = String(assignment.status);
    if (!EVIDENCE_ALLOWED_STATUSES.has(st)) {
      throw new ConflictError('Evidence cannot be attached while the assignment is in this status', { status: st });
    }

    const file = await this.files.findByIdLean(body.fileId);
    if (!file) throw new NotFoundError('Stored file not found');

    const oid = new mongoose.Types.ObjectId(inspectorUserId);
    const capturedAt =
      body.capturedAt === undefined || body.capturedAt === null
        ? null
        : body.capturedAt instanceof Date
          ? body.capturedAt
          : new Date(body.capturedAt);
    if (capturedAt && Number.isNaN(capturedAt.getTime())) {
      throw new BadRequestError('Invalid capturedAt value');
    }

    const row = await this.evidence.createWithSession(
      {
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        submissionId: null,
        fileId: new mongoose.Types.ObjectId(body.fileId),
        caption: body.caption ?? null,
        capturedAt,
        itemKey: body.itemKey ?? null,
        createdByUserId: oid,
        updatedByUserId: oid,
      },
      undefined,
    );

    return serializeInspectionEvidenceFile(row);
  }

  /**
   * @param {string} inspectorUserId
   * @param {import('zod').infer<typeof import('./inspectors.validation.js').offlineInspectionImportBodySchema>} body
   */
  async importOfflineInspection(inspectorUserId, body) {
    const oid = new mongoose.Types.ObjectId(inspectorUserId);
    await PendingInspectionOfflineModel.findOneAndUpdate(
      { inspectorUserId: oid, offlineId: body.offlineId, isDeleted: { $ne: true } },
      {
        $set: {
          assignmentId: new mongoose.Types.ObjectId(body.assignmentId),
          answers: body.answers,
          photos: body.photos ?? [],
          signature: body.signature ?? null,
          gps: body.gps ?? null,
          submittedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
          status: 'pending',
          lastError: null,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          inspectorUserId: oid,
          offlineId: body.offlineId,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, runValidators: true },
    );
    return { ok: true, offlineId: body.offlineId };
  }

  /**
   * @param {string} inspectorUserId
   */
  async syncOfflineInspections(inspectorUserId) {
    const oid = new mongoose.Types.ObjectId(inspectorUserId);
    const rows = await PendingInspectionOfflineModel.find({
      inspectorUserId: oid,
      status: 'pending',
      isDeleted: { $ne: true },
    })
      .limit(80)
      .lean();

    let synced = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.submitInspection(inspectorUserId, String(row.assignmentId), {
          answers: Array.isArray(row.answers) ? row.answers : [],
          clientRequestId: `offline-sync-${row.offlineId}`,
        });
        await PendingInspectionOfflineModel.updateOne(
          { _id: row._id },
          { $set: { status: 'synced', lastError: null, updatedAt: new Date() } },
        );
        synced += 1;
      } catch (err) {
        failed += 1;
        await PendingInspectionOfflineModel.updateOne(
          { _id: row._id },
          {
            $set: {
              status: 'failed',
              lastError: err instanceof Error ? err.message.slice(0, 500) : 'sync_failed',
              updatedAt: new Date(),
            },
          },
        );
      }
    }

    return { synced, failed, pendingBefore: rows.length };
  }
}

export const inspectorsService = new InspectorsService();
