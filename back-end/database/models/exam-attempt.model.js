import mongoose from 'mongoose';
import { EXAM_ATTEMPT_STATUS_KEYS } from '../../src/modules/shared/enums/exam-attempt-status.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const examAttemptAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'ExamQuestion', required: true },
    selectedOptionKeys: { type: [String], default: undefined },
    booleanAnswer: { type: Boolean, default: null },
    textAnswer: { type: String, default: null },

    autoGradedPoints: { type: Number, default: null },
    manualGradedPoints: { type: Number, default: null },
    graderComment: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const examAttemptSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    examineeUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: {
      type: String,
      required: true,
      enum: [...EXAM_ATTEMPT_STATUS_KEYS],
      default: 'in_progress',
      index: true,
    },

    startedAt: { type: Date, default: () => new Date(), index: true },
    submittedAt: { type: Date, default: null, index: true },
    gradedAt: { type: Date, default: null },

    score: { type: Number, default: null, min: 0 },
    maxScore: { type: Number, default: null, min: 0 },
    passed: { type: Boolean, default: null, index: true },

    /**
     * 1-based sequence for this user on this exam (max 3 failed attempts per policy;
     * first attempt = 1).
     */
    attemptNumber: { type: Number, min: 1, max: 3, default: 1, index: true },

    /** Set when a passing attempt resulted in certificate issuance (or existing cert). */
    certificateIssued: { type: Boolean, default: false, index: true },

    answers: { type: [examAttemptAnswerSchema], default: [] },

    /** Reserved for device/session binding and proctoring integrations. */
    sessionFingerprint: { type: String, trim: true, default: null, index: true, sparse: true },
    clientRequestId: { type: String, trim: true, default: null, index: true, sparse: true },

    tenantId: { type: String, trim: true, default: null, index: true, sparse: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'exam_attempts' },
);

examAttemptSchema.plugin(standardDomainPlugin, { withTenant: false });

examAttemptSchema.index({ examId: 1, examineeUserId: 1, status: 1, startedAt: -1 });
examAttemptSchema.index({ examineeUserId: 1, submittedAt: -1 });
examAttemptSchema.index({ examId: 1, submittedAt: -1 });
examAttemptSchema.index({ tenantId: 1, examineeUserId: 1, isDeleted: 1, status: 1 });

export const ExamAttemptModel =
  mongoose.models.ExamAttempt ?? mongoose.model('ExamAttempt', examAttemptSchema);
