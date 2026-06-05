<!-- purpose-doc: normalized -->
# Decree Views Multiple Entries Per User Migration (`0005_decree_views_engagement_many_per_user.mjs`)

## Scenario
Originally, the `decree_views` collection had a unique compound index on `(decreeId, viewerUserId)`, ensuring one view record per user per decree. The engagement model changed: each qualified read session should produce a new row, even for the same user and decree, to track multiple reads over time. This migration removes that unique constraint and replaces it with a non‑unique index, allowing multiple entries per user per decree. After this, analytics queries can count sessions instead of just unique viewers.

## What it does
The migration operates on `DecreeViewModel`. In the `up` function, it drops the existing unique index on `{ decreeId: 1, viewerUserId: 1 }` (if present) and then calls `syncIndexes()` to create the new non‑unique index defined in the updated schema (e.g., plain compound index without unique). The `down` function should reverse this—re‑create the unique index and drop the non‑unique one. It logs actions via the provided `logger`. The migration is safe because `syncIndexes` will not recreate a unique index if the schema no longer defines one, but dropping an existing unique index requires an explicit drop command.

## Libraries used
- **mongoose** – `syncIndexes()` and methods for dropping indexes.
- **../models/decree-view.model.js** – the updated model.

## Logic implemented
1. `up` logs the start.
2. It attempts to drop the existing unique index by name (or fields) if it exists. This requires handling potential errors if the index is already missing.
3. Then it calls `DecreeViewModel.syncIndexes()`. Since the schema no longer has the unique constraint, Mongoose will not recreate it; it will create the new non‑unique index if needed.
4. After success, the migration runner records `0005_decree_views_engagement_many_per_user`.
5. The `down` function reverses the operation: drop the non‑unique index, re‑create the unique index (using Mongoose’s `createIndexes` or direct call).
6. The comment emphasizes that the model file `decree-view.model.js` should be updated before running this migration.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
