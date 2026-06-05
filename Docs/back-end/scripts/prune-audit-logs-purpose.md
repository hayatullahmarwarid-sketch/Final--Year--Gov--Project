<!-- purpose-doc: normalized -->
# Audit Log Pruning Script (`prune-audit-logs.js`)

## Scenario
Over time, the `audit_logs` collection grows significantly, consuming storage and slowing down queries. To keep the database lean and maintain performance, old audit entries are routinely deleted. This script is designed to be executed periodically—typically via a cron job—to remove audit log records that are older than a configurable retention window (default 90 days). It ensures that the system retains enough history for compliance while discarding data that is no longer needed.

## What it does
The script is a standalone Node.js process. It:

1. Loads environment variables (via `dotenv`) to get the MongoDB connection string (`MONGODB_URI`).
2. Connects to MongoDB using Mongoose.
3. Imports the `AuditLogModel` to access the `audit_logs` collection.
4. Calculates a cutoff date by subtracting the retention period (e.g., 90 days) from the current date.
5. Deletes all audit log documents whose `occurredAt` (or equivalent timestamp field) is earlier than the cutoff date.
6. Logs the number of deleted documents and any errors.
7. Disconnects from MongoDB and exits.

Because it uses `AuditLogModel` directly, it assumes the model file is registered properly.

## Libraries used
- **dotenv** – loads environment variables from `.env` (so `MONGODB_URI` is available).
- **mongoose** – connects to MongoDB and performs the deletion.
- **../database/models/audit-log.model.js** – the `AuditLogModel` used to access the collection.

## Logic implemented
1. The script loads the connection string from `process.env.MONGODB_URI`.
2. It calls `mongoose.connect(uri)` to establish a connection.
3. A retention duration is defined, either from an environment variable or defaulted to 90 days.
4. It computes a cutoff date: `const cutoff = new Date(Date.now() - retentionMs)`.
5. It executes `await AuditLogModel.deleteMany({ occurredAt: { $lt: cutoff } })`.
6. The number of deleted documents is logged to the console for auditing.
7. Any error is caught, logged, and the process exits with a non‑zero code.
8. Finally, `mongoose.disconnect()` is called to release the connection.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
