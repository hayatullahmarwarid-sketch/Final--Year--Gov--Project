<!-- purpose-doc: normalized -->
# In‑Process Background Queue (`in-process-queue.js`)

## Scenario
The server needs to handle asynchronous background work—sending email verification codes, generating PDFs, pruning old data, or pushing notifications—without blocking the HTTP request‑response cycle. In a full production setup, a dedicated job queue backed by Redis or RabbitMQ would be used. However, during early development, in small‑scale deployments, or as a fallback when the external queue is unavailable, a simple in‑process queue allows jobs to be executed asynchronously within the same Node.js process. This avoids the overhead of external infrastructure while still offloading work from the main request handlers.

## What it does
Exports a class `InProcessQueue` that maintains an internal task list and processes jobs sequentially using a registered handler. Key features likely include:

- A `addJob(name, data)` method that creates a job with a unique ID (generated via `node:crypto`), adds it to the queue, and returns a Promise that resolves when the job completes or rejects on failure.
- A `process(handler)` method that sets the asynchronous processing function. The handler receives the job data and can return a Promise.
- The queue processes jobs one at a time (or with a configurable concurrency) to ensure that the process isn’t overwhelmed.
- Uses `getLogger` to log job lifecycle events: when a job is added, started, completed, or failed.
- Because it’s all in‑process, jobs are not persisted across server restarts; it’s suitable for lightweight, non‑critical tasks.

## Libraries used
- **node:crypto** – used to generate unique job IDs, likely via `crypto.randomUUID()`.
- **../../config/logger.js** – `getLogger()` to output structured logs for each job.

## Logic implemented
1. Constructor initializes an empty queue (array) and an optional concurrency setting.
2. `process(handler)` stores the handler function that will be called with each job’s payload and a job context (including the job ID).
3. `addJob(name, payload)`:
   - Creates a job object with a unique `id` (e.g., `crypto.randomUUID()`), `name`, `payload`, `status: 'waiting'`, and a `Promise` linked to the job’s completion.
   - Pushes the job onto the queue.
   - Calls a private `_tick()` method to start processing if the queue isn’t already processing at capacity.
   - Returns the Promise so callers can `await` the job’s result.
4. `_tick()` (private):
   - Checks if the number of currently active jobs is below the concurrency limit and if there are waiting jobs.
   - Shifts a job from the queue, marks it as `'active'`, logs its start.
   - Calls the handler with `(job.payload, { id: job.id, name: job.name })`.
   - On success, resolves the job’s promise and logs completion.
   - On error, rejects the job’s promise and logs the error.
   - Recursively calls `_tick()` to process the next job.
5. The class may also expose a `drain()` method to wait for all pending jobs to finish, useful during graceful shutdown.
6. Because it uses `Promise`‑based tracking, the caller can `await queue.addJob('sendEmail', { to: '...' })` to know when the email has been sent.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
