import mongoose from 'mongoose';
import { DECREE_LIFECYCLE_KEYS } from '../../src/modules/shared/enums/decree-lifecycle.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

/**
 * Lineage root for a decree family. Mutable administrative fields and pointers;
 * authoritative legal text lives on {@link DecreeVersionModel} documents.
 */
const decreeSchema = new Schema(
  {
    /**
     * Display index within `numberingCategoryId` (e.g. 1, 2, 3 for “#1”, “#2”).
     * Null/legacy = decree numbers assigned before per-category auto-numbering.
     */
    categorySequence: { type: Number, default: null, index: true, sparse: true },
    /**
     * Category that defines the `#n` scope (the first `categoryIds` at upload time, or renumbered path).
     */
    numberingCategoryId: { type: Schema.Types.ObjectId, ref: 'DecreeCategory', default: null, index: true },

    /** Stable public identifier (per-category when `categorySequence` is set, else legacy e.g. D-…). */
    decreeNumber: { type: String, required: true, trim: true },
    /** Short label for dashboards/lists (denormalized; mirrors English title when trilingual titles exist). */
    titleSummary: { type: String, required: true, trim: true, maxlength: 500 },
    /** Independent display titles per language (Pashto / Dari / English). */
    titlePs: { type: String, trim: true, maxlength: 500, default: '' },
    titleFa: { type: String, trim: true, maxlength: 500, default: '' },
    titleEn: { type: String, trim: true, maxlength: 500, default: '' },

    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'DecreeCategory', index: true }],
    tagKeys: [{ type: String, trim: true, lowercase: true }],

    status: {
      type: String,
      required: true,
      enum: [...DECREE_LIFECYCLE_KEYS],
      default: 'draft',
      index: true,
    },

    /** Always the root decree `_id` for this lineage (self for originals). */
    lineageRootDecreeId: { type: Schema.Types.ObjectId, ref: 'Decree', required: true, index: true },

    /** Currently published immutable version (if any). */
    currentPublishedVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'DecreeVersion',
      default: null,
      index: true,
    },
    /** Editable working copy (draft amendment) — separate from published chain. */
    activeDraftVersionId: { type: Schema.Types.ObjectId, ref: 'DecreeVersion', default: null },

    /** When `status` is `superseded`, points at the replacing decree lineage root. */
    supersededByDecreeId: { type: Schema.Types.ObjectId, ref: 'Decree', default: null, index: true },

    /** Denormalized from the active published version for reporting filters. */
    effectiveFrom: { type: Date, default: null, index: true },
    effectiveTo: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null, index: true },
    lastAmendedAt: { type: Date, default: null, index: true },

    /**
     * **User-provided** document creation date (e.g., gazette/issuance date).
     * Distinct from `createdAt` (upload timestamp).
     */
    creationDate: { type: Date, default: null, index: true },

    visibility: {
      type: String,
      enum: ['public', 'internal'],
      default: 'public',
      index: true,
    },

    /** Tenant scope — required for multi-tenant deployments (nullable for single-tenant). */
    tenantId: { type: String, trim: true, default: null, index: true, sparse: true },

    /** Arbitrary domain metadata (source system ids, gazette page refs). */
    metadata: { type: Schema.Types.Mixed, default: undefined },

    /** Denormalized metadata completeness for mobile dashboards (recomputed on decree-upload write paths). */
    metadataCompleteness: {
      type: new Schema(
        {
          score: { type: Number, min: 0, max: 100, default: 0 },
          missingKeys: [{ type: String, trim: true }],
          evaluatedAt: { type: Date, default: null, index: true },
        },
        { _id: false },
      ),
      default: undefined,
    },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    /** Total public engagement views (one per qualified `decree_views` row, e.g. 30s read sessions). */
    viewCount: { type: Number, default: 0, min: 0, index: true },
    /** Total PDF download taps (not deduped per user). */
    downloadCount: { type: Number, default: 0, min: 0, index: true },
    /** Denormalized from primary PDF attachment metadata when available. */
    primaryPdfPageCount: { type: Number, default: null, min: 0 },
  },
  { timestamps: true, collection: 'decrees' },
);

decreeSchema.plugin(standardDomainPlugin, { withTenant: false });

decreeSchema.index({ status: 1, updatedAt: -1 });
decreeSchema.index({ lineageRootDecreeId: 1, status: 1 });
decreeSchema.index({ categoryIds: 1, status: 1, publishedAt: -1 });
decreeSchema.index({ tagKeys: 1, status: 1 });
/**
 * Legacy: tenant-wide unique `decreeNumber` (e.g. D-… before per-category #n).
 * `categorySequence: null` matches documents with the field null or missing (MongoDB query rules).
 * Do not use `$exists: false` here — partial indexes reject that shape (see CannotCreateIndex 67).
 */
decreeSchema.index(
  { tenantId: 1, decreeNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { categorySequence: null },
  },
);
/** Per category & tenant: one `#n` row (when using auto number). */
decreeSchema.index(
  { tenantId: 1, numberingCategoryId: 1, categorySequence: 1 },
  {
    unique: true,
    partialFilterExpression: { categorySequence: { $gt: 0 } },
  },
);
decreeSchema.index({ tenantId: 1, isDeleted: 1, status: 1, updatedAt: -1 });
/**
 * Full-text search for unified search (`SearchService` + `$text`).
 * If an older index `decrees_title_number_text` exists, drop it before syncIndexes in production.
 */
decreeSchema.index(
  { titleSummary: 'text', titlePs: 'text', titleFa: 'text', titleEn: 'text', decreeNumber: 'text' },
  { name: 'decrees_multilingual_title_text' },
);

export const DecreeModel = mongoose.models.Decree ?? mongoose.model('Decree', decreeSchema);
