<!-- purpose-doc: normalized -->
# Files Controller (`files.controller.js`)

## Scenario
Administrators and authorised users need to list stored files, view metadata about a specific file, and possibly trigger file‑related actions (like generating a signed download URL). The controller exposes REST endpoints that work with the file metadata service to retrieve and return file information, and with the upload service to generate public URLs for secure access.

## What it does
Exports a `FilesController` class and a singleton `filesController`. Methods include:

- **`listFiles(req, res)`** – extracts pagination and filter parameters (entity type, purpose, uploader) from the query, calls `filesService.listFiles(...)`, and returns a paginated list of serialized stored files via `sendPaginatedList`.
- **`getFile(req, res)`** – extracts file ID from params, calls `filesService.getFile(id)`. If the file is not found, throws `NotFoundError`. On success, optionally resolves a public download URL using `resolveStoredFileUrl` and returns the enriched file object with `sendSuccess`.
- **`createFile` / `updateFile` / `deleteFile`** – administrative endpoints for managing file metadata (if exposed to the API; they may also be internal). These would call corresponding methods on `filesService` and return the appropriate status codes.

Each method is wrapped with `asyncHandler`, and the controller uses `getRequestContext` for audit purposes when write actions occur.

## Libraries used
- **../shared/http/index.js** – `asyncHandler`, `HttpStatus`, `sendPaginatedList`, `sendSuccess`.
- **../../middlewares/request-context.middleware.js** – `getRequestContext` for request ID in audits.
- **../../core/errors/app-error.js** – `NotFoundError`.
- **../../services/storage/upload.service.js** – `resolveStoredFileUrl` to generate a signed/public URL from the storage provider.
- **./files.service.js** – `filesService` for metadata CRUD.
- **./files-metadata.service.js** – `filesMetadataService` (possibly used directly for read‑only public metadata operations, or `filesService` wraps it).

## Logic implemented
1. `getFile`:
   - Retrieves `fileId` from `req.params`.
   - Calls `filesMetadataService.getFile(fileId)` (or `filesService.getFile(fileId)`).
   - If no file, throws `new NotFoundError('File not found')`.
   - Generates a URL: `const url = await resolveStoredFileUrl(file.key, { expiresIn: 3600 })`.
   - Attaches `url` to the file object (if not already there from the serializer).
   - Returns `sendSuccess(res, HttpStatus.OK, serializeStoredFile(file))`.
2. `listFiles`:
   - Calls `filesMetadataService.listFiles(filters, pagination)`.
   - Returns `sendPaginatedList(res, items.map(serializeStoredFile), total, page, pageSize)`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
