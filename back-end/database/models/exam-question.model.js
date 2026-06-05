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

const examQuestionSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    /** When copied from the question bank, links back for cascade delete / analytics. */
    sourceBankQuestionId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamQuestionBank',
      default: null,
      index: true,
    },
    order: { type: Number, required: true, min: 0, index: true },

    type: { type: String, required: true, enum: [...EXAM_QUESTION_TYPE_KEYS], index: true },
    stem: { type: String, required: true, trim: true },
    explanation: { type: String, trim: true, default: null },

    options: { type: [optionSchema], default: undefined },

    /** For auto-gradable types; null when manual grading required. */
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
  { timestamps: true, collection: 'exam_questions' },
);

examQuestionSchema.plugin(standardDomainPlugin);

examQuestionSchema.index({ examId: 1, order: 1 }, { unique: true });
examQuestionSchema.index({ examId: 1, isActive: 1, order: 1 });
examQuestionSchema.index({ tenantId: 1, examId: 1, isDeleted: 1 });

export const ExamQuestionModel =
  mongoose.models.ExamQuestion ?? mongoose.model('ExamQuestion', examQuestionSchema);
