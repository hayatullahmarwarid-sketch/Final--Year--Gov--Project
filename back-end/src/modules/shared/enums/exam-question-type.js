export const ExamQuestionType = Object.freeze({
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  ESSAY: 'essay',
});

/** @type {readonly string[]} */
export const EXAM_QUESTION_TYPE_KEYS = Object.freeze(Object.values(ExamQuestionType));
