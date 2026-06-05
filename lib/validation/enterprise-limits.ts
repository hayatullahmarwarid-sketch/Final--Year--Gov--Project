/**
 * Mirrors `back-end/src/modules/shared/validation/enterprise-field-limits.js`
 * for client-side validation (forms must not rely on API alone).
 */
export const EXAM_PASSING_SCORE_PCT = { MIN: 1, MAX: 100 } as const;
export const EXAM_TIME_LIMIT_MINUTES = { MIN: 60, MAX: 480 } as const;
export const EXAM_TOTAL_POINTS_BUDGET = { MIN: 1, MAX: 100 } as const;
export const EXAM_QUESTION_POINTS = { MIN: 0, MAX: 1000 } as const;
