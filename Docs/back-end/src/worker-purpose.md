<!-- purpose-doc: normalized -->
# Worker (`worker.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file may register effects at load time, re-export from another path, or use patterns outside a simple `export` line scan; reading the full source is required for exact exports.

Path in repo: `back-end/src/worker.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `worker.js`.

## Libraries used

- **dotenv** – third-party dependency for this module.
- **node-cron** – third-party dependency for this module.
- **./config/env.js** (`{ getEnv }`) – relative project import.
- **./config/logger.js** (`{ getLogger }`) – relative project import.
- **../database/connection/mongoose.js** (`{ connectMongo, disconnectMongo }`) – relative project import.
- **./config/redis.js** (`{ disconnectRedis }`) – relative project import.
- **./jobs/queue-registry.js** (`{ enqueue, shutdownQueues, startWorker }`) – relative project import.
- **./jobs/queue-names.js** (`{ QUEUE }`) – relative project import.
- **./jobs/handlers/email-send.handler.js** (`{ emailSendHandler }`) – relative project import.
- **./jobs/handlers/dashboards-snapshot.handler.js** (`{ dashboardsSnapshotHandler }`) – relative project import.
- **./jobs/handlers/notifications-fanout.handler.js** (`{ notificationsFanoutHandler }`) – relative project import.
- **./jobs/handlers/certificate-issue.handler.js** (`{ certificateIssueHandler }`) – relative project import.
- **./jobs/cron/assignment-deadline-reminders.js** (`{ runAssignmentDeadlineReminderTick }`) – relative project import.
- **./jobs/cron/audit-log-prune.js** (`{ runAuditLogPruneTick }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
3. Job or cron wiring schedules background execution or processes queued payloads.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
