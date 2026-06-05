import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

/**
 * File **metadata** only — binary bytes live with `provider` / `providerFileId` / `url`.
 * `linkedEntityType` + `linkedEntityId` attach this row to a domain aggregate when known
 * (decree, attachment row, evidence row, certificate, …). See `StoredEntityType`.
 */
const storedFileSchema = new Schema(
  {
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true, index: true },
    size: { type: Number, required: true, min: 0, index: true },

    /** Opaque provider id, e.g. ImageKit fileId, S3 key, or client-generated placeholder until upload completes. */
    provider: { type: String, required: true, trim: true, lowercase: true, index: true, maxlength: 64 },
    providerFileId: { type: String, required: true, trim: true, maxlength: 1024, index: true },

    /** Public or signed URL when available; optional for pre-upload metadata rows. */
    url: { type: String, trim: true, default: null, maxlength: 2048 },

    /** Logical folder/path prefix in the provider namespace (not necessarily a filesystem path). */
    folder: { type: String, trim: true, default: null, maxlength: 500, index: true },

    /**
     * SHA-256 of the original bytes, hex-encoded. Enables content-addressable dedup and integrity checks.
     * Nullable for legacy rows and pre-upload placeholders; sparsely indexed for O(1) dedup lookups.
     */
    sha256: { type: String, trim: true, default: null, index: true, sparse: true, maxlength: 64 },

    /** Populated for PDFs when page count was derived at upload time. */
    pdfPageCount: { type: Number, default: null, min: 0 },

    purpose: { type: String, required: true, trim: true, index: true, maxlength: 64 },

    linkedEntityType: { type: String, trim: true, default: null, index: true, maxlength: 64 },
    linkedEntityId: { type: Schema.Types.ObjectId, default: null, index: true },

    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'stored_files' },
);

storedFileSchema.plugin(standardDomainPlugin);

storedFileSchema.index(
  { tenantId: 1, provider: 1, providerFileId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      providerFileId: { $type: 'string', $gt: '' },
    },
  },
);
storedFileSchema.index({ uploadedBy: 1, createdAt: -1 });
storedFileSchema.index({ linkedEntityType: 1, linkedEntityId: 1, createdAt: -1 });
storedFileSchema.index({ tenantId: 1, isDeleted: 1, purpose: 1 });
// Dedup path: content-addressable lookup on (owner, sha256) within live rows.
storedFileSchema.index(
  { uploadedBy: 1, sha256: 1 },
  {
    partialFilterExpression: {
      isDeleted: false,
      sha256: { $type: 'string' },
    },
  },
);

export const StoredFileModel =
  mongoose.models.StoredFile ?? mongoose.model('StoredFile', storedFileSchema);
