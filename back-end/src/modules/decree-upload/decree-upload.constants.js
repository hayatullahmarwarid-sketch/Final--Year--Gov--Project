/** Root-level fields that participate in metadata completeness scoring. */
export const DECREE_COMPLETENESS_ROOT_KEYS = Object.freeze([
  'decreeNumber',
  'titleSummary',
  'categoryIds',
]);

/** Working-copy / published version fields checked for completeness (via active draft or published version). */
export const DECREE_COMPLETENESS_VERSION_KEYS = Object.freeze(['effectiveFrom', 'localizedContent']);
