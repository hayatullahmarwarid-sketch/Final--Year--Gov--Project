<!-- purpose-doc: normalized -->
# Dashboard Metrics Snapshot Model (`dashboard-metrics-snapshot.model.js`)

## Scenario
The platform periodically computes key metrics—total users, decrees published, inspections completed, etc.—and stores them as snapshots. This allows the admin dashboards to display trends over time without recomputing aggregates from raw data on every request. Old snapshots can be purged automatically or used for historical reporting.

## What it does
Defines a schema for a metric snapshot. Fields typically include a `date` (or `timestamp`), a `type` (e.g., `'DAILY'`, `'MONTHLY'`), and a `data` object (Mixed type) holding the actual metric counts. The `standardDomainPlugin` is applied. The exported model is `DashboardMetricsSnapshotModel`.

## Libraries used
- **mongoose** – schema and model.
- **./plugins/standard-domain.plugin.js** – adds `tenantId`, `deletedAt`, common listing index.

## Logic implemented
1. Schema includes:
   - `date`: Date, required, index.
   - `type`: String enum (daily, monthly, etc.).
   - `data`: mongoose.Schema.Types.Mixed – stores JSON with the metrics.
   - `tenantId` from plugin.
   - `deletedAt` from plugin.
2. Unique compound index on `date + type + tenantId`.
3. Model conditionally compiled as usual.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
