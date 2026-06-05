<!-- purpose-doc: normalized -->
# Inspectors Validation (`inspectors.validation.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export const assignmentIdParamsSchema = z.object({`
- `export const listInspectorAssignmentsQuerySchema = extendListQuery({`
- `export const saveDraftBodySchema = z`
- `export const submitInspectionBodySchema = z`
- `export const attachEvidenceBodySchema = z`
- `export const syncStatusQuerySchema = z.object({`
- `export const offlineInspectionImportBodySchema = z`
- `export const syncBatchBodySchema = z`

Path in repo: `back-end/src/modules/inspectors/inspectors.validation.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspectors.validation.js`.

## Libraries used

- **zod** – third-party dependency for this module.
- **../shared/query/list-query.schema.js** (`{ extendListQuery }`) – relative project import.
- **../shared/enums/inspection-assignment-status.js** (`{ INSPECTION_ASSIGNMENT_STATUS_KEYS }`) – relative project import.
- **../shared/validation/zod-helpers.js** (`{ objectIdString }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Inspector-specific back-end resources (field users).
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
