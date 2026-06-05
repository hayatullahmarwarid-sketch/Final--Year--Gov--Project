/**
 * Central numeric bounds for enterprise validation (API Zod + Mongoose + business logic).
 * Keep frontend `lib/validation/enterprise-limits.ts` aligned with these values.
 */

/** Passing threshold stored on exams — interpreted as a percentage in grading. */
export const EXAM_PASSING_SCORE_PCT = Object.freeze({ MIN: 1, MAX: 100 });

/**
 * Timed exam duration. Upper bound prevents absurd values (e.g. 1000+ minutes) while allowing long assessments.
 */
export const EXAM_TIME_LIMIT_MINUTES = Object.freeze({ MIN: 60, MAX: 480 });

/**
 * Exam-level points budget (`Exam.maxScore`) used when redistributing weights across questions.
 */
export const EXAM_TOTAL_POINTS_BUDGET = Object.freeze({ MIN: 1, MAX: 100 });

/** Per-question points (exam question & bank). */
export const EXAM_QUESTION_POINTS = Object.freeze({ MIN: 0, MAX: 1000 });

/** Inspection submission review scores are stored as percentages in reporting dashboards. */
export const INSPECTION_SUBMISSION_SCORE_PCT = Object.freeze({ MIN: 0, MAX: 100 });

/** Maximum custom validity window when issuing certificates (matches dept retention caps scale). */
export const CERTIFICATE_VALIDITY_DAYS_MAX = 3650;
