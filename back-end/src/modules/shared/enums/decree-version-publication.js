/**
 * Version-level workflow (distinct from {@link DecreeLifecycle} on the lineage root).
 * Published versions are treated as immutable by application policy.
 */
export const DecreeVersionPublication = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  WITHDRAWN: 'withdrawn',
});

/** @type {readonly string[]} */
export const DECREE_VERSION_PUBLICATION_KEYS = Object.freeze(
  Object.values(DecreeVersionPublication),
);
