export const ExamAttemptStatus = Object.freeze({
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
  ABANDONED: 'abandoned',
});

/** @type {readonly string[]} */
export const EXAM_ATTEMPT_STATUS_KEYS = Object.freeze(Object.values(ExamAttemptStatus));
