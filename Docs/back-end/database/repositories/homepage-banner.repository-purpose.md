<!-- purpose-doc: normalized -->
# Homepage Banner Repository (`homepage-banner.repository.js`)

## Scenario
The public home screen displays active banners. The admin manages banners (create, edit, reorder, deactivate). The repository provides queries for active banners sorted by order, and full CRUD.

## What it does
Extends `BaseRepository` with `HomepageBannerModel`. Uses `mergeFilters`. Likely methods:
- `findActiveBanners()` – returns banners with `active: true` and `deletedAt: null`, sorted by `order`.
- `createBanner(data)` / `updateBanner(id, data)`.

## Libraries used
- **mongoose**.
- `../models/homepage-banner.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.

## Logic implemented
1. `findActiveBanners`: filter `{ active: true }`, sort `{ order: 1 }`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
