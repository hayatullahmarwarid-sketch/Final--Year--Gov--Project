<!-- purpose-doc: normalized -->
# Init (`init.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export function syncI18nLanguage(lang: AppLanguageId): void {`
- `export { i18n };`
- `export { appLanguageToI18n } from './locale-map';`
- `export default i18n;`

Path in repo: `lib/i18n/init.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `init.ts`.

## Libraries used

- **i18next** – third-party dependency for this module.
- **react-i18next** – third-party dependency for this module.
- **@/constants/languages** (`type { AppLanguageId }`) – shared constants.
- **./locales/en/common.json** (`enCommon`) – relative project import.
- **./locales/fa/common.json** (`faCommon`) – relative project import.
- **./locales/ps/common.json** (`psCommon`) – relative project import.
- **./locale-map** (`{ appLanguageToI18n }`) – relative project import.

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
