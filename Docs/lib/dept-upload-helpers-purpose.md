<!-- purpose-doc: normalized -->
# Dept Upload Helpers (`dept-upload-helpers.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export function slugifyCategoryName(name: string): string {`
- `export function buildLocalizedBlocks(ps: string, dr: string, en: string): LocalizedContentBlock[] {`
- `export function localePlainFromBlocks(blocks: LocalizedContentBlock[] | undefined | null, locale: string): string {`
- `export function pickLocalizedBaselineBlocks(d: SerializedDecree): LocalizedContentBlock[] {`
- `export function mergeLocalizedContentForEdit(`
- `export function statusLabel(status: string): string {`

Path in repo: `lib/dept-upload-helpers.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `dept-upload-helpers.ts`.

## Libraries used

- **@/lib/api/decree-upload** (`type { LocalizedContentBlock, SerializedDecree }`) – app API and data access helper.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
