<!-- purpose-doc: normalized -->
# Inspectors Context (`inspectors.context.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export function resolveInspectorUserId(req) {`
- `export function getInspectorBinding(req) {`

Path in repo: `back-end/src/modules/inspectors/inspectors.context.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspectors.context.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **../../middlewares/authorize.middleware.js** (`{ isRbacBypassed }`) – relative project import.
- **../../middlewares/request-context.middleware.js** (`{ getRequestContext }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Inspector-specific back-end resources (field users).
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
