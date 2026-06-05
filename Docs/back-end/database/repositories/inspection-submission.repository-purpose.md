<!-- purpose-doc: normalized -->
# Inspection Submission Repository (`inspection-submission.repository.js`)

## Scenario
Inspectors submit inspection forms; admins review them. The repository handles submission creation, status updates (approve/reject), and queries for submissions by assignment, inspector, or status.

## What it does
Extends `BaseRepository` with `InspectionSubmissionModel`. Uses `mergeFilters`. Likely methods:
- `findByAssignment(assignmentId)` – submission for a specific assignment (likely one).
- `findByInspector(inspectorId, { status, pagination })` – all submissions by an inspector.
- `findPendingReview({ pagination })` – admin query.
- `createSubmission(data)` / `updateReview(submissionId, status, notes, reviewerId)`.

## Libraries used
- **mongoose**.
- `../models/inspection-submission.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.

## Logic implemented
1. `findPendingReview`: filter `{ status: 'PENDING_REVIEW' }`.
2. `updateReview`: `this.updateById(id, { $set: { status, reviewNotes, reviewedBy, reviewedAt } })`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
