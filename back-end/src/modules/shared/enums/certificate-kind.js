export const CertificateKind = Object.freeze({
  EXAM_PASS: 'exam_pass',
  DECREE_LITERACY: 'decree_literacy',
  INSPECTION_QUALIFICATION: 'inspection_qualification',
  OTHER: 'other',
});

/** @type {readonly string[]} */
export const CERTIFICATE_KIND_KEYS = Object.freeze(Object.values(CertificateKind));
