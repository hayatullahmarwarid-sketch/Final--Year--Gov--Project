import mongoose from 'mongoose';
import { EXAM_LIFECYCLE_KEYS } from '../../src/modules/shared/enums/exam-lifecycle.js';
import { ROLE_KEYS } from '../../src/modules/shared/enums/roles.js';
import {
  EXAM_PASSING_SCORE_PCT,
  EXAM_TIME_LIMIT_MINUTES,
  EXAM_TOTAL_POINTS_BUDGET,
} from '../../src/modules/shared/validation/enterprise-field-limits.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const examSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },

    /** Public exam catalog grouping; same ids as decree upload `DecreeCategory`. */
    decreeCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'DecreeCategory',
      default: null,
      index: true,
    },
    /** Snapshot of category `name` for list views when the category is renamed later. */
    decreeCategoryName: { type: String, trim: true, default: null },

    status: {
      type: String,
      required: true,
      enum: [...EXAM_LIFECYCLE_KEYS],
      default: 'draft',
      index: true,
    },

    /** Empty = open to all authenticated personas (policy enforced later). */
    audienceRoleKeys: [{ type: String, enum: [...ROLE_KEYS] }],

    scheduledOpensAt: { type: Date, default: null, index: true },
    scheduledClosesAt: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null, index: true },

    passingScore: {
      type: Number,
      default: null,
      min: EXAM_PASSING_SCORE_PCT.MIN,
      max: EXAM_PASSING_SCORE_PCT.MAX,
    },
    maxScore: {
      type: Number,
      default: null,
      min: EXAM_TOTAL_POINTS_BUDGET.MIN,
      max: EXAM_TOTAL_POINTS_BUDGET.MAX,
    },
    timeLimitMinutes: {
      type: Number,
      default: null,
      min: EXAM_TIME_LIMIT_MINUTES.MIN,
      max: EXAM_TIME_LIMIT_MINUTES.MAX,
    },

    questionsCount: { type: Number, default: 0, min: 0, index: true },
    attemptsCount: { type: Number, default: 0, min: 0 },

    randomizeQuestions: { type: Boolean, default: false },
    randomizeOptions: { type: Boolean, default: false },

    tenantId: { type: String, trim: true, default: null, index: true, sparse: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'exams' },
);

examSchema.plugin(standardDomainPlugin, { withTenant: false });

examSchema.index({ status: 1, scheduledOpensAt: 1, scheduledClosesAt: 1 });
examSchema.index({ status: 1, updatedAt: -1 });
examSchema.index({ tenantId: 1, isDeleted: 1, status: 1 });
examSchema.index({ title: 'text', description: 'text' });

export const ExamModel = mongoose.models.Exam ?? mongoose.model('Exam', examSchema);
