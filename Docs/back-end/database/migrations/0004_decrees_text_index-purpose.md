<!-- purpose-doc: normalized -->
# Decrees Text Search Index Migration (`0004_decrees_text_index.mjs`)

## Scenario
The unified search feature for public decrees requires full‑text search across decree titles, descriptions, and perhaps body text. MongoDB’s text indexes allow efficient keyword searches. The `Decree` schema was updated to define a text index covering the relevant fields. This migration creates that index on existing deployments.

## What it does
The `up` function calls `syncIndexes()` on `DecreeModel`. The schema now includes a `schema.index({ title: 'text', description: 'text', ... })` declaration. The migration ensures that the text index is built. This might be a slow operation on large collections, but it is necessary for search to work. The `down` function could drop the text index if required.

## Libraries used
- **mongoose** – `syncIndexes()`.
- **../models/decree.model.js** – the decree model with the text index.

## Logic implemented
1. `up` calls `DecreeModel.syncIndexes()`.
2. Mongoose compares existing indexes with the schema’s text index definition and creates it if missing.
3. Once created, `getUnifiedSearch` (or similar API) can use `$text: { $search: query }` to return relevant decrees.
4. The migration runner records the migration.
5. No other models are affected.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
