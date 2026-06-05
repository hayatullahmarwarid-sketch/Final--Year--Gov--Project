<!-- purpose-doc: normalized -->
# Certificate Pdf Save (`certificate-pdf-save.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export function certificatePdfFilename(certificateDisplayId: string): string {`
- `export type SaveCertificatePdfOutcome = 'saved_downloads' | 'shared';`
- `export async function saveCertificatePdfToDevice(`

Path in repo: `lib/certificate-pdf-save.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `certificate-pdf-save.ts`.

## Libraries used

- **expo-file-system** – third-party dependency for this module.
- **expo-sharing** – third-party dependency for this module.
- **react-native** – third-party dependency for this module.
- **@/lib/adapters/storage** (`{ storage }`) – shared library code.

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
