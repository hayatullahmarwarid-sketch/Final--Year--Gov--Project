<!-- purpose-doc: normalized -->
# Stored File Model (`stored-file.model.js`)

## Scenario
Files uploaded by users (decree PDFs, inspection evidence, profile pictures) are referenced by this model. It stores metadata: original filename, storage key or URL, MIME type, size, and the uploader. The actual file may be stored in a cloud bucket or on disk.

## What it does
Schema with `originalName`, `key` (or `url`), `mimeType`, `size`, `uploadedBy`, `uploadedAt`. Applies `standardDomainPlugin`. Exported as `StoredFileModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `originalName`: String.
   - `key`: String (storage identifier).
   - `url`: optional String (if public URL exists).
   - `mimeType`: String.
   - `size`: Number.
   - `uploadedBy`: ObjectId, ref: `'User'`.
   - `uploadedAt`: Date.
2. Index on `key` (unique) and `uploadedBy`.
3. Plugin adds tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
