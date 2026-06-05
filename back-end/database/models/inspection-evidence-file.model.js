import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const inspectionEvidenceFileSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'InspectionAssignment', required: true, index: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'InspectionSubmission', default: null, index: true },

    fileId: { type: Schema.Types.ObjectId, ref: 'StoredFile', required: true },

    caption: { type: String, trim: true, default: null },
    capturedAt: { type: Date, default: null, index: true },

    itemKey: { type: String, trim: true, default: null, index: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'inspection_evidence_files' },
);

inspectionEvidenceFileSchema.plugin(standardDomainPlugin);

inspectionEvidenceFileSchema.index({ assignmentId: 1, submissionId: 1, createdAt: -1 });
inspectionEvidenceFileSchema.index({ fileId: 1 });
inspectionEvidenceFileSchema.index({ tenantId: 1, assignmentId: 1, isDeleted: 1 });

export const InspectionEvidenceFileModel =
  mongoose.models.InspectionEvidenceFile ??
  mongoose.model('InspectionEvidenceFile', inspectionEvidenceFileSchema);
