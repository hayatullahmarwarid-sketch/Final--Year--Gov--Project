/**
 * Logical use of a stored file row (metadata). Provider-agnostic; not a MIME type.
 * Domain modules may narrow allowed purposes per flow.
 */
export const StoredFilePurpose = Object.freeze({
  INSPECTION_EVIDENCE: 'inspection_evidence',
  SIGNATURE: 'signature',
  CERTIFICATE: 'certificate',
  AVATAR: 'avatar',
  OTHER: 'other',
});

/** @type {readonly string[]} */
export const STORED_FILE_PURPOSE_KEYS = Object.freeze(Object.values(StoredFilePurpose));
