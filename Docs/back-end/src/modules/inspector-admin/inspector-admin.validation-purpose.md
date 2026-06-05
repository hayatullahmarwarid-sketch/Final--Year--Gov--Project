<!-- purpose-doc: normalized -->
# Inspector Admin Validation (`inspector-admin.validation.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export const idParamSchema = z.object({`
- `export const examIdParamSchema = z.object({`
- `export const examQuestionParamsSchema = z.object({`
- `export const listTemplatesQuerySchema = extendListQuery({`
- `export const createTemplateBodySchema = z`
- `export const patchTemplateBodySchema = z`
- `export const listAssignmentsQuerySchema = extendListQuery({`
- `export const createAssignmentBodySchema = z`
- `export const patchAssignmentBodySchema = z`
- `export const listSubmissionsQuerySchema = extendListQuery({`
- `export const returnSubmissionBodySchema = z`
- `export const finalizeSubmissionBodySchema = z`
- `export const listExamsQuerySchema = extendListQuery({`
- `export const createExamBodySchema = z`
- `export const patchExamBodySchema = z`
- `export const listCertificatesQuerySchema = extendListQuery({`
- `export const revokeCertificateBodySchema = z`
- `export const listExamAttemptsQuerySchema = extendListQuery({`
- … (16 additional export lines in file)

Path in repo: `back-end/src/modules/inspector-admin/inspector-admin.validation.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspector-admin.validation.js`.

## Libraries used

- **zod** – third-party dependency for this module.
- **../shared/query/list-query.schema.js** (`{ extendListQuery }`) – relative project import.
- **../shared/validation/zod-helpers.js** (`{ objectIdString }`) – relative project import.
- **../shared/enums/inspection-assignment-status.js** (`{ INSPECTION_ASSIGNMENT_STATUS_KEYS }`) – relative project import.
- **../shared/enums/exam-lifecycle.js** (`{ EXAM_LIFECYCLE_KEYS }`) – relative project import.
- **../shared/enums/certificate-status.js** (`{ CERTIFICATE_STATUS_KEYS }`) – relative project import.
- **../shared/enums/exam-question-type.js** (`{ EXAM_QUESTION_TYPE_KEYS }`) – relative project import.
- **../shared/enums/exam-attempt-status.js** (`{ EXAM_ATTEMPT_STATUS_KEYS }`) – relative project import.
- **../shared/enums/user-account-status.js** (`{ USER_ACCOUNT_STATUS_KEYS }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin APIs and workflows.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
