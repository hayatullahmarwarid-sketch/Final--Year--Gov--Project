<!-- purpose-doc: normalized -->
# Admin Portal Auth (`admin-portal-auth.ts`)

## Scenario

Client-side service helpers run when app code imports them (for example portal login or specialised integrations).

## What it does

The file exports the following surface (representative `export` lines):

- `export type AdminPortalRoleKind = 'system' | 'decree' | 'inspector';`
- `export type InspectorPortalKind = 'inspector_admin' | 'field_inspector';`
- `export type AdminPortalSession =`
- `export const INSPECTOR_ADMIN_EMAIL = 'inspectoradmin@ops.sharia.gov';`
- `export async function getSuperAdminCredentials(): Promise<{ username: string; password: string }> {`
- `export async function getDecreeCredentials(): Promise<{ username: string; password: string }> {`
- `export async function getInspectorCredentials(): Promise<{ username: string; password: string }> {`
- `export async function getFieldInspectorPortalCredentials(): Promise<{ username: string; password: string }> {`
- `export async function setSuperAdminPortalCredentials(usernameRaw: string, password: string) {`
- `export async function setDecreePortalCredentials(usernameRaw: string, password: string) {`
- `export async function setInspectorPortalCredentials(usernameRaw: string, password: string) {`
- `export async function syncAdminPortalsFromStaffUsers(`
- `export async function tryPortalLogin(email: string, password: string): Promise<AdminPortalSession | null> {`
- `export async function verifySuperAdminLogin(username: string, password: string): Promise<boolean> {`
- `export type UpdateDecreeCredentialsResult =`
- `export async function updateDecreeCredentials(`
- `export type UpdateInspectorCredentialsResult =`
- `export async function updateInspectorAdminCredentials(`
- … (3 additional export lines in file)

Path in repo: `services/admin-portal-auth.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `admin-portal-auth.ts`.

## Libraries used

- **@react-native-async-storage/async-storage** – third-party dependency for this module.

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
