<!-- purpose-doc: normalized -->
# Inspection Submission Model (`inspection-submission.model.js`)

## Scenario
Once an inspector completes an inspection form, the data is submitted. This model holds the filled‑out form values (as a JSON blob), references the assignment and template, stores the submission date, and tracks the review status (pending, approved, rejected). The admin can approve or reject with comments.

## What it does
Schema with `assignmentId`, `templateId`, `data` (Mixed), `submittedAt`, `status` (enum), `reviewNotes`, `reviewedBy`. Applies `standardDomainPlugin`. Exported as `InspectionSubmissionModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `assignmentId`: ObjectId, ref: `'InspectionAssignment'`.
   - `templateId`: ObjectId, ref: `'InspectionTemplate'`.
   - `data`: Mixed (the form answers).
   - `submittedAt`: Date.
   - `status`: enum – `'PENDING_REVIEW'`, `'APPROVED'`, `'REJECTED'`.
   - `reviewNotes`: optional String.
   - `reviewedBy`: ObjectId, ref: `'User'`.
   - `reviewedAt`: Date.
2. Indexes: `assignmentId`, `status`, `templateId`.
3. Plugin adds multi‑tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
