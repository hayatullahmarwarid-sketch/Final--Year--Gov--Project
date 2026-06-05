<!-- purpose-doc: normalized -->
# Format (`format.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export function appLanguageToIntlLocale(lang: AppLanguageId): string {`
- `export function shouldUseEasternArabicNumerals(lang: AppLanguageId): boolean {`
- `export function formatNumber(`
- `export function formatPercent(value: number, lang: AppLanguageId, fractionDigits = 0): string {`
- `export function formatDate(`
- `export function formatDateMedium(input: Date | number, lang: AppLanguageId): string {`
- `export function formatDateMonthDayYear(input: Date | number, lang: AppLanguageId): string {`
- `export function i18nCodeToIntlLocale(code: string): string {`
- `export type { AppLanguageId };`
- `export { appLanguageToI18n } from './locale-map';`

Path in repo: `lib/i18n/format.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `format.ts`.

## Libraries used

- **@/constants/languages** (`type { AppLanguageId }`) – shared constants.

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
