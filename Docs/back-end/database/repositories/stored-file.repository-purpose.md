<!-- purpose-doc: normalized -->
# Stored File Repository (`stored-file.repository.js`)

## Scenario
File uploads are recorded in the `StoredFile` collection. The repository provides methods to create file records and retrieve them by key or uploader.

## What it does
Extends `BaseRepository` with `StoredFileModel`. Uses `mergeFilters` and `excludeDeleted`. Likely methods:
- `findByKey(key)` – finds a file by its storage key (unique).
- `findByUploader(userId, { pagination })` – files uploaded by a user.
- `createFile(data)` / `softDelete(id)`.

## Libraries used
- **mongoose**.
- `../models/stored-file.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.
- `../../src/modules/shared/constants/query-filters.js`.

## Logic implemented
1. `findByKey`: filter `{ key, ...excludeDeleted }`.
2. `createFile` inserts metadata.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
