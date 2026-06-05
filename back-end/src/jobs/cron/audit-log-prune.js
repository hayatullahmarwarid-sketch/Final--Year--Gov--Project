import { AuditLogModel } from '../../../database/models/audit-log.model.js';
import { getEnv } from '../../config/env.js';
import { getLogger } from '../../config/logger.js';

/**
 * Deletes audit rows older than {@link getEnv}.AUDIT_LOG_RETENTION_DAYS (default 365).
 * Intended for a low-frequency worker cron (daily).
 */
export async function runAuditLogPruneTick() {
  const log = getLogger();
  const env = getEnv();
  const days = Math.max(1, env.AUDIT_LOG_RETENTION_DAYS ?? 365);
  const cutoff = new Date(Date.now() - days * 86400000);
  const res = await AuditLogModel.deleteMany({ occurredAt: { $lt: cutoff } });
  if (res.deletedCount) {
    log.info({ deletedCount: res.deletedCount, cutoff: cutoff.toISOString(), days }, 'cron.audit_log_prune');
  }
  return { deletedCount: res.deletedCount ?? 0 };
}
