import { z } from 'zod';
import { extendListQuery } from '../shared/query/list-query.schema.js';
import { INSPECTION_ASSIGNMENT_STATUS_KEYS } from '../shared/enums/inspection-assignment-status.js';
import { objectIdString } from '../shared/validation/zod-helpers.js';

const ASSIGNMENT_STATUS_SET = new Set([...INSPECTION_ASSIGNMENT_STATUS_KEYS]);

const inspectionAnswerInputSchema = z
  .object({
    itemKey: z.string().trim().min(1).max(120),
    sectionKey: z.string().trim().min(1).max(120),
    valueText: z.union([z.string(), z.null()]).optional(),
    valueNumber: z.union([z.number(), z.null()]).optional(),
    valueBoolean: z.union([z.boolean(), z.null()]).optional(),
    valueDate: z.union([z.string(), z.number(), z.date(), z.null()]).optional(),
    selectedOptionKeys: z.array(z.string().trim().min(1)).optional(),
    evidenceFileIds: z.array(objectIdString).optional(),
  })
  .strict();

export const assignmentIdParamsSchema = z.object({
  id: objectIdString,
});

export const listInspectorAssignmentsQuerySchema = extendListQuery({
  status: z
    .string()
    .trim()
    .max(64)
    .optional()
    .refine((v) => v === undefined || v.length === 0 || ASSIGNMENT_STATUS_SET.has(v), {
      message: 'Invalid assignment status filter',
    }),
});

const clientRequestIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .optional();

export const saveDraftBodySchema = z
  .object({
    answers: z.array(inspectionAnswerInputSchema).default([]),
    submissionKind: z.enum(['autosave_draft', 'manual_draft']).default('manual_draft'),
    clientRequestId: clientRequestIdSchema,
  })
  .strict();

export const submitInspectionBodySchema = z
  .object({
    answers: z.array(inspectionAnswerInputSchema).min(0),
    clientRequestId: clientRequestIdSchema,
  })
  .strict();

export const attachEvidenceBodySchema = z
  .object({
    fileId: objectIdString,
    caption: z.string().trim().max(500).nullable().optional(),
    capturedAt: z.union([z.string(), z.number(), z.date(), z.null()]).optional(),
    itemKey: z.string().trim().max(120).nullable().optional(),
  })
  .strict();

export const syncStatusQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  includeFinalized: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
});

/**
 * Batch sync body (Phase 8). Each op is independent — the server returns a per-op result so
 * clients can reconcile their offline queue without a full retry. Use `lastKnownRevision` to
 * detect conflicts (server side has been updated by another device).
 */
export const offlineInspectionImportBodySchema = z
  .object({
    offlineId: z.string().trim().min(1).max(128),
    assignmentId: objectIdString,
    answers: z.array(inspectionAnswerInputSchema).default([]),
    photos: z.array(z.unknown()).optional(),
    signature: z.unknown().optional(),
    gps: z.unknown().optional(),
    submittedAt: z.union([z.string(), z.date()]).optional(),
  })
  .strict();

export const syncBatchBodySchema = z
  .object({
    ops: z
      .array(
        z
          .object({
            clientOpId: z.string().trim().min(1).max(128),
            assignmentId: objectIdString,
            kind: z.enum(['save_draft', 'submit']).default('save_draft'),
            answers: z.array(inspectionAnswerInputSchema).default([]),
            submissionKind: z.enum(['autosave_draft', 'manual_draft']).default('manual_draft'),
            lastKnownRevision: z.number().int().nonnegative().optional(),
            clientRequestId: clientRequestIdSchema,
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
