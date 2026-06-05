<!-- purpose-doc: normalized -->
# Inspection Evidence File Repository (`inspection-evidence-file.repository.js`)

## Scenario
During an inspection, photos are attached to a submission. The repository stores metadata and retrieves evidence for a submission.

## What it does
Extends `BaseRepository` with `InspectionEvidenceFileModel`. Likely methods:
- `findBySubmission(submissionId)` – all files for a submission.
- `addFile(submissionId, fileUrl, type)` – creates a record.

## Libraries used
- **mongoose**.
- `../models/inspection-evidence-file.model.js`.
- `./base.repository.js`.

## Logic implemented
Simple CRUD; `findBySubmission` uses `{ submissionId }`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
