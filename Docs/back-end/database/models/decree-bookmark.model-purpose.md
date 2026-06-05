<!-- purpose-doc: normalized -->
# Decree Bookmark Model (`decree-bookmark.model.js`)

## Scenario
Public users can bookmark decrees to read later. This model stores the relationship between a user and a decree, along with a timestamp. It allows the app to display a list of bookmarked decrees, paginated and sorted by when they were bookmarked.

## What it does
Defines a simple schema with `userId`, `decreeId`, and `createdAt`. Applies `standardDomainPlugin`. Exported as `DecreeBookmarkModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `userId`: ObjectId, required, ref: `'User'`.
   - `decreeId`: ObjectId, required, ref: `'Decree'`.
   - `createdAt`: Date, default now.
2. Unique compound index on `userId + decreeId` to prevent duplicate bookmarks.
3. Index on `userId` for fast retrieval of user’s bookmarks.
4. Plugin adds `tenantId` and `deletedAt` if needed; bookmarks could be soft‑deleted.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
