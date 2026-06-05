import { z } from 'zod';
import { listQueryBaseObjectSchema, normalizeListLimit } from '../shared/query/list-query.schema.js';
import { STORED_ENTITY_TYPE_KEYS } from '../shared/constants/stored-entity-type.js';
import { STORED_FILE_PURPOSE_KEYS } from '../shared/constants/stored-file-purpose.js';

const objectIdString = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

const tenantIdSchema = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .optional()
  .transform((v) => (v === '' ? undefined : v));

/** Provider slug (ImageKit, s3, none, …) — keep as string for forward-compatible providers. */
export const storedFileProviderSchema = z.string().trim().min(1).max(64);

const storedFileBodyObjectSchema = z
  .object({
    originalName: z.string().trim().min(1).max(500),
    mimeType: z.string().trim().min(1).max(200),
    /** Reject absurd metadata (actual upload limits enforced by route/storage). */
    size: z.coerce.number().int().min(0).max(100 * 1024 * 1024),
    provider: storedFileProviderSchema,
    providerFileId: z.string().trim().min(1).max(1024),
    url: z.string().trim().max(2048).nullable().optional(),
    folder: z.string().trim().max(500).nullable().optional(),
    purpose: z.enum([...STORED_FILE_PURPOSE_KEYS]),
    linkedEntityType: z.enum([...STORED_ENTITY_TYPE_KEYS]).nullable().optional(),
    linkedEntityId: objectIdString.nullable().optional(),
    tenantId: tenantIdSchema,
    uploadedBy: objectIdString.nullable().optional(),
  })
  .strict();

export const createStoredFileBodySchema = storedFileBodyObjectSchema.superRefine((b, ctx) => {
  const hasT = Boolean(b.linkedEntityType);
  const hasId = Boolean(b.linkedEntityId);
  if (hasT !== hasId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'linkedEntityType and linkedEntityId must both be set or both omitted',
      path: hasT ? ['linkedEntityId'] : ['linkedEntityType'],
    });
  }
});

const listStoredFilesQueryObjectSchema = listQueryBaseObjectSchema
  .extend({
    tenantId: tenantIdSchema,
    provider: z.string().trim().max(64).optional(),
    purpose: z.string().trim().max(64).optional(),
    folder: z.string().trim().max(500).optional(),
    linkedEntityType: z.enum([...STORED_ENTITY_TYPE_KEYS]).optional(),
    linkedEntityId: objectIdString.optional(),
    uploadedBy: objectIdString.optional(),
  })
  .superRefine((q, ctx) => {
    if (q.linkedEntityId && !q.linkedEntityType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'linkedEntityType is required when linkedEntityId is set',
        path: ['linkedEntityType'],
      });
    }
  });

export const listStoredFilesQuerySchema = listStoredFilesQueryObjectSchema.transform(normalizeListLimit);

export const storedFileIdParamsSchema = z.object({
  id: objectIdString,
});
