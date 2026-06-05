<!-- purpose-doc: normalized -->
# Decree Engagement Index Migration (`0002_decrees_engagement.mjs`)

## Scenario
After the initial release, the team added engagement tracking for decrees—measuring views, downloads, and storing PDF metadata. The schemas for `Decree`, `DecreeView`, and `StoredFile` were updated with new fields and indexes to support these features (e.g., indexing viewer user, decree ID, and timestamp for efficient querying). This migration ensures those new indexes and schema changes are applied to existing databases without a full re‑index of all models.

## What it does
The migration’s `up` function operates on three models:
- `DecreeModel` – likely adds indexes for download count or last‑downloaded timestamp, or a compound index on engagement fields.
- `DecreeViewModel` – creates indexes to quickly count views per decree or per user, supporting analytics.
- `StoredFileModel` – adds indexes for file metadata related to decree PDFs (e.g., `decreeId`, `fileType`).

It calls `syncIndexes()` on each model, and may also update schema defaults or apply field changes that are idempotent (Mongoose `syncIndexes` only affects indexes; actual schema field changes like defaults are not handled by `syncIndexes`, but the comment “schema sync” suggests the model files themselves were updated, and this migration just ensures indexes match). The `down` function is likely empty or drops the newly added indexes.

## Libraries used
- **mongoose** – via the models’ `syncIndexes()`.
- **../models/decree.model.js**, **../models/decree-view.model.js**, **../models/stored-file.model.js** – the models affected.

## Logic implemented
1. `up` receives a `logger`.
2. For each model (`DecreeModel`, `DecreeViewModel`, `StoredFileModel`), it logs the model name and calls `syncIndexes()`.
3. If successful, the migration runner records `0002_decrees_engagement` in `schema_migrations`.
4. The `down` function, if implemented, would drop the indexes (e.g., `dropIndexes()` or undo specific indexes). Often left empty for index migrations.
5. After this migration, queries for decree engagement data use the new indexes, improving performance.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
