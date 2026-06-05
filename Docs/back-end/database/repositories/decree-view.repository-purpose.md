<!-- purpose-doc: normalized -->
# Decree View Repository (`decree-view.repository.js`)

## Scenario
When a user reads a decree, a view record is created. Analytics queries aggregate view counts per decree, and the admin can see engagement metrics. The repository provides methods to record a view and to fetch view statistics.

## What it does
Extends `BaseRepository` with `DecreeViewModel`. Also imports `DecreeModel` (maybe for aggregation joining deices). Likely methods:
- `recordView(decreeId, viewerUserId, sessionId)` – creates a view document.
- `countViews(decreeId, { fromDate, toDate })` – counts views for a decree.
- `getTopDecreeViews({ limit, fromDate })` – aggregation using `DecreeModel` and `DecreeViewModel` to get most‑viewed decrees.

## Libraries used
- **mongoose**.
- `../models/decree-view.model.js`.
- `../models/decree.model.js`.
- `./base.repository.js`.

## Logic implemented
1. `recordView`: calls `this.create(...)`.
2. `countViews`: filter by `decreeId` and optional date range.
3. Aggregation pipeline for top decrees joins with `DecreeModel` to get titles.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
