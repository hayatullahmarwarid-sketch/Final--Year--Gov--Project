<!-- purpose-doc: normalized -->
# Dashboard Snapshot Service (`dashboard-snapshot.service.js`)

## Scenario
Computing dashboard aggregates on every request can be expensive. Instead, the dashboards service can periodically store pre‑computed snapshots of the metrics (e.g., via a background job). This service provides functions to read and write those snapshots with key‑based access, and it defines a TTL (Time‑To‑Live) to ensure stale data is not served. When a dashboard request arrives, the system can first attempt to read a fresh snapshot; if it is missing or expired, it falls back to live computation and updates the snapshot.

## What it does
Exports three items:

- **`DASHBOARD_TTL_SECONDS`** – a frozen object mapping snapshot keys (e.g., `SYSTEM_ADMIN`, `INSPECTOR_ADMIN`, `PUBLIC`) to their TTL in seconds. For example, `{ SYSTEM_ADMIN: 3600, PUBLIC: 300 }`.
- **`readDashboardSnapshot(snapshotKey, dimensionsKey)`** – looks up a snapshot in `DashboardMetricsSnapshotModel` by `key` (the dashboard type) and `dimensionsKey` (e.g., `'global'` for all tenants, or a specific tenant/dimension). It checks if the snapshot is still fresh based on its `createdAt` and the TTL. If fresh, returns the stored `metrics` payload; otherwise returns `null`.
- **`writeDashboardSnapshot(snapshotKey, metrics, options)`** – inserts a new snapshot document with the given key and metrics data. It may also delete older snapshots for the same key to keep the collection clean.

## Libraries used
- **../../../database/models/dashboard-metrics-snapshot.model.js** – `DashboardMetricsSnapshotModel` for reading/writing snapshots.

## Logic implemented
1. `readDashboardSnapshot(snapshotKey, dimensionsKey = 'global')`:
   - Calculates cutoff time = `Date.now() - (DASHBOARD_TTL_SECONDS[snapshotKey] * 1000)`.
   - Queries `DashboardMetricsSnapshotModel.findOne({ key: snapshotKey, dimensions: dimensionsKey, createdAt: { $gte: cutoff } })` sorted by `createdAt` descending.
   - If a document is found, returns `doc.metrics` (the pre‑computed data).
   - Otherwise returns `null`.
2. `writeDashboardSnapshot(snapshotKey, metrics, options)`:
   - Creates a new document: `DashboardMetricsSnapshotModel.create({ key: snapshotKey, dimensions: options.dimensions || 'global', metrics, createdAt: new Date() })`.
   - Optionally, cleans up old snapshots for that key beyond a certain retention count.
3. The dashboards service can then do:
   ```js
   let data = await readDashboardSnapshot('SYSTEM_ADMIN');
   if (!data) {
     data = await computeSystemAdminDashboardLive();
     await writeDashboardSnapshot('SYSTEM_ADMIN', data);
   }
   return data;

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
