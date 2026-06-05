<!-- purpose-doc: normalized -->
# Inspection Submission Rules (`inspection-submission.rules.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export function assertInspectionSubmissionMatchesTemplate(input) {`

Path in repo: `back-end/src/modules/inspections/inspection-submission.rules.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspection-submission.rules.js`.

## Libraries used

- **../../core/errors/app-error.js** (`{ AppError }`) – relative project import.
- **../../core/errors/http-status.js** (`{ HttpStatus }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
