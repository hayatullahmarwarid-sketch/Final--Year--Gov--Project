/**
 * @deprecated Phase 7: grading moved to `src/modules/exams/grading.service.js`. Keep this
 * back-compat barrel while other callers migrate. Remove in a follow-up cleanup.
 */
export { gradeAttempt as buildGradedAnswers } from '../../exams/grading.service.js';
