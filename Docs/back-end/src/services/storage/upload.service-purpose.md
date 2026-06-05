<!-- purpose-doc: normalized -->
# Upload Service (`upload.service.js`)

## Scenario

Infrastructure services (email, storage, cache, push, etc.) are invoked when domain logic or jobs need that capability.

## What it does

The file exports the following surface (representative `export` lines):

- `export function getAbsoluteDiskPathForStorageKey(providerFileId) {`
- `export async function persistUpload(input) {`
- `export async function persistUploadFromDiskFile(input) {`
- `export async function resolveStoredFileUrl(fileId, options = {}) {`
- `export async function softDeleteStoredFile(fileId) {`

Path in repo: `back-end/src/services/storage/upload.service.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `upload.service.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **node:path** – third-party dependency for this module.
- **../../../database/models/stored-file.model.js** (`{ StoredFileModel }`) – relative project import.
- **../../config/env.js** (`{ getEnv }`) – relative project import.
- **../../modules/shared/constants/stored-file-purpose.js** (`{ StoredFilePurpose }`) – relative project import.
- **./get-storage-provider.js** (`{ getStorageProvider }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
