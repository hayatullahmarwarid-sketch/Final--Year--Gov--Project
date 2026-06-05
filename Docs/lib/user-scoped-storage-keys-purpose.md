<!-- purpose-doc: normalized -->
# User Scoped Storage Keys (`user-scoped-storage-keys.ts`)

## Scenario

Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.

## What it does

The file exports the following surface (representative `export` lines):

- `export const PREAUTH_ACCOUNT_SCOPE = '__preauth__';`
- `export const PROFILE_STORAGE_KEY_LEGACY = '@sharia_user_profile_v1';`
- `export const PASSWORD_STORAGE_KEY_LEGACY = '@sharia_account_password_v1';`
- `export function publicAccountKeyFromEmail(email: string): string {`
- `export function inspectorAccountKeyFromUsername(username: string): string {`
- `export const DEPT_UPLOAD_ACCOUNT_KEY = 'dept_catalog_uploader';`
- `export function deptUploadAccountKeyFromEmail(email: string): string {`
- `export function systemAdminAccountKeyFromUsername(username: string): string {`
- `export function inspectorAdminAccountKeyFromUsername(username: string): string {`
- `export function profileStorageKey(scope: string): string {`
- `export function passwordStorageKey(scope: string): string {`
- `export function notificationInboxStorageKey(scope: string): string {`
- `export function notificationSettingsStorageKey(scope: string): string {`
- `export function publicUserDataStorageKey(scope: string): string {`

Path in repo: `lib/user-scoped-storage-keys.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `user-scoped-storage-keys.ts`.

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
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
