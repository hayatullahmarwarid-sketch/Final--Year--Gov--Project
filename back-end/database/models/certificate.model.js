import mongoose from 'mongoose';
import { CERTIFICATE_STATUS_KEYS } from '../../src/modules/shared/enums/certificate-status.js';
import { CERTIFICATE_KIND_KEYS } from '../../src/modules/shared/enums/certificate-kind.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const certificateSchema = new Schema(
  {
    certificateNumber: { type: String, required: true, trim: true },

    holderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    kind: { type: String, required: true, enum: [...CERTIFICATE_KIND_KEYS], index: true },

    status: {
      type: String,
      required: true,
      enum: [...CERTIFICATE_STATUS_KEYS],
      default: 'issued',
      index: true,
    },

    sourceExamId: { type: Schema.Types.ObjectId, ref: 'Exam', default: null, index: true },
    sourceExamAttemptId: { type: Schema.Types.ObjectId, ref: 'ExamAttempt', default: null, index: true },

    sourceDecreeId: { type: Schema.Types.ObjectId, ref: 'Decree', default: null, index: true },
    sourceDecreeVersionId: { type: Schema.Types.ObjectId, ref: 'DecreeVersion', default: null, index: true },

    issuedAt: { type: Date, required: true, default: () => new Date(), index: true },
    revokedAt: { type: Date, default: null, index: true },
    revokeReason: { type: String, trim: true, default: null },

    pdfFileId: { type: Schema.Types.ObjectId, ref: 'StoredFile', default: null, index: true },

    metadata: { type: Schema.Types.Mixed, default: undefined },

    issuedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    revokedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'certificates' },
);

certificateSchema.plugin(standardDomainPlugin);

certificateSchema.index({ tenantId: 1, certificateNumber: 1 }, { unique: true });
certificateSchema.index({ holderUserId: 1, status: 1, issuedAt: -1 });
certificateSchema.index({ kind: 1, status: 1, issuedAt: -1 });
certificateSchema.index({ tenantId: 1, holderUserId: 1, isDeleted: 1, status: 1 });

export const CertificateModel =
  mongoose.models.Certificate ?? mongoose.model('Certificate', certificateSchema);
