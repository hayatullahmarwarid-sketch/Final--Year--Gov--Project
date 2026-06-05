<!-- purpose-doc: normalized -->
# Decree Upload (`decree-upload.ts`)

## Scenario

The mobile client calls the back-end over HTTP. These helpers run whenever application code needs to perform the corresponding API operation (often after user action or navigation).

## What it does

The file exports the following surface (representative `export` lines):

- `export type PaginatedMeta = {`
- `export type DecreeCategory = {`
- `export type LocalizedContentBlock = {`
- `export type DecreeVersionSummary = {`
- `export type SerializedDecree = {`
- `export type MonthCount = { month: string; count: number };`
- `export type DecreeUploadDashboardDto = {`
- `export type CreateCategoryBody = {`
- `export type PatchCategoryBody = {`
- `export type CreateDecreeBody = {`
- `export type PatchDecreeBody = {`
- `export type NextDecreeNumberPreview = {`
- `export type PublishDecreeBody = {`
- `export type ArchiveDecreeBody = {`
- `export async function getDecreeUploadDashboard(): Promise<`
- `export async function getDecreeUploadMeta(): Promise<`
- `export type DecreeUploadWorkspaceStats = {`
- `export async function getDecreeUploadStats(): Promise<`
- … (10 additional export lines in file)

Path in repo: `lib/api/decree-upload.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `decree-upload.ts`.

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
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
