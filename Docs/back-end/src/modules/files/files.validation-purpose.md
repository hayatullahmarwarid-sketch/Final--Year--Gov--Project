<!-- purpose-doc: normalized -->
# Files Validation Schemas (`files.validation.js`)

## Scenario
Requests for file listing, getting a single file, and creating file metadata (if exposed) must carry correct parameters—pagination, valid entity types, purposes, and file IDs. These Zod schemas enforce those constraints and normalise list query parameters.

## What it does
Exports several Zod schemas:

- **`storedFileProviderSchema`** – a string validator for the storage provider name (e.g., `'s3'`, `'local'`), trimmed, min length 1, max 64.
- **`createStoredFileBodySchema`** – body schema for creating a file metadata record. Extends a base object schema with fields like `originalName`, `mimeType`, `size`, `purpose` (from `STORED_FILE_PURPOSE_KEYS`), `entityType` (from `STORED_ENTITY_TYPE_KEYS`), and `entityId`. A `superRefine` adds custom validation, e.g., if `entityType` is provided, `entityId` must also be present.
- **`listStoredFilesQuerySchema`** – extends base list‑query schema (`listQueryBaseObjectSchema`) with optional filter fields: `entityType`, `purpose`, `uploadedBy`. After validation, it calls `.transform(normalizeListLimit)` to enforce maximum page size and default values.
- **`storedFileIdParamsSchema`** – validates the URL parameter `fileId` must be a valid ObjectId string.

## Libraries used
- **zod** – schema definition.
- **../shared/query/list-query.schema.js** – `listQueryBaseObjectSchema`, `normalizeListLimit`.
- **../shared/constants/stored-entity-type.js** – `STORED_ENTITY_TYPE_KEYS`.
- **../shared/constants/stored-file-purpose.js** – `STORED_FILE_PURPOSE_KEYS`.

## Logic implemented
1. `storedFileIdParamsSchema`:
   ```js
   z.object({
     fileId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid file ID'),
   })

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
