<!-- purpose-doc: normalized -->
# List Query Schema (`list-query.schema.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export const listQueryBaseObjectSchema = z.object({`
- `export function normalizeListLimit(q) {`
- `export const listQueryBaseSchema = listQueryBaseObjectSchema.transform(normalizeListLimit);`
- `export function extendListQuery(shape) {`
- `export const listPaginationInputSchema = listQueryBaseObjectSchema.pick({`

Path in repo: `back-end/src/modules/shared/query/list-query.schema.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `list-query.schema.js`.

## Libraries used

- **zod** – third-party dependency for this module.

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
