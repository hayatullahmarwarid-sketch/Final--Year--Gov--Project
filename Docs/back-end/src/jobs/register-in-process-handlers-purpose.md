<!-- purpose-doc: normalized -->
# In‑Process Handler Registration (`register-in-process-handlers.js`)

## Scenario
When the application runs in a single‑process mode (e.g., development, or when a separate worker process isn’t deployed), background jobs must be processed inside the same Node.js process. This module is called at startup to register all job handlers with the in‑process queue, so that enqueued jobs (emails, push notifications, certificate issuance) are actually executed instead of being left pending. If Redis is available and a dedicated worker is configured, this function may optionally skip registration, delegating to the Redis‑backed workers.

## What it does
Exports a single function `registerInProcessHandlersIfNeeded()`. It:

1. Checks whether Redis is available (via `getRedis()`) or whether a dedicated worker mode is active (e.g., environment variable `RUN_WORKER=false`). If the system is already using BullMQ workers, it may skip in‑process registration to avoid duplicate processing.
2. If in‑process mode is needed, it calls `startWorker` for each relevant queue, passing the corresponding handler imported from `./handlers/`:
   - For `QUEUE.EMAIL`, handler `emailSendHandler`.
   - For `QUEUE.NOTIFICATIONS_FANOUT`, handler `notificationsFanoutHandler`.
   - For `QUEUE.CERTIFICATE_ISSUE`, handler `certificateIssueHandler`.
   - (Potentially for dashboard snapshots as well, though not imported here.)
3. Logs via `getLogger` which handlers were registered.
4. The `startWorker` function (from `queue-registry.js`) then either starts a BullMQ worker or attaches the handler to the `InProcessQueue`, depending on the current mode.

## Libraries used
- **../config/redis.js** – `getRedis()` to check Redis availability.
- **../config/logger.js** – `getLogger()` for logging.
- **./queue-registry.js** – `startWorker` function.
- **./queue-names.js** – `QUEUE` object with queue name constants.
- **./handlers/email-send.handler.js** – `emailSendHandler`.
- **./handlers/notifications-fanout.handler.js** – `notificationsFanoutHandler`.
- **./handlers/certificate-issue.handler.js** – `certificateIssueHandler`.

## Logic implemented
1. The function is called early in the server startup process.
2. It evaluates whether in‑process handling is required:
   - If `getRedis()` is available and the worker mode is set to "separate", it might return early.
   - Otherwise (or as a mandatory fallback), it proceeds.
3. For each queue in the list `[QUEUE.EMAIL, QUEUE.NOTIFICATIONS_FANOUT, QUEUE.CERTIFICATE_ISSUE]`:
   - It retrieves the appropriate handler.
   - Calls `startWorker(queueName, handler, { concurrency: 1 })` (or similar options).
4. Logs each registration.
5. Any errors during registration are logged but generally do not prevent the server from starting.
6. After registration, any job enqueued via `enqueue` will be processed by the appropriate handler running in‑process.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
