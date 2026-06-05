import mongoose from 'mongoose';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const inspectionAnswerSchema = new Schema(
  {
    itemKey: { type: String, trim: true, required: true },
    sectionKey: { type: String, trim: true, required: true },

    valueText: { type: String, default: null },
    valueNumber: { type: Number, default: null },
    valueBoolean: { type: Boolean, default: null },
    valueDate: { type: Date, default: null },
    selectedOptionKeys: { type: [String], default: undefined },

    evidenceFileIds: [{ type: Schema.Types.ObjectId, ref: 'StoredFile' }],
  },
  { _id: false },
);

const inspectionSubmissionSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'InspectionAssignment', required: true, index: true },

    revisionNumber: { type: Number, required: true, default: 1, min: 1 },

    submissionKind: {
      type: String,
      enum: ['autosave_draft', 'manual_draft', 'final'],
      default: 'final',
      index: true,
    },

    answers: { type: [inspectionAnswerSchema], default: [] },

    /**
     * Automatic audit score computed at submit-time from template + answer payloads.
     * This is NOT an admin review score; it's a machine-computed baseline to support
     * dashboard averages and initial "Audit Score" display before an admin reviews.
     */
    autoScore: { type: Number, default: null, min: 0, max: 100 },

    review: {
      type: new Schema(
        {
          reviewerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
          score: { type: Number, default: null },
          comment: { type: String, trim: true, default: null },
          reviewedAt: { type: Date, default: null },
        },
        { _id: false },
      ),
      default: undefined,
    },

    /** Denormalized for queries (mirror `review.reviewerUserId` when set). */
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    submittedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submittedAt: { type: Date, default: null, index: true },

    clientRequestId: { type: String, trim: true, default: null, index: true, sparse: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'inspection_submissions' },
);

inspectionSubmissionSchema.plugin(standardDomainPlugin);

inspectionSubmissionSchema.index({ assignmentId: 1, revisionNumber: 1 }, { unique: true });
inspectionSubmissionSchema.index({ assignmentId: 1, submissionKind: 1, updatedAt: -1 });
inspectionSubmissionSchema.index({ submittedByUserId: 1, submittedAt: -1 });
inspectionSubmissionSchema.index({ tenantId: 1, isDeleted: 1, assignmentId: 1 });
inspectionSubmissionSchema.index({ isDeleted: 1, createdAt: -1 });

export const InspectionSubmissionModel =
  mongoose.models.InspectionSubmission ??
  mongoose.model('InspectionSubmission', inspectionSubmissionSchema);
