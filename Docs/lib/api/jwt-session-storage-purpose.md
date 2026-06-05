<!-- purpose-doc: normalized -->
# Jwt Session Storage (`jwt-session-storage.ts`)

## Scenario

The mobile client calls the back-end over HTTP. These helpers run whenever application code needs to perform the corresponding API operation (often after user action or navigation).

## What it does

The file exports the following surface (representative `export` lines):

- `export async function saveJwtTokens(accessToken: string, refreshToken: string): Promise<void> {`
- `export async function clearJwtTokens(): Promise<void> {`
- `export async function getJwtAccessToken(): Promise<string | null> {`
- `export async function getJwtRefreshToken(): Promise<string | null> {`

Path in repo: `lib/api/jwt-session-storage.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `jwt-session-storage.ts`.

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
