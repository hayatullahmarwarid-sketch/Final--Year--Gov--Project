<!-- purpose-doc: normalized -->

---

### `files.service-purpose.md`
```markdown
# Files Service (`files.service.js`)

## Scenario
Managing files involves more than simple CRUD—files may be linked to specific entities (e.g., a certificate, an inspection submission) and their lifecycle is tied to those entities. The service orchestrates operations across the `StoredFileModel` and related models (`InspectionEvidenceFileModel`, `CertificateModel`) to maintain integrity. For example, deleting a certificate file should update the certificate’s reference. It also uses transactions for multi‑collection updates.

## What it does
Exports a `FilesService` class with methods that likely include:

- **`createFile(data)`** – creates a `StoredFileModel` document, but if the file is associated with an entity type (like `CERTIFICATE` or `INSPECTION_EVIDENCE`), it also creates linking records in the corresponding junction model (e.g., `InspectionEvidenceFileModel`) within a MongoDB transaction (`withMongoTransaction`).
- **`deleteFile(fileId)`** – soft‑deletes the `StoredFileModel` and, if applicable, updates the related entity (e.g., sets `certificate.storedFileId` to null) to avoid dangling references. Uses `excludeDeleted` to ensure only non‑deleted records are affected.
- **`getFile(fileId)`** – fetches a single file by ID, throws `NotFoundError` if missing or soft‑deleted.
- **`listFiles(filters)`** – queries `StoredFileModel` with filters like `entityType` (from `STORED_ENTITY_TYPE_KEYS`), `purpose`, `uploadedBy`, and respects `excludeDeleted`.

The service uses `getEnv` for any file‑related configuration (e.g., default expiry for download URLs).

## Libraries used
- **mongoose** – implicit usage via models.
- **../../core/database/mongo-session.js** – `withMongoTransaction` for atomic operations.
- **../../core/errors/app-error.js** – `NotFoundError`, `ValidationError`.
- **../../../database/models/inspection-evidence-file.model.js** – `InspectionEvidenceFileModel`.
- **../../../database/models/certificate.model.js** – `CertificateModel`.
- **../../../database/models/stored-file.model.js** – `StoredFileModel`.
- **../shared/constants/query-filters.js** – `excludeDeleted`.
- **../shared/constants/stored-entity-type.js** – `StoredEntityType`, `STORED_ENTITY_TYPE_KEYS`.
- **../../config/env.js** – `getEnv`.

## Logic implemented
1. `createFile(data)`:
   - Uses `withMongoTransaction` to:
     - Create the `StoredFileModel` document.
     - If `data.entityType === 'INSPECTION_EVIDENCE'`, also create an `InspectionEvidenceFileModel` document linking the file to the submission.
     - If `data.entityType === 'CERTIFICATE'`, update `CertificateModel` to set `storedFileId = newFile._id`.
   - Returns the created file.
2. `deleteFile(fileId)`:
   - Uses `withMongoTransaction` to:
     - Find the file; if not found, throw `NotFoundError`.
     - Soft‑delete it (`this.updateById(fileId, { deletedAt: new Date() })`).
     - If the file has an associated `entityType`, clean up the link (e.g., `CertificateModel.updateOne({ storedFileId: fileId }, { storedFileId: null })`).
3. `listFiles(filters)`:
   - Builds query from filters: `{ entityType, purpose, uploadedBy, ...excludeDeleted }`.
   - Uses `storedFileRepository` (not imported here directly, but likely `StoredFileModel` is used via repository pattern; however this service uses the model directly as per imports). It queries `StoredFileModel.find(query)`.
   - Returns results.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
