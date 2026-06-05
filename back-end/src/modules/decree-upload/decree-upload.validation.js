import { z } from 'zod';
import { extendListQuery } from '../shared/query/list-query.schema.js';
import { DECREE_LIFECYCLE_KEYS } from '../shared/enums/decree-lifecycle.js';
import { DECREE_VERSION_PUBLICATION_KEYS } from '../shared/enums/decree-version-publication.js';

const objectIdString = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

/** Keep only keys `localizedBlockSchema` validates (drops list stubs like `hasTitle` / `hasBody`). */
function pickLocalizedBlockShape(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  const o = /** @type {Record<string, unknown>} */ (v);
  const out = { locale: o.locale };
  if ('title' in o) out.title = o.title;
  if ('bodyRich' in o) out.bodyRich = o.bodyRich;
  if ('bodyPlain' in o) out.bodyPlain = o.bodyPlain;
  return out;
}

/** Keep only keys `versionSectionSchema` validates. */
function pickVersionSectionShape(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  const o = /** @type {Record<string, unknown>} */ (v);
  const out = {};
  if ('key' in o) out.key = o.key;
  if ('title' in o) out.title = o.title;
  if ('bodyRich' in o) out.bodyRich = o.bodyRich;
  if ('sortOrder' in o) out.sortOrder = o.sortOrder;
  return out;
}

/** Keep only keys allowed on create/patch draft version payloads. */
function pickDecreeVersionDraftShape(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  const o = /** @type {Record<string, unknown>} */ (v);
  const out = {};
  if ('changeSummary' in o) out.changeSummary = o.changeSummary;
  if ('localizedContent' in o) out.localizedContent = o.localizedContent;
  if ('sections' in o) out.sections = o.sections;
  if ('effectiveFrom' in o) out.effectiveFrom = o.effectiveFrom;
  if ('effectiveTo' in o) out.effectiveTo = o.effectiveTo;
  return out;
}

/** Only documented POST /decrees keys — drops anything else before validation (avoids strict `unrecognized_keys`). */
const CREATE_DECREE_ROOT_KEYS = [
  'titlePs',
  'titleFa',
  'titleEn',
  'titleSummary',
  'initialPublication',
  'categoryIds',
  'tagKeys',
  'visibility',
  'tenantId',
  'creationDate',
  'metadata',
  'initialVersion',
];

function pickCreateDecreeBodyRoot(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  const o = /** @type {Record<string, unknown>} */ (v);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of CREATE_DECREE_ROOT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
  }
  return out;
}

/** Accepts string / number / null from JSON; rejects objects. Coerces finite numbers to string (avoids full-body Zod failure). */
const tenantIdSchema = z.preprocess((v) => {
  if (v === null) return null;
  if (v === undefined || v === '') return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
  if (typeof v === 'string') {
    const t = v.trim().slice(0, 120);
    return t === '' ? undefined : t;
  }
  return undefined;
}, z.union([z.string().max(120), z.null()]).optional());

/** Whitelist keys first so list stubs (`hasTitle`, …) never fail nested object parsing. */
const localizedBlockSchema = z.preprocess(
  pickLocalizedBlockShape,
  z.object({
    locale: z.string().trim().min(2).max(16),
    title: z.string().trim().max(500).nullable().optional(),
    bodyRich: z.string().max(2_000_000).nullable().optional(),
    bodyPlain: z.string().max(2_000_000).nullable().optional(),
  }),
);

/** Accepts missing / null / string from JSON; normalizes to trimmed string (max 500). */
const decreeTitleField = z.preprocess((v) => {
  if (v == null) return '';
  return String(v).trim().slice(0, 500);
}, z.string().max(500));

const versionSectionSchema = z.preprocess(
  pickVersionSectionShape,
  z.object({
    key: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(500),
    bodyRich: z.string().max(2_000_000).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
  }),
);

const decreeVersionDraftObjectSchema = z.object({
  changeSummary: z.string().trim().max(2000).nullable().optional(),
  localizedContent: z.array(localizedBlockSchema).max(50).optional(),
  sections: z.array(versionSectionSchema).max(500).optional(),
  effectiveFrom: z.coerce.date().nullable().optional(),
  effectiveTo: z.coerce.date().nullable().optional(),
});

export const categoryIdParamsSchema = z.object({
  id: objectIdString,
});

export const decreeIdParamsSchema = z.object({
  id: objectIdString,
});

export const listCategoriesQuerySchema = extendListQuery({
  isActive: z.enum(['true', 'false']).optional(),
  parentCategoryId: z.union([objectIdString, z.literal('null')]).optional(),
  tenantId: tenantIdSchema,
});

export const createCategoryBodySchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i),
  name: z.string().trim().min(1).max(200),
  namePs: z.string().trim().max(200).nullable().optional(),
  nameFa: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  parentCategoryId: objectIdString.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isActive: z.boolean().optional(),
  tenantId: tenantIdSchema,
});

export const patchCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  namePs: z.string().trim().max(200).nullable().optional(),
  nameFa: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  parentCategoryId: objectIdString.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isActive: z.boolean().optional(),
});

export const listDecreesQuerySchema = extendListQuery({
  tenantId: tenantIdSchema,
  status: z.enum([...DECREE_LIFECYCLE_KEYS]).optional(),
  categoryId: objectIdString.optional(),
  tagKey: z.string().trim().max(64).optional(),
  visibility: z.enum(['public', 'internal']).optional(),
  dateField: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'creationDate']).optional(),
  departmentCode: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const u = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return u.length ? u : undefined;
    }),
});

const createDecreeBodyObjectSchema = z
  .object({
    /** Trilingual titles (preferred). */
    titlePs: decreeTitleField,
    titleFa: decreeTitleField,
    titleEn: decreeTitleField,
    /** Legacy single title — copied into all three slots when trilingual fields are empty. */
    titleSummary: decreeTitleField,
    /** `draft` | `pending` = not public; `published` = create then publish in one step. */
    initialPublication: z.enum(['draft', 'pending', 'published']).default('draft'),
    categoryIds: z.array(objectIdString).min(1).max(50),
    tagKeys: z.array(z.string().trim().max(64)).max(50).optional(),
    visibility: z.enum(['public', 'internal']).optional(),
    tenantId: tenantIdSchema,
    /** User-provided creation/issuance date (distinct from upload timestamp `createdAt`). */
    creationDate: z.coerce.date().nullable().optional(),
    metadata: z.preprocess(
      (v) => {
        if (v === null || v === undefined || v === '') return undefined;
        if (typeof v === 'string') {
          try {
            const parsed = JSON.parse(v);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
          } catch {
            return undefined;
          }
          return undefined;
        }
        return v;
      },
      z.record(z.unknown()).optional(),
    ),
    initialVersion: z.preprocess(
      (v) => (v === null || v === undefined ? undefined : pickDecreeVersionDraftShape(v)),
      decreeVersionDraftObjectSchema.optional(),
    ),
  })
  .superRefine((data, ctx) => {
    const legacy = String(data.titleSummary ?? '').trim();
    const ps = String(data.titlePs ?? '').trim();
    const fa = String(data.titleFa ?? '').trim();
    const en = String(data.titleEn ?? '').trim();
    const hasTri = ps.length > 0 && fa.length > 0 && en.length > 0;
    const hasLegacy = legacy.length > 0;
    if (!hasTri && !hasLegacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['titleEn'],
        message: 'Provide Pashto, Dari, and English titles, or a legacy titleSummary.',
      });
    }
  });

export const createDecreeBodySchema = z.preprocess(pickCreateDecreeBodyRoot, createDecreeBodyObjectSchema);

export const patchDecreeBodySchema = z.object({
  titlePs: z.string().trim().min(1).max(500).optional(),
  titleFa: z.string().trim().min(1).max(500).optional(),
  titleEn: z.string().trim().min(1).max(500).optional(),
  titleSummary: z.string().trim().min(1).max(500).optional(),
  categoryIds: z.array(objectIdString).max(50).optional(),
  tagKeys: z.array(z.string().trim().max(64)).max(50).optional(),
  visibility: z.enum(['public', 'internal']).optional(),
  metadata: z.record(z.unknown()).optional(),
  decreeNumber: z.string().trim().min(1).max(120).optional(),
  /** When `true` and the decree is a draft, publish the current draft version after other updates. */
  publish: z.boolean().optional(),
  /**
   * Updates the working draft: initial draft (`status=draft`) or amendment draft
   * (`status=active` with `activeDraftVersionId`).
   */
  draftVersion: z.preprocess(
    (v) => (v === null || v === undefined ? undefined : pickDecreeVersionDraftShape(v)),
    decreeVersionDraftObjectSchema.optional(),
  ),
});

export const publishDecreeBodySchema = z.object({
  versionId: objectIdString.optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().nullable().optional(),
});

export const archiveDecreeBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const supersedeDecreeBodySchema = z.object({
  supersedingDecreeId: objectIdString,
  reason: z.string().trim().max(500).optional(),
});

export const createAmendmentBodySchema = z.object({
  changeSummary: z.string().trim().max(2000).nullable().optional(),
  copyFromVersionId: objectIdString.optional(),
  localizedContent: z.array(localizedBlockSchema).max(50).optional(),
  sections: z.array(versionSectionSchema).max(500).optional(),
  effectiveFrom: z.coerce.date().nullable().optional(),
  effectiveTo: z.coerce.date().nullable().optional(),
});

export const listVersionsQuerySchema = z.object({
  publicationStatus: z.enum([...DECREE_VERSION_PUBLICATION_KEYS]).optional(),
});

export const nextDecreeNumberQuerySchema = z.object({
  categoryId: objectIdString,
  tenantId: tenantIdSchema,
});

export const abandonAmendmentDraftBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const decreeAndVersionParamsSchema = z.object({
  id: objectIdString,
  versionId: objectIdString,
});

/* ---------------- Dept Upload Settings ---------------- */

const deptCodeLike = z
  .string()
  .trim()
  .min(1)
  .max(10)
  .transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  .pipe(z.string().regex(/^[A-Z0-9]{1,10}$/, 'Use 1–10 letters or digits only (no spaces)'));

export const patchDeptUploadSettingsBodySchema = z.object({
  department: z
    .object({
      deptName: z.string().trim().min(1).max(200).optional(),
      deptCode: deptCodeLike.optional(),
      refPrefix: deptCodeLike.optional(),
      contactEmail: z.string().trim().email().max(200).optional(),
    })
    .optional(),
  system: z
    .object({
      sessionTimeoutMinutes: z.coerce.number().int().min(15).max(120).optional(),
      sequenceYearlyReset: z.boolean().optional(),
      interfaceLanguage: z.enum(['en', 'fa', 'ps']).optional(),
      timezone: z.literal('Asia/Kabul').optional(),
      dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
    })
    .optional(),
  notifications: z
    .object({
      push: z
        .object({
          enabled: z.boolean().optional(),
          newUploads: z.boolean().optional(),
          statusChanges: z.boolean().optional(),
          systemAlerts: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  storage: z
    .object({
      autoBackup: z.boolean().optional(),
      backupFreq: z.enum(['daily', 'weekly', 'monthly']).optional(),
      retentionDays: z.coerce.number().int().min(1).max(3650).optional(),
      destination: z.enum(['local', 'cloud', 'both']).optional(),
      autoDeleteRejected: z.boolean().optional(),
      deleteAfterDays: z.coerce.number().int().min(1).max(3650).optional(),
    })
    .optional(),
});
