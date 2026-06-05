import { z } from 'zod';
import { extendListQuery } from '../shared/query/list-query.schema.js';
import { objectIdString } from '../shared/validation/zod-helpers.js';
import { DECREE_LIFECYCLE_KEYS } from '../shared/enums/decree-lifecycle.js';
import { EXAM_LIFECYCLE_KEYS } from '../shared/enums/exam-lifecycle.js';
import { CERTIFICATE_STATUS_KEYS } from '../shared/enums/certificate-status.js';
import { CERTIFICATE_KIND_KEYS } from '../shared/enums/certificate-kind.js';

const DECREE_STATUS = z.enum([...DECREE_LIFECYCLE_KEYS]);
const EXAM_STATUS = z.enum([...EXAM_LIFECYCLE_KEYS]);
const CERT_STATUS = z.enum([...CERTIFICATE_STATUS_KEYS]);
const CERT_KIND = z.enum([...CERTIFICATE_KIND_KEYS]);

export const idParamSchema = z.object({ id: objectIdString });

export const publicDecreePdfQuerySchema = z.object({
  locale: z.enum(['ps', 'en', 'fa']).optional(),
});

export const listPublicDecreesQuerySchema = extendListQuery({
  categoryId: objectIdString.optional(),
  /** Full-text style keyword across decree number + title summary (alias of `search`). */
  keyword: z.string().trim().max(200).optional(),
  language: z.string().trim().min(2).max(16).optional(),
  status: DECREE_STATUS.optional(),
  /** Which field `from`/`to` should apply to (default: `publishedAt` for public catalog). */
  dateField: z.enum(['publishedAt', 'createdAt', 'creationDate']).optional(),
});

export const listPublicDecreeCategoriesQuerySchema = extendListQuery({});

export const listPublicBookmarksQuerySchema = extendListQuery({});

export const listPublicNotificationsQuerySchema = extendListQuery({});

export const listPublicExamsQuerySchema = extendListQuery({
  status: EXAM_STATUS.optional(),
  decreeCategoryId: objectIdString.optional(),
});

export const listPublicCertificatesQuerySchema = extendListQuery({
  status: CERT_STATUS.optional(),
  kind: CERT_KIND.optional(),
});

export const listPublicResultsQuerySchema = extendListQuery({});

export const createBookmarkBodySchema = z
  .object({
    decreeId: objectIdString,
  })
  .strict();

export const createExamAttemptBodySchema = z
  .object({
    examId: objectIdString,
    /** UI locale so question stems/options can be localized. */
    locale: z.enum(['ps', 'en', 'fa']).optional(),
  })
  .strict();

const answerSchema = z
  .object({
    questionId: objectIdString,
    selectedOptionKeys: z.array(z.string().trim().min(1)).optional(),
    booleanAnswer: z.boolean().nullable().optional(),
    textAnswer: z.string().max(8000).nullable().optional(),
  })
  .strict();

export const submitExamAttemptBodySchema = z
  .object({
    answers: z.array(answerSchema).min(1),
  })
  .strict();

export const patchExamAttemptBodySchema = z
  .object({
    answers: z.array(answerSchema).min(1),
  })
  .strict();

export const publicHomeQuerySchema = z.object({
  locale: z.string().trim().min(2).max(16).optional(),
});
