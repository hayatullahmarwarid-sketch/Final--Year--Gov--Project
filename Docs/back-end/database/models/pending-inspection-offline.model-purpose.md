<!-- purpose-doc: normalized -->
# Pending Inspection Offline Model (`pending-inspection-offline.model.js`)

## Scenario
Inspectors may work offline. When they submit an inspection with no network, the data is queued locally and later synced. This model, on the server, temporarily stores those incoming sync payloads until they are fully processed and converted to proper `InspectionSubmission` records. It might also hold sync status.

## What it does
Schema with `inspectorId`, `assignmentId`, `data` (the form answers), `syncStatus` (pending, processing, completed, failed), `receivedAt`, `processedAt`. Applies `standardDomainPlugin`. Exported as `PendingInspectionOfflineModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `inspectorId`: ObjectId, ref: `'User'`.
   - `assignmentId`: ObjectId, ref: `'InspectionAssignment'`.
   - `data`: Mixed.
   - `syncStatus`: enum.
   - `receivedAt`, `processedAt`: Dates.
2. Index on `inspectorId + syncStatus` for sync queue display.
3. Plugin adds tenant.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
