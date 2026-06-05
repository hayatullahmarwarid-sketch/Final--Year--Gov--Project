<!-- purpose-doc: normalized -->
# Inspection Deadline Reminder Index Migration (`0003_inspection_deadline_reminder.mjs`)

## Scenario
The system added a feature to send deadline reminders for inspections. The `InspectionAssignment` collection needs to be queried frequently for assignments whose deadline is approaching (e.g., within 24 hours) to send push notifications. An index on the `deadline` field (or a compound index including `deadline` and `status`) is required to make these queries fast. This migration creates that index.

## What it does
The migration’s `up` function focuses solely on `InspectionAssignmentModel`. It calls `syncIndexes()` to ensure that the schema’s new deadline‑related indexes exist in the database. The schema likely now defines an index like `{ deadline: 1, status: 1 }` to efficiently find active assignments nearing deadline. The `down` function may drop those indexes if needed.

## Libraries used
- **mongoose** – `syncIndexes()`.
- **../models/inspection-assignment.model.js** – the model with deadline indexes.

## Logic implemented
1. `up` receives `logger`.
2. It calls `InspectionAssignmentModel.syncIndexes()`.
3. Mongoose creates any missing indexes defined in the schema (e.g., a TTL index or a regular index on `deadline`).
4. If already present, nothing changes.
5. The migration is recorded, and the reminder service can now run efficient queries like `InspectionAssignment.find({ deadline: { $lte: in24Hours } })`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
