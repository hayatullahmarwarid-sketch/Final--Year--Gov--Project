export const StaticPageStatus = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  /** Retained for admin/CMS; hidden from public content APIs. */
  INACTIVE: 'inactive',
});

/** @type {readonly string[]} */
export const STATIC_PAGE_STATUS_KEYS = Object.freeze(Object.values(StaticPageStatus));
