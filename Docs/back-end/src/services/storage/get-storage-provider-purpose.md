<!-- purpose-doc: normalized -->
# Get Storage Provider (`get-storage-provider.js`)

## Scenario

Infrastructure services (email, storage, cache, push, etc.) are invoked when domain logic or jobs need that capability.

## What it does

The file exports the following surface (representative `export` lines):

- `export function getStorageProvider() {`
- `export function resetStorageProviderForTests() {`

Path in repo: `back-end/src/services/storage/get-storage-provider.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `get-storage-provider.js`.

## Libraries used

- **node:path** – third-party dependency for this module.
- **../../config/env.js** (`{ getEnv }`) – relative project import.
- **../../core/errors/app-error.js** (`{ AppError }`) – relative project import.
- **../../core/errors/http-status.js** (`{ HttpStatus }`) – relative project import.
- **./DiskStorageProvider.js** (`{ DiskStorageProvider }`) – relative project import.
- **./S3StorageProvider.js** (`{ S3StorageProvider }`) – relative project import.

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
