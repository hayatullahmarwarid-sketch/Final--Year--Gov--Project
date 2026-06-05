import mongoose from 'mongoose';
import { EXAM_QUESTION_TYPE_KEYS } from '../../src/modules/shared/enums/exam-question-type.js';
import { EXAM_QUESTION_POINTS } from '../../src/modules/shared/validation/enterprise-field-limits.js';
import { standardDomainPlugin } from './plugins/standard-domain.plugin.js';

const { Schema } = mongoose;

const optionSchema = new Schema(
  {
    optionKey: { type: String, trim: true, required: true },
    label: { type: String, trim: true, required: true },
  },
  { _id: false },
);

const examQuestionBankSchema = new Schema(
  {
    /** Decree category (same taxonomy as decree upload department). */
    decreeCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'DecreeCategory',
      required: true,
      index: true,
    },
    decreeCategoryName: { type: String, trim: true, default: null },

    type: { type: String, required: true, enum: [...EXAM_QUESTION_TYPE_KEYS], index: true },
    stem: { type: String, required: true, trim: true },
    explanation: { type: String, trim: true, default: null },

    options: { type: [optionSchema], default: undefined },
    correctOptionKeys: { type: [String], default: undefined },
    correctBoolean: { type: Boolean, default: null },
    correctTextNormalized: { type: String, trim: true, default: null },

    points: {
      type: Number,
      required: true,
      default: 1,
      min: EXAM_QUESTION_POINTS.MIN,
      max: EXAM_QUESTION_POINTS.MAX,
    },
    isActive: { type: Boolean, default: true, index: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true, collection: 'exam_question_bank' },
);

examQuestionBankSchema.plugin(standardDomainPlugin);

examQuestionBankSchema.index({ decreeCategoryId: 1, isActive: 1, updatedAt: -1 });
examQuestionBankSchema.index({ tenantId: 1, decreeCategoryId: 1, isDeleted: 1 });

export const ExamQuestionBankModel =
  mongoose.models.ExamQuestionBank ?? mongoose.model('ExamQuestionBank', examQuestionBankSchema);
