<!-- purpose-doc: normalized -->
# Decrees Table Model (`decrees-table-model.ts`)

## Scenario

The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.

## What it does

The file exports the following surface (representative `export` lines):

- `export type DecreeTableSortKey = 'num' | 'title' | 'category' | 'status' | 'views';`
- `export type SortDir = 'asc' | 'desc';`
- `export type DecreeRowDisplayStatus = 'published' | 'draft' | 'rejected' | 'pending';`
- `export function decreeRowDisplayStatus(d: SerializedDecree): DecreeRowDisplayStatus {`
- `export type DecreeRowActionFlags = { edit: boolean; accept: boolean; reject: boolean; delete: boolean };`
- `export function decreeRowActions(ui: DecreeRowDisplayStatus): DecreeRowActionFlags {`
- `export function decreeViewsCount(d: SerializedDecree): number {`
- `export function sortDecrees(rows: SerializedDecree[], key: DecreeTableSortKey, dir: SortDir): SerializedDecree[] {`

Path in repo: `components/dept-upload/decrees-table-model.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `decrees-table-model.ts`.

## Libraries used

- **@/lib/api/decree-upload** (`type { SerializedDecree }`) – app API and data access helper.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
