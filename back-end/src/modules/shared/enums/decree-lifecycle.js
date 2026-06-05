export const DecreeLifecycle = Object.freeze({
  DRAFT: 'draft',
  /** Awaiting approval before publication (not visible in public catalog). */
  PENDING: 'pending',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  SUPERSEDED: 'superseded',
});

/** @type {readonly string[]} */
export const DECREE_LIFECYCLE_KEYS = Object.freeze(Object.values(DecreeLifecycle));
