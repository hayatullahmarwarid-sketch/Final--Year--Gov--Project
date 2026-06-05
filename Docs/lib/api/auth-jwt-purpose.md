<!-- purpose-doc: normalized -->
# Auth Jwt (`auth-jwt.ts`)

## Scenario

The mobile client calls the back-end over HTTP. These helpers run whenever application code needs to perform the corresponding API operation (often after user action or navigation).

## What it does

The file exports the following surface (representative `export` lines):

- `export type BackendLoginUser = {`
- `export type BackendLoginSuccess = {`
- `export async function postBackendLogin(body: {`
- `export type BackendAuthMeUser = BackendLoginUser & {`
- `export async function getBackendAuthMe(): Promise<`
- `export async function patchBackendAuthMe(body: {`
- `export { postBackendTokenRefresh } from '@/lib/api/auth-token-refresh';`

Path in repo: `lib/api/auth-jwt.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `auth-jwt.ts`.

## Libraries used

- **@/constants/api** (`{ getApiBaseUrl }`) – shared constants.
- **@/lib/api/fetch-with-jwt-refresh** (`{ fetchWithJwtRefresh }`) – app API and data access helper.
- **@/lib/language-backend-map** (`type { BackendPreferredLanguage }`) – shared library code.

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
