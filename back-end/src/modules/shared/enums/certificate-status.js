export const CertificateStatus = Object.freeze({
  ISSUED: 'issued',
  REVOKED: 'revoked',
});

/** @type {readonly string[]} */
export const CERTIFICATE_STATUS_KEYS = Object.freeze(Object.values(CertificateStatus));
