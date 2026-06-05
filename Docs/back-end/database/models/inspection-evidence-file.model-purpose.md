<!-- purpose-doc: normalized -->
# Inspection Evidence File Model (`inspection-evidence-file.model.js`)

## Scenario
During an inspection, the inspector may capture photos or attach files as evidence. These files are stored separately (e.g., in cloud storage) and this model holds the metadata: reference to the submission, the file URL, type, and timestamps.

## What it does
Schema with `submissionId`, `fileUrl`, `fileType` (image, video, document), `uploadedAt`. Applies `standardDomainPlugin`. Exported as `InspectionEvidenceFileModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `submissionId`: ObjectId, ref: `'InspectionSubmission'`.
   - `fileUrl`: String.
   - `fileType`: enum.
   - `uploadedAt`: Date.
2. Index on `submissionId` for fetching all evidence of a submission.
3. Plugin adds tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
