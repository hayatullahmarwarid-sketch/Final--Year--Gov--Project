/**
 * Canonical queue names used by both the API (enqueuer) and the worker process (consumer).
 * Never hard-code these strings elsewhere — import from here.
 */
export const QUEUE = Object.freeze({
  EMAIL_SEND: 'email.send',
  NOTIFICATIONS_FANOUT: 'notifications.fanout',
  CERTIFICATES_ISSUE: 'certificates.issue',
  DASHBOARDS_SNAPSHOT: 'dashboards.snapshot',
  FILES_GC: 'files.gc',
  AUDIT_INTEGRITY_CHECK: 'audit.integrity-check',
});

/** @type {readonly string[]} */
export const QUEUE_NAMES = Object.freeze(Object.values(QUEUE));
