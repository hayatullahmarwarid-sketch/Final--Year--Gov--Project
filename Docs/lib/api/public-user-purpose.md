<!-- purpose-doc: normalized -->
# Public User (`public-user.ts`)

## Scenario

The mobile client calls the back-end over HTTP. These helpers run whenever application code needs to perform the corresponding API operation (often after user action or navigation).

## What it does

The file exports the following surface (representative `export` lines):

- `export type PublicHomePayload = Record<string, unknown>;`
- `export type PublicHomeSettingsHints = {`
- `export function parsePublicHomeSettingsHints(data: PublicHomePayload): PublicHomeSettingsHints | null {`
- `export async function getPublicHome(query?: {`
- `export type PublicProfilePayload = Record<string, unknown>;`
- `export async function getPublicUserProfile(): Promise<`
- `export type PublicDecreeCategoryRow = Record<string, unknown>;`
- `export async function listPublicDecreeCategoriesPage(query?: {`
- `export type PublicDashboardPayload = Record<string, unknown>;`
- `export async function getPublicRoleDashboard(): Promise<`
- `export type PublicDecreeRow = Record<string, unknown>;`
- `export async function listPublicDecreesPage(query?: {`
- `export async function getPublicDecreeById(`
- `export async function postPublicDecreeRecordView(`
- `export function buildPublicDecreePdfUrl(decreeId: string, opts?: { locale?: string }): string | null {`
- `export type PublicBookmarkRow = Record<string, unknown>;`
- `export async function listPublicBookmarksPage(query?: {`
- `export async function postPublicBookmark(body: {`
- … (16 additional export lines in file)

Path in repo: `lib/api/public-user.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `public-user.ts`.

## Libraries used

- **@/constants/api** (`{ getApiBaseUrl }`) – shared constants.
- **@/lib/api/fetch-with-jwt-refresh** (`{ rotateStoredRefreshToken }`) – app API and data access helper.
- **@/lib/api/jwt-session-storage** (`{ getJwtAccessToken }`) – app API and data access helper.
- **@/lib/api/public-catalog** (`type { PaginatedMeta }`) – app API and data access helper.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
