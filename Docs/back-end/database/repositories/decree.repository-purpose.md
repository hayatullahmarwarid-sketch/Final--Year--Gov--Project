<!-- purpose-doc: normalized -->
# Decree Repository (`decree.repository.js`)

## Scenario
Decrees are the core content. The public API needs paginated lists of published decrees, optionally filtered by category. The admin needs all decrees (including drafts). The repository provides these queries and incorporates the decree lifecycle enum.

## What it does
Extends `BaseRepository` with `DecreeModel`. Uses `mergeFilters` and `DecreeLifecycle` enum. Likely methods:
- `findPublished({ categoryId, search, sort, pagination })` – returns only published decrees, with optional category filter and text search.
- `findAllByAdmin({ lifecycle, categoryId, sort, pagination })` – for admin management, filters by lifecycle if provided.
- `findById(id)` – single decree.
- `createDecree(data)` / `updateDecree(id, data)`.

## Libraries used
- **mongoose**.
- `../models/decree.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.
- `../../src/modules/shared/enums/decree-lifecycle.js`.

## Logic implemented
1. `findPublished`: merges `{ lifecycle: DecreeLifecycle.PUBLISHED }` with other filters.
2. Supports text search via `$text: { $search: query }`.
3. Pagination via base class.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
