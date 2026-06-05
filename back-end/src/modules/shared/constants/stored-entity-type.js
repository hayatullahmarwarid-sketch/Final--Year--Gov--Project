/** Values for `stored_files.linkedEntityType` and domain link helpers. */
export const StoredEntityType = Object.freeze({
  DECREE: 'decree',
  DECREE_VERSION: 'decree_version',
  INSPECTION_ASSIGNMENT: 'inspection_assignment',
  INSPECTION_SUBMISSION: 'inspection_submission',
  INSPECTION_EVIDENCE: 'inspection_evidence',
  CERTIFICATE: 'certificate',
  USER_AVATAR: 'user_avatar',
  OTHER: 'other',
});

/** @type {readonly string[]} */
export const STORED_ENTITY_TYPE_KEYS = Object.freeze(Object.values(StoredEntityType));
