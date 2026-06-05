<!-- purpose-doc: normalized -->
# Department Upload Settings Model (`dept-upload-settings.model.js`)

## Scenario
Each department that uses the decree upload module can have custom settings—such as notification preferences, default category, and auto‑publish flags. This model stores those per‑tenant settings as a key‑value store.

## What it does
Defines a simple schema, likely with a `key` (or `category`) and a `value` (Mixed type), and a reference to the tenant. No explicit plugin import is detected (but may still apply one internally or rely on a pre‑configured connection). Exported as `DeptUploadSettingsModel`.

## Libraries used
- **mongoose**.

## Logic implemented
1. Fields:
   - `tenantId`: ObjectId.
   - `key`: String.
   - `value`: Mixed.
2. Unique compound index on `tenantId + key`.
3. Simple CRUD for settings.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
