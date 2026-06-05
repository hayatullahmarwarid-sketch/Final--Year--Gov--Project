<!-- purpose-doc: normalized -->
# Dashboard Snapshot Job Handler (`dashboards-snapshot.handler.js`)

## Scenario
Administrator dashboards display statistics like total decrees, inspections completed, users registered, etc. Computing these aggregates on every page load would be expensive. Instead, a background job periodically (e.g., daily) calculates and stores a snapshot of these metrics. This handler is the job queue’s entry point for that snapshot computation.

## What it does
The `dashboardsSnapshotHandler(job)` function imports `dashboardsService` and calls a method (likely `createSnapshot()` or `refreshDailyMetrics()`) that aggregates data from various collections and inserts a new `DashboardMetricsSnapshot` record. It also uses `getLogger` to log the start and completion of the snapshot process. The job payload might include a date or a type (e.g., `'DAILY'`) to control which snapshot to generate.

## Libraries used
- **../../config/logger.js** – `getLogger()` to log activity.
- **../../modules/dashboards/dashboards.service.js** – `dashboardsService` with business logic for metric aggregation and snapshot creation.

## Logic implemented
1. The handler may read `job.data` for parameters like `{ type: 'DAILY', date: '2026-05-06' }`.
2. It logs the start of the snapshot generation.
3. It calls `dashboardsService.createSnapshot(job.data)` (or similar).
4. On success, it logs completion.
5. On error, it logs the error and re‑throws it for the job queue to handle.
6. The handler ensures that dashboard snapshots are created reliably, even if the computation takes a while.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
