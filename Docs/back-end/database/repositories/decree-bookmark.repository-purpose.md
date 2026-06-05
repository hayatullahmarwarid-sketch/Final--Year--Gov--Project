<!-- purpose-doc: normalized -->
# Decree Bookmark Repository (`decree-bookmark.repository.js`)

## Scenario
A public user wants to see their bookmarked decrees, paginated and sorted by when they were bookmarked. The repository provides queries to list bookmarks for a user, add a bookmark, and remove one.

## What it does
Extends `BaseRepository` with `DecreeBookmarkModel`. Uses `mergeFilters` and `parseSortQuery` (external). Likely methods:
- `findByUser(userId, { sort, pagination })` – retrieves bookmarks for a user, sorted by `createdAt` descending by default.
- `addBookmark(userId, decreeId)` – creates a bookmark if not exists (using upsert or unique constraint).
- `removeBookmark(userId, decreeId)` – soft‑deletes or removes.

## Libraries used
- **mongoose**.
- `../models/decree-bookmark.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.
- `../../src/modules/shared/query/mongo-query.helpers.js` – `parseSortQuery`.

## Logic implemented
1. `findByUser`: filter by `userId` and `deletedAt: null`. Populate `decreeId` to get decree details. Sort using `parseSortQuery`.
2. `addBookmark`: calls `this.create({ userId, decreeId })`. The model’s unique index prevents duplicates.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
