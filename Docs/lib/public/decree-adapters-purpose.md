<!-- purpose-doc: normalized -->
# Decree Adapters (`decree-adapters.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export function formatDecreeViewCount(n: number): string {`
- `export function apiBookmarkToListItem(bookmark: Record<string, unknown>): DecreeListItem | null {`
- `export function apiDecreeToListItem(row: Record<string, unknown>, locale: string): DecreeListItem {`
- `export function apiDecreeToDetailModel(`

Path in repo: `lib/public/decree-adapters.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `decree-adapters.ts`.

## Libraries used

- **@/data/decree-detail-content** (`type { ArticleBlock, DecreeDetailModel }`) – project module.
- **@/data/decree-models** (`type { DecreeListItem }`) – project module.
- **@/lib/decree-number-format** (`{ formatDecreeNumberLabel }`) – shared library code.
- **@/lib/i18n/format** (`{ formatDateMonthDayYear }`) – shared library code.

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
