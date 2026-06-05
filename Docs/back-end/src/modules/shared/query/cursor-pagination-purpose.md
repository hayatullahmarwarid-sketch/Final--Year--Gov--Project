<!-- purpose-doc: normalized -->
# Cursor Pagination (`cursor-pagination.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export function encodeCursor(row) {`
- `export function decodeCursor(cursor) {`
- `export const cursorQuerySchema = z.object({`
- `export function cursorFilter(decoded, primaryField = 'createdAt') {`
- `export function nextCursorFrom(last, primaryField = 'createdAt') {`

Path in repo: `back-end/src/modules/shared/query/cursor-pagination.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `cursor-pagination.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **zod** – third-party dependency for this module.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
3. Zod validates structured input before business logic runs.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
