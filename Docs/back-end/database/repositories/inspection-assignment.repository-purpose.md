<!-- purpose-doc: normalized -->
# Inspection Assignment Repository (`inspection-assignment.repository.js`)

## Scenario
Admins assign inspections to inspectors, who see their pending tasks. The repository provides queries for an inspector’s assignments (filtered by status), deadline‑based reminders, and assignment creation.

## What it does
Extends `BaseRepository` with `InspectionAssignmentModel`. Uses `mergeFilters`. Likely methods:
- `findByInspector(inspectorId, { status, pagination })` – tasks for an inspector.
- `findNearDeadline({ withinHours, status })` – assignments with deadline approaching, for reminders.
- `createAssignment(data)` / `updateAssignment(id, data)`.

## Libraries used
- **mongoose**.
- `../models/inspection-assignment.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.

## Logic implemented
1. `findNearDeadline`: filter `{ deadline: { $lte: futureDate }, status: 'IN_PROGRESS' }`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
