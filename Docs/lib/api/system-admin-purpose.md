<!-- purpose-doc: normalized -->
# System Admin (`system-admin.ts`)

## Scenario

The mobile client calls the back-end over HTTP. These helpers run whenever application code needs to perform the corresponding API operation (often after user action or navigation).

## What it does

The file exports the following surface (representative `export` lines):

- `export type SystemAdminStaffMember = {`
- `export type SystemAdminAuditLogRow = {`
- `export type PlatformSettingsDoc = {`
- `export type PaginatedMeta = {`
- `export type ListStaffResult = { items: SystemAdminStaffMember[]; meta: PaginatedMeta };`
- `export type ListAuditLogsResult = { items: SystemAdminAuditLogRow[]; meta: PaginatedMeta };`
- `export type SystemAdminDashboard = {`
- `export type AuditActivityBucketRow = { bucket: number; requests: number; logins: number };`
- `export type SystemSummary = {`
- `export type SystemAdminInboxNotification = {`
- `export type CreateStaffBody = {`
- `export type PatchStaffBody = {`
- `export type PatchSettingsBody = {`
- `export async function getSystemAdminDashboard(): Promise<`
- `export async function getSystemSummary(): Promise<`
- `export async function listStaffPage(query: {`
- `export async function listAllStaff(maxPages = 20): Promise<`
- `export async function listAuditLogsPage(query: {`
- … (14 additional export lines in file)

Path in repo: `lib/api/system-admin.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `system-admin.ts`.

## Libraries used

- **@/constants/api** (`{ getApiBaseUrl }`) – shared constants.
- **@/lib/api/fetch-with-jwt-refresh** (`{ fetchWithJwtRefresh }`) – app API and data access helper.
- **@/lib/api/jwt-session-storage** (`{ getJwtAccessToken }`) – app API and data access helper.

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
