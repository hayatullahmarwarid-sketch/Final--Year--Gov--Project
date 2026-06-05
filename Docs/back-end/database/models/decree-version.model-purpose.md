<!-- purpose-doc: normalized -->
# Decree Version Model (`decree-version.model.js`)

## Scenario
When a decree is edited, a new version record is created to preserve the history. This model stores the full content of the decree at the time of the edit, along with a version number, publication status (draft, published, withdrawn), and the author of the change. It enables viewing previous versions and audit trails.

## What it does
Defines a schema with `decreeId`, `versionNumber`, `body` (or snapshot of relevant fields), `publication` (enum from `DECREE_VERSION_PUBLICATION_KEYS`), `createdBy`, `createdAt`. Applies `standardDomainPlugin`. Exported as `DecreeVersionModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/decree-version-publication.js** – publication enum.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `decreeId`: ObjectId, required, ref: `'Decree'`.
   - `versionNumber`: Number, required.
   - `body`: String (or mixed).
   - `publication`: enum, default `'DRAFT'`.
   - `createdBy`: ObjectId, ref: `'User'`.
   - `createdAt`: Date.
2. Compound unique index on `decreeId + versionNumber`.
3. Index on `decreeId + publication` for finding published versions.
4. Plugin adds tenant scoping and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
