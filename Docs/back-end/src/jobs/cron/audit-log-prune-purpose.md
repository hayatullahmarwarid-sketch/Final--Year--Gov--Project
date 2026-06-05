<!-- purpose-doc: normalized -->

---

### `audit-log-prune-purpose.md`
```markdown
# Audit Log Prune Job (`audit-log-prune.js`)

## Scenario
Audit logs accumulate rapidly and can degrade database performance or consume excessive disk space if kept indefinitely. A retention policy dictates that audit entries older than a certain number of days (e.g., 90 days) should be automatically deleted. This background job runs periodically (e.g., daily) to bulk‑delete outdated logs, keeping the collection lean without manual intervention. It is the automated equivalent of the standalone `prune-audit-logs.js` script.

## What it does
Exports an async function `runAuditLogPruneTick()`, called by a scheduler. It:

1. Reads the retention period from `getEnv()` (e.g., `AUDIT_LOG_RETENTION_DAYS` or defaults to 90).
2. Computes a cutoff date: `cutoff = new Date(Date.now() - retentionMs)`.
3. Deletes all audit log documents whose `occurredAt` (or a similar timestamp field) is earlier than the cutoff date using `AuditLogModel.deleteMany({ occurredAt: { $lt: cutoff } })`.
4. Logs the number of deleted records and the cutoff date for audit trail purposes.
5. The function is idempotent and safe to run multiple times; it only removes records older than the retention window.

## Libraries used
- **../../../database/models/audit-log.model.js** – `AuditLogModel` to perform deletion.
- **../../config/env.js** – `getEnv` for `AUDIT_LOG_RETENTION_DAYS` or similar.
- **../../config/logger.js** – `getLogger` for logging.

## Logic implemented
1. Retrieve retention days from `getEnv()`, defaulting to 90 (for example).
2. Calculate `cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)`.
3. Execute:
   ```js
   const result = await AuditLogModel.deleteMany({
     occurredAt: { $lt: cutoffDate },
   });

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
