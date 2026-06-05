<!-- purpose-doc: normalized -->
# Files Metadata Service (`files-metadata.service.js`)

## Scenario
For lightweight read‑only operations—like listing files for a user or fetching file metadata for a download—the system needs a service that abstracts away the storage layer and returns serialized data. This service is optimised for metadata queries without the heavy linking logic of the full `FilesService`. Controllers can use it directly or it can be wrapped by the main files service.

## What it does
Exports a `FilesMetadataService` class with methods:

- **`listFiles({ offset, limit, filters })`** – uses `storedFileRepository` (or `StoredFileModel`) to paginate and filter files. Applies `toOffsetLimit` for pagination, and serializes each result with `serializeStoredFile`. Returns `{ items, total }`.
- **`getFile(fileId)`** – fetches a single file by ID via `storedFileRepository`. If not found, throws `NotFoundError`. Serializes and returns the file.

## Libraries used
- **mongoose** – implicit via repository.
- **../shared/http/index.js** – `NotFoundError` (re‑exported from app-error).
- **../../../database/repositories/stored-file.repository.js** – `storedFileRepository`.
- **./serializers/stored-file.serializer.js** – `serializeStoredFile`.
- **../shared/query/pagination.js** – `toOffsetLimit`.

## Logic implemented
1. `listFiles(options)`:
   - Apply `toOffsetLimit(options.page, options.pageSize)`.
   - Call `storedFileRepository.find(filters, { sort: '-createdAt', offset, limit })`.
   - Map results through `serializeStoredFile`.
   - Count total matching files via `storedFileRepository.count(filters)`.
   - Return `{ items, total }`.
2. `getFile(fileId)`:
   - `const file = await storedFileRepository.findById(fileId)`.
   - If `!file`, throw `new NotFoundError('File not found')`.
   - Return `serializeStoredFile(file)`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
