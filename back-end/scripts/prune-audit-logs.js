/**
 * Deletes `audit_logs` with `occurredAt` older than retention window (default 90 days).
 * Run via cron: `node scripts/prune-audit-logs.js` (requires `MONGODB_URI`).
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { AuditLogModel } from '../database/models/audit-log.model.js';

const days = Math.max(1, Number(process.env.AUDIT_LOG_RETENTION_DAYS || 90));
const cutoff = new Date(Date.now() - days * 86400000);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri || typeof uri !== 'string') {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const res = await AuditLogModel.deleteMany({ occurredAt: { $lt: cutoff } });
  console.log(
    `prune-audit-logs: deleted ${res.deletedCount} row(s) with occurredAt before ${cutoff.toISOString()} (retention ${days}d)`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
