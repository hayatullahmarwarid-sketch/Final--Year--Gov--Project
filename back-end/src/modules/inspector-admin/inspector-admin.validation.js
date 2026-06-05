import { z } from 'zod';
import { extendListQuery } from '../shared/query/list-query.schema.js';
import {
  objectIdString,
  optionalScheduleDateNullable,
  optionalScheduleDateNullablePatch,
} from '../shared/validation/zod-helpers.js';
import {
  EXAM_PASSING_SCORE_PCT,
  EXAM_QUESTION_POINTS,
  EXAM_TIME_LIMIT_MINUTES,
  EXAM_TOTAL_POINTS_BUDGET,
  INSPECTION_SUBMISSION_SCORE_PCT,
} from '../shared/validation/enterprise-field-limits.js';
import { INSPECTION_ASSIGNMENT_STATUS_KEYS } from '../shared/enums/inspection-assignment-status.js';
import { EXAM_LIFECYCLE_KEYS } from '../shared/enums/exam-lifecycle.js';
import { CERTIFICATE_STATUS_KEYS } from '../shared/enums/certificate-status.js';
import { EXAM_QUESTION_TYPE_KEYS } from '../shared/enums/exam-question-type.js';
import { EXAM_ATTEMPT_STATUS_KEYS } from '../shared/enums/exam-attempt-status.js';
import { USER_ACCOUNT_STATUS_KEYS } from '../shared/enums/user-account-status.js';

const ASSIGNMENT_STATUS_SET = new Set([...INSPECTION_ASSIGNMENT_STATUS_KEYS]);

/**
 * When both bounds are non-empty strings, ensure parseable ISO-ish dates and start <= end.
 * @param {import('zod').RefinementCtx} ctx
 * @param {unknown} startRaw
 * @param {unknown} endRaw
 * @param {'startDate' | 'endDate'} startPath
 * @param {'startDate' | 'endDate'} endPath
 */
function refineOptionalReportDateRange(ctx, startRaw, endRaw, startPath, endPath) {
  const s = typeof startRaw === 'string' && startRaw.trim() ? startRaw.trim() : '';
  const e = typeof endRaw === 'string' && endRaw.trim() ? endRaw.trim() : '';
  if (!s || !e) return;
  const a = Date.parse(s);
  const b = Date.parse(e);
  if (Number.isNaN(a)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid startDate', path: [startPath] });
    return;
  }
  if (Number.isNaN(b)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid endDate', path: [endPath] });
    return;
  }
  if (a > b) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startDate must be on or before endDate',
      path: [endPath],
    });
  }
}

const templateItemOptionSchema = z
  .object({
    optionKey: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(200),
  })
  .strict();

const templateItemSchema = z
  .object({
    itemKey: z.string().trim().min(1).max(120),
    type: z.enum([
      'checklist',
      'text',
      'number',
      'date',
      'photo_required',
      'signature',
      'dropdown',
      'checkbox',
      'rating',
      'gps',
    ]),
    label: z.string().trim().min(1).max(200),
    helperText: z.string().trim().max(500).nullable().optional(),
    required: z.boolean().optional(),
    options: z.array(templateItemOptionSchema).optional(),
    validation: z
      .object({
        min: z.number().nullable().optional(),
        max: z.number().nullable().optional(),
        pattern: z.string().max(200).nullable().optional(),
      })
      .strict()
      .optional(),
    sortOrder: z.number().int().optional(),
  })
  .strict();

const templateSectionSchema = z
  .object({
    sectionKey: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    sortOrder: z.number().int().optional(),
    items: z.array(templateItemSchema).default([]),
  })
  .strict();

export const idParamSchema = z.object({
  id: objectIdString,
});

export const examIdParamSchema = z.object({
  examId: objectIdString,
});

export const examQuestionParamsSchema = z.object({
  examId: objectIdString,
  questionId: objectIdString,
});

const EXAM_ATTEMPT_STATUS_SET = new Set([...EXAM_ATTEMPT_STATUS_KEYS]);
const USER_STATUS_SET = new Set([...USER_ACCOUNT_STATUS_KEYS]);

const examQuestionOptionSchema = z
  .object({
    optionKey: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(2000),
  })
  .strict();

export const listTemplatesQuerySchema = extendListQuery({
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export const createTemplateBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).nullable().optional(),
    location: z.string().trim().max(400).nullable().optional(),
    /** Legacy client alias for `location`. */
    inspectionLocation: z.string().trim().max(400).nullable().optional(),
    isActive: z.boolean().optional(),
    sections: z.array(templateSectionSchema).default([]),
  })
  .strict();

export const patchTemplateBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    location: z.string().trim().max(400).nullable().optional(),
    /** Legacy client alias for `location`. */
    inspectionLocation: z.string().trim().max(400).nullable().optional(),
    isActive: z.boolean().optional(),
    sections: z.array(templateSectionSchema).optional(),
  })
  .strict();

export const listAssignmentsQuerySchema = extendListQuery({
  status: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || ASSIGNMENT_STATUS_SET.has(v), { message: 'Invalid status' }),
  inspectorUserId: objectIdString.optional(),
  templateId: objectIdString.optional(),
  decreeId: objectIdString.optional(),
  region: z.string().trim().max(120).optional(),
});

export const createAssignmentBodySchema = z
  .object({
    templateId: objectIdString.optional(),
    /** Alias for `templateId` (form builder). */
    formId: objectIdString.optional(),
    decreeId: objectIdString,
    decreeVersionId: objectIdString,
    inspectorUserId: objectIdString.optional(),
    inspectorIds: z.array(objectIdString).min(1).max(80).optional(),
    dueAt: z.union([z.string(), z.date()]).optional(),
    /** Alias for `dueAt`. */
    deadline: z.union([z.string(), z.date()]).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    notes: z.string().trim().max(8000).nullable().optional(),
    /** Alias for `notes`. */
    instructions: z.string().trim().max(8000).nullable().optional(),
    /** When set, overrides the template location for this assignment. */
    location: z.string().trim().max(400).nullable().optional(),
    region: z.string().trim().max(120).nullable().optional(),
    assignedByUserId: objectIdString.nullable().optional(),
  })
  .strict()
  .refine((b) => Boolean(b.templateId || b.formId), {
    message: 'templateId or formId is required',
    path: ['templateId'],
  })
  .refine((b) => Boolean(b.inspectorUserId || (b.inspectorIds && b.inspectorIds.length)), {
    message: 'inspectorUserId or inspectorIds is required',
    path: ['inspectorUserId'],
  });

export const patchAssignmentBodySchema = z
  .object({
    dueAt: optionalScheduleDateNullablePatch,
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    notes: z.string().trim().max(8000).nullable().optional(),
    location: z.string().trim().max(400).nullable().optional(),
    region: z.string().trim().max(120).nullable().optional(),
    inspectorUserId: objectIdString.optional(),
  })
  .strict();

export const listSubmissionsQuerySchema = extendListQuery({
  assignmentId: objectIdString.optional(),
  assignmentStatus: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || ASSIGNMENT_STATUS_SET.has(v), { message: 'Invalid assignmentStatus' }),
  submissionKind: z.enum(['autosave_draft', 'manual_draft', 'final']).optional(),
});

export const returnSubmissionBodySchema = z
  .object({
    notes: z.string().trim().min(1).max(8000),
    score: z
      .number()
      .finite()
      .min(INSPECTION_SUBMISSION_SCORE_PCT.MIN)
      .max(INSPECTION_SUBMISSION_SCORE_PCT.MAX)
      .nullable()
      .optional(),
    reviewerUserId: objectIdString.nullable().optional(),
    /** When set, updates the assignment due date together with the return transition. */
    extendDueAt: optionalScheduleDateNullablePatch,
  })
  .strict();

export const finalizeSubmissionBodySchema = z
  .object({
    comment: z.string().trim().max(8000).nullable().optional(),
    score: z
      .number()
      .finite()
      .min(INSPECTION_SUBMISSION_SCORE_PCT.MIN)
      .max(INSPECTION_SUBMISSION_SCORE_PCT.MAX)
      .nullable()
      .optional(),
    reviewerUserId: objectIdString.nullable().optional(),
  })
  .strict();

export const listExamsQuerySchema = extendListQuery({
  status: z.enum([...EXAM_LIFECYCLE_KEYS]).optional(),
  decreeCategoryId: objectIdString.optional(),
});

const examPassingScoreField = z
  .number()
  .finite()
  .min(EXAM_PASSING_SCORE_PCT.MIN)
  .max(EXAM_PASSING_SCORE_PCT.MAX)
  .nullable()
  .optional();

const examMaxScoreField = z
  .number()
  .finite()
  .min(EXAM_TOTAL_POINTS_BUDGET.MIN)
  .max(EXAM_TOTAL_POINTS_BUDGET.MAX)
  .nullable()
  .optional();

const examTimeLimitField = z
  .number()
  .int()
  .finite()
  .min(EXAM_TIME_LIMIT_MINUTES.MIN)
  .max(EXAM_TIME_LIMIT_MINUTES.MAX)
  .nullable()
  .optional();

export const createExamBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(8000).nullable().optional(),
    decreeCategoryId: objectIdString.nullable().optional(),
    /** Same slug as DUD categories; used when the ObjectId is unknown to older clients. */
    decreeCategoryName: z.string().trim().min(1).max(200).nullable().optional(),
    audienceRoleKeys: z.array(z.string().trim().max(64)).optional(),
    scheduledOpensAt: optionalScheduleDateNullable,
    scheduledClosesAt: optionalScheduleDateNullable,
    passingScore: examPassingScoreField,
    maxScore: examMaxScoreField,
    timeLimitMinutes: examTimeLimitField,
    randomizeQuestions: z.boolean().optional(),
    randomizeOptions: z.boolean().optional(),
    createdByUserId: objectIdString.nullable().optional(),
    /** Mobile alias: `draft` | `published` | `archived` (maps to DRAFT / OPEN / CLOSED). */
    catalogStatus: z.enum(['draft', 'published', 'archived']).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const toDate = (v) => {
      if (v === undefined || v === null) return null;
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const o = toDate(data.scheduledOpensAt);
    const c = toDate(data.scheduledClosesAt);
    if (o && c && o.getTime() > c.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'scheduledOpensAt must be on or before scheduledClosesAt',
        path: ['scheduledClosesAt'],
      });
    }
  });

export const patchExamBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(8000).nullable().optional(),
    status: z.enum([...EXAM_LIFECYCLE_KEYS]).optional(),
    decreeCategoryId: objectIdString.nullable().optional(),
    decreeCategoryName: z.string().trim().min(1).max(200).nullable().optional(),
    audienceRoleKeys: z.array(z.string().trim().max(64)).optional(),
    scheduledOpensAt: optionalScheduleDateNullablePatch,
    scheduledClosesAt: optionalScheduleDateNullablePatch,
    passingScore: examPassingScoreField,
    maxScore: examMaxScoreField,
    timeLimitMinutes: examTimeLimitField,
    randomizeQuestions: z.boolean().optional(),
    randomizeOptions: z.boolean().optional(),
    updatedByUserId: objectIdString.nullable().optional(),
    catalogStatus: z.enum(['draft', 'published', 'archived']).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const toDate = (v) => {
      if (v === undefined || v === null) return null;
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const o = toDate(data.scheduledOpensAt);
    const c = toDate(data.scheduledClosesAt);
    if (o && c && o.getTime() > c.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'scheduledOpensAt must be on or before scheduledClosesAt',
        path: ['scheduledClosesAt'],
      });
    }
  });

export const listCertificatesQuerySchema = extendListQuery({
  status: z.enum([...CERTIFICATE_STATUS_KEYS]).optional(),
  holderUserId: objectIdString.optional(),
  /** Free-text holder filter: matches displayName or email (case-insensitive). */
  holderName: z.string().trim().min(1).max(200).optional(),
});

export const revokeCertificateBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(2000),
    revokedByUserId: objectIdString.nullable().optional(),
  })
  .strict();

export const listExamAttemptsQuerySchema = extendListQuery({
  examId: objectIdString.optional(),
  status: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || EXAM_ATTEMPT_STATUS_SET.has(v), { message: 'Invalid attempt status' }),
});

export const listInspectorsQuerySchema = extendListQuery({
  status: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || USER_STATUS_SET.has(v), { message: 'Invalid user status' }),
});

export const patchInspectorBodySchema = z
  .object({
    status: z.enum(['active', 'suspended']).optional(),
  })
  .strict();

export const listOperationalReportsQuerySchema = extendListQuery({});

export const implementationReportQuerySchema = z
  .object({
    decreeId: objectIdString.optional(),
    categoryId: objectIdString.optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    region: z.string().trim().max(200).optional(),
  })
  .strict()
  .superRefine((q, ctx) => refineOptionalReportDateRange(ctx, q.startDate, q.endDate, 'startDate', 'endDate'));

export const inspectorPerformanceReportQuerySchema = z
  .object({
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
  })
  .strict()
  .superRefine((q, ctx) => refineOptionalReportDateRange(ctx, q.startDate, q.endDate, 'startDate', 'endDate'));

export const exportReportsCsvQuerySchema = z
  .object({
    type: z.enum(['inspection_summary', 'implementation_audit', 'certification_registry', 'evaluation_performance']),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    region: z.string().trim().max(200).optional(),
    anonymize: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  })
  .strict()
  .superRefine((q, ctx) => refineOptionalReportDateRange(ctx, q.startDate, q.endDate, 'startDate', 'endDate'));

const AFG_ZONE_KEYS = [
  'central',
  'western',
  'south_western',
  'south_eastern',
  'eastern',
  'northern',
  'north_eastern',
  'central_highlands',
];

export const zoneKeyParamSchema = z
  .object({
    zoneKey: z.enum(AFG_ZONE_KEYS),
  })
  .strict();

export const trackingQuerySchema = z
  .object({
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    incidentThreshold: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v === undefined ? undefined : Number(v)))
      .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0 && v <= 100), {
        message: 'incidentThreshold must be between 0 and 100',
      }),
  })
  .strict()
  .superRefine((q, ctx) => refineOptionalReportDateRange(ctx, q.startDate, q.endDate, 'startDate', 'endDate'));

const manualEssayGradeRowSchema = z
  .object({
    questionId: objectIdString,
    manualGradedPoints: z
      .number()
      .finite()
      .min(EXAM_QUESTION_POINTS.MIN)
      .max(EXAM_QUESTION_POINTS.MAX),
    graderComment: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

export const gradeExamAttemptBodySchema = z
  .object({
    grades: z.array(manualEssayGradeRowSchema).min(1),
  })
  .strict();

export const createExamQuestionBodySchema = z
  .object({
    type: z.enum([...EXAM_QUESTION_TYPE_KEYS]),
    stem: z.string().trim().min(1).max(8000),
    explanation: z.string().trim().max(8000).nullable().optional(),
    options: z.array(examQuestionOptionSchema).optional(),
    correctOptionKeys: z.array(z.string().trim().min(1).max(120)).optional(),
    correctBoolean: z.boolean().nullable().optional(),
    correctTextNormalized: z.string().trim().max(2000).nullable().optional(),
    points: z
      .number()
      .finite()
      .min(EXAM_QUESTION_POINTS.MIN)
      .max(EXAM_QUESTION_POINTS.MAX)
      .optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    createdByUserId: objectIdString.nullable().optional(),
  })
  .strict();

export const patchExamQuestionBodySchema = z
  .object({
    type: z.enum([...EXAM_QUESTION_TYPE_KEYS]).optional(),
    stem: z.string().trim().min(1).max(8000).optional(),
    explanation: z.string().trim().max(8000).nullable().optional(),
    options: z.array(examQuestionOptionSchema).optional(),
    correctOptionKeys: z.array(z.string().trim().min(1).max(120)).optional(),
    correctBoolean: z.boolean().nullable().optional(),
    correctTextNormalized: z.string().trim().max(2000).nullable().optional(),
    points: z
      .number()
      .finite()
      .min(EXAM_QUESTION_POINTS.MIN)
      .max(EXAM_QUESTION_POINTS.MAX)
      .optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    updatedByUserId: objectIdString.nullable().optional(),
  })
  .strict();

export const listQuestionBankQuerySchema = extendListQuery({
  /** When omitted, all bank questions (admin use). */
  decreeCategoryId: objectIdString.optional(),
});

export const createQuestionBankEntryBodySchema = z
  .object({
    decreeCategoryId: objectIdString,
    type: z.enum([...EXAM_QUESTION_TYPE_KEYS]),
    stem: z.string().trim().min(1).max(8000),
    explanation: z.string().trim().max(8000).nullable().optional(),
    options: z.array(examQuestionOptionSchema).optional(),
    correctOptionKeys: z.array(z.string().trim().min(1).max(120)).optional(),
    correctBoolean: z.boolean().nullable().optional(),
    correctTextNormalized: z.string().trim().max(2000).nullable().optional(),
    points: z
      .number()
      .finite()
      .min(EXAM_QUESTION_POINTS.MIN)
      .max(EXAM_QUESTION_POINTS.MAX)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const patchQuestionBankBodySchema = z
  .object({
    decreeCategoryId: objectIdString.optional(),
    type: z.enum([...EXAM_QUESTION_TYPE_KEYS]).optional(),
    stem: z.string().trim().min(1).max(8000).optional(),
    explanation: z.string().trim().max(8000).nullable().optional(),
    options: z.array(examQuestionOptionSchema).optional(),
    correctOptionKeys: z.array(z.string().trim().min(1).max(120)).optional(),
    correctBoolean: z.boolean().nullable().optional(),
    correctTextNormalized: z.string().trim().max(2000).nullable().optional(),
    points: z
      .number()
      .finite()
      .min(EXAM_QUESTION_POINTS.MIN)
      .max(EXAM_QUESTION_POINTS.MAX)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const questionBankIdParamSchema = z.object({
  id: objectIdString,
});

export const cloneBankQuestionsToExamBodySchema = z
  .object({
    bankQuestionIds: z.array(objectIdString).min(1).max(200),
  })
  .strict();
