<!-- purpose-doc: normalized -->
# Stored File Serializer (`stored-file.serializer.js`)

## Scenario
When the API returns file metadata—such as an uploaded decree PDF, an inspection evidence photo, or a user avatar—the internal database document contains fields that should not be exposed directly, like the internal storage key, the tenant ID, and Mongoose metadata. This serializer transforms the raw database object into a clean, client‑friendly JSON representation, suitable for inclusion in API responses. It also gracefully handles `null` or `undefined` input, so that callers can safely pass a file reference that might be missing.

## What it does
Exports a single function `serializeStoredFile(row)`. It takes a plain object (from a `lean()` Mongoose query or `.toObject()`) representing a stored file document and returns a new object with only the public fields. Typically these fields include:

- `id` – the file’s unique identifier (converted from `_id` to a string).
- `originalName` – the original filename as uploaded by the user.
- `mimeType` – the file’s MIME type (e.g., `image/jpeg`, `application/pdf`).
- `size` – file size in bytes.
- `url` – a publicly accessible URL or a pre‑signed download link (if available or computed from the storage key).
- `uploadedBy` – a summary of the user who uploaded the file (e.g., user ID and name, if populated).
- `createdAt` – the upload timestamp in ISO 8601 format.

If the input is `null` or `undefined`, the function returns `null`.

## Libraries used
- No external or internal libraries – it’s a pure JavaScript mapping function.

## Logic implemented
1. If `row` is `null` or `undefined`, return `null` immediately.
2. Build a new object extracting the relevant fields:
   ```js
   return {
     id: row._id?.toString(),
     originalName: row.originalName,
     mimeType: row.mimeType,
     size: row.size,
     url: row.url ?? null,          // might be missing if no public URL is configured
     uploadedBy: row.uploadedBy,    // often already serialized or left as a reference
     createdAt: row.createdAt?.toISOString(),
   };

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
