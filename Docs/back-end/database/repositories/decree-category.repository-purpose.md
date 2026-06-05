<!-- purpose-doc: normalized -->
# Decree Category Repository (`decree-category.repository.js`)

## Scenario
Categories are used to organise decrees. The public UI lists all active categories; the admin manages them (create, edit, delete). The repository supports these queries.

## What it does
Extends `BaseRepository` with `DecreeCategoryModel`. Uses `mergeFilters`. Likely methods:
- `findAllActive()` – returns categories not soft‑deleted.
- `findBySlug(slug)` – for URL-based lookups.
- `createCategory(data)` / `updateCategory(id, data)`.

## Libraries used
- **mongoose**.
- `../models/decree-category.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.

## Logic implemented
1. `findAllActive` merges `{ deletedAt: null }`.
2. Base CRUD operations handle the rest.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
