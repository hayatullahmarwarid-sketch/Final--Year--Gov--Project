<!-- purpose-doc: normalized -->
# Static Content Page Repository (`static-content-page.repository.js`)

## Scenario
The app serves static pages like "About" or "Terms". The repository provides queries to get published pages by slug and language, and admin CRUD.

## What it does
Extends `BaseRepository` with `StaticContentPageModel`. Uses `mergeFilters`. Likely methods:
- `findPublishedBySlug(slug, language?)` – finds a page with `status: 'PUBLISHED'` and matching slug/language.
- `findAll({ status, slug, pagination })` – admin query.
- `createPage(data)` / `updatePage(id, data)`.

## Libraries used
- **mongoose**.
- `../models/static-content-page.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.

## Logic implemented
1. `findPublishedBySlug`: merges `{ slug, status: 'PUBLISHED' }` and `language` if provided.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
