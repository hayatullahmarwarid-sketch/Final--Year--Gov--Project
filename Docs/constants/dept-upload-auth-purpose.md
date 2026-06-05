<!-- purpose-doc: normalized -->
# Dept Upload Auth (`dept-upload-auth.ts`)

## Scenario

Static configuration and design tokens are read whenever modules import this file—often during render to keep UI and behaviour consistent.

## What it does

The file exports the following surface (representative `export` lines):

- `export const DEPT_UPLOAD_LOGIN_EMAIL = 'decreedept@upload.sharia.gov';`
- `export const DEPT_UPLOAD_LOGIN_PASSWORD = '123456';`
- `export function isDeptUploadCredentials(emailInput: string, password: string): boolean {`

Path in repo: `constants/dept-upload-auth.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `dept-upload-auth.ts`.

## Libraries used

- **@/lib/validation/login-email** (`{ normalizeLoginEmail }`) – shared library code.

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
