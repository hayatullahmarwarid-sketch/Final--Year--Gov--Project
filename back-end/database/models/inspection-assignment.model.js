import mongoose from 'mongoose';
import { INSPECTION_ASSIGNMENT_STATUS_KEYS } from '../../src/modules/shared/enums/inspection-assignment-status.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const inspectionAssignmentSchema = new Schema(
  {
    templateId: { type: Schema.Types.ObjectId, ref: 'InspectionTemplate', required: true, index: true },
    templateRevisionSnapshot: { type: Number, required: true, min: 1 },

    decreeId: { type: Schema.Types.ObjectId, ref: 'Decree', required: true, index: true },
    decreeVersionId: { type: Schema.Types.ObjectId, ref: 'DecreeVersion', required: true, index: true },

    inspectorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    status: {
      type: String,
      required: true,
      enum: [...INSPECTION_ASSIGNMENT_STATUS_KEYS],
      default: 'assigned',
      index: true,
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },

    dueAt: { type: Date, default: null, index: true },
    /** Set true after a one-time "due in ~24h" reminder notification is created. */
    deadlineReminderSent: { type: Boolean, default: false, index: true },
    assignedAt: { type: Date, default: () => new Date(), index: true },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    finalizedAt: { type: Date, default: null },

    returnReason: { type: String, trim: true, default: null },
    revisionCount: { type: Number, default: 0, min: 0 },

    latestSubmissionId: { type: Schema.Types.ObjectId, ref: 'InspectionSubmission', default: null },

    notes: { type: String, trim: true, default: null },

    /** Geographic / jurisdictional scope for analytics and routing (SRS-aligned). */
    region: { type: String, trim: true, default: null, index: true },

    /** Human-readable inspection location (copied from template at assignment time). */
    location: { type: String, trim: true, default: null },

    /**
     * Denormalized reporting payload updated when an assignment is finalized.
     * Supports dashboards and exports without re-walking submission answers.
     */
    reporting: {
      type: new Schema(
        {
          finalizedSubmissionId: { type: Schema.Types.ObjectId, ref: 'InspectionSubmission', default: null },
          finalizedAt: { type: Date, default: null, index: true },
          implementationSignals: {
            type: new Schema(
              {
                answerCount: { type: Number, default: 0, min: 0 },
                sectionsTouchedCount: { type: Number, default: 0, min: 0 },
                evidenceFileCount: { type: Number, default: 0, min: 0 },
              },
              { _id: false },
            ),
            default: undefined,
          },
          reviewScore: { type: Number, default: null },
          reviewComment: { type: String, trim: true, default: null },
        },
        { _id: false },
      ),
      default: undefined,
    },

    tenantId: { type: String, trim: true, default: null, index: true, sparse: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'inspection_assignments' },
);

inspectionAssignmentSchema.plugin(standardDomainPlugin, { withTenant: false });

inspectionAssignmentSchema.index({ inspectorUserId: 1, status: 1, dueAt: 1 });
inspectionAssignmentSchema.index({ decreeId: 1, status: 1, updatedAt: -1 });
inspectionAssignmentSchema.index({ templateId: 1, status: 1 });
inspectionAssignmentSchema.index({ status: 1, dueAt: 1, priority: -1 });
inspectionAssignmentSchema.index({ tenantId: 1, inspectorUserId: 1, isDeleted: 1, status: 1 });

export const InspectionAssignmentModel =
  mongoose.models.InspectionAssignment ??
  mongoose.model('InspectionAssignment', inspectionAssignmentSchema);
