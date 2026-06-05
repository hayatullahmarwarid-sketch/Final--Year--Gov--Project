export const ExamLifecycle = Object.freeze({
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  OPEN: 'open',
  CLOSED: 'closed',
  PUBLISHED: 'published',
});

/** @type {readonly string[]} */
export const EXAM_LIFECYCLE_KEYS = Object.freeze(Object.values(ExamLifecycle));
