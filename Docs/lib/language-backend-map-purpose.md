<!-- purpose-doc: normalized -->
# Language Backend Map (`language-backend-map.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export type BackendPreferredLanguage = 'en' | 'ps' | 'fa';`
- `export function appLanguageIdToBackendPreferred(id: AppLanguageId): BackendPreferredLanguage {`
- `export function backendPreferredToAppLanguageId(code: string | null | undefined): AppLanguageId | null {`

Path in repo: `lib/language-backend-map.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `language-backend-map.ts`.

## Libraries used

- **@/constants/languages** (`type { AppLanguageId }`) – shared constants.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
