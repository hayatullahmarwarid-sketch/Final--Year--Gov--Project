<!-- purpose-doc: normalized -->
# Languages (`languages.ts`)

## Scenario

Static configuration and design tokens are read whenever modules import this file—often during render to keep UI and behaviour consistent.

## What it does

The file exports the following surface (representative `export` lines):

- `export type AppLanguageId = 'ps' | 'prs' | 'en';`
- `export type AppLanguageOption = {`
- `export const APP_LANGUAGES: AppLanguageOption[] = [`
- `export function appLanguageEnglishName(id: AppLanguageId): string {`
- `export function portalLocaleCodeToAppId(code: string): AppLanguageId | null {`
- `export function orderedLanguageOptionsFromPortal(supportedPortalCodes: string[]): AppLanguageOption[] {`

Path in repo: `constants/languages.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `languages.ts`.

## Libraries used

- **(none beyond language built-ins)** – the file only uses local control flow or relative imports not listed above.

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
