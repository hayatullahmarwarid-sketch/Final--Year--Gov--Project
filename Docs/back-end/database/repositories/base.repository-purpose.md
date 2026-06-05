<!-- purpose-doc: normalized -->
# Base Repository (`base.repository.js`)

## Scenario
Every domain repository needs a set of common CRUD operations—find by ID, find with filters, paginate, create, update, soft‑delete—without repeating the same Mongoose boilerplate. The `BaseRepository` provides those generic methods, so that all other repositories simply extend it and add domain‑specific queries.

## What it does
The class is a generic base that receives a Mongoose model and exposes:
- `findById(id, options)` – finds a document by `_id` with optional population/select.
- `findOne(filters, options)` – generic single‑document query.
- `find({ filters, sort, offset, limit, populate })` – list query with pagination.
- `create(data)` / `insertMany(docs)` – create new documents.
- `updateById(id, update, options)` – update a document by ID (typically `findByIdAndUpdate`).
- `softDeleteById(id, deletedAt?)` – sets `deletedAt` to a date.
- `count(filters)` – counts documents matching filters.

It does not import any project‑specific helpers; its logic relies on Mongoose’s built‑in methods. Subclasses then add methods like `findPublishedDecrees` etc.

## Libraries used
- **mongoose** (implicit) – the model instance passed to the constructor.

## Logic implemented
1. The constructor receives a Mongoose model and stores it.
2. Methods are thin wrappers that call the model’s static methods (`find`, `findOne`, `create`, etc.), applying consistent defaults (e.g., always excluding soft‑deleted by default via `{ deletedAt: null }` where appropriate).
3. Pagination is handled by refactoring `offset`/`limit` from helpers.
4. Subclasses use `mergeFilters` to add domain conditions (like `lifecycle = 'PUBLISHED'`) to the base query.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
