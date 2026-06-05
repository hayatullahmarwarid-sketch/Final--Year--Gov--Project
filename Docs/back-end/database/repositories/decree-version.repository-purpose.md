<!-- purpose-doc: normalized -->
# Decree Version Repository (`decree-version.repository.js`)

## Scenario
When a decree is updated, a new version is created. Users viewing a decree may want to see its version history, and admins may view all versions. The repository provides queries for a decree’s versions, and supports creating new versions.

## What it does
Extends `BaseRepository` with `DecreeVersionModel`. Uses `mergeFilters` and `excludeDeleted` filter (from constants). Likely methods:
- `findByDecree(decreeId, { includeDrafts, sort })` – lists versions for a decree, optionally including drafts.
- `createVersion({ decreeId, versionNumber, body, ... })`.
- `findLatestPublished(decreeId)` – latest version with publication status published.

## Libraries used
- **mongoose**.
- `../models/decree-version.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.
- `../../src/modules/shared/constants/query-filters.js` – `excludeDeleted`.

## Logic implemented
1. `findByDecree`: merges `{ decreeId, ...excludeDeleted }` and optionally adds `{ publication: 'PUBLISHED' }`.
2. Sorting by `versionNumber` descending.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
