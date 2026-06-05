<!-- purpose-doc: normalized -->
# Decree Category Serializer (`decree-category.serializer.js`)

## Scenario
Decree categories (e.g., “Education”, “Health”) appear in multiple API responses—as a nested object inside a decree, as a list when browsing categories, or as a reference when filtering. The serializer ensures that every category is represented in a consistent, client‑friendly format, handling cases where the input may be `null` or `undefined` (gracefully returning `null`).

## What it does
Exports `serializeDecreeCategory(row)`, which takes a category plain object (from a lean Mongoose query or `toObject()`) and returns a formatted object containing:
- `id` (string)
- `name`
- `slug` (for URL use)
- `description` (if available)
- `createdAt`, `updatedAt` (ISO strings)
- Possibly `deletedAt` if the category is soft‑deleted (or omitted entirely based on business rules).

The comment indicates that the input `row` can be `null` or `undefined`, so the function likely returns `null` immediately in that case.

## Libraries used
- None – pure JavaScript transformation.

## Logic implemented
1. If `row` is nullish, return `null`.
2. Build an object with fields:
   ```js
   {
     id: row._id?.toString(),
     name: row.name,
     slug: row.slug,
     description: row.description ?? '',
     createdAt: row.createdAt?.toISOString(),
     updatedAt: row.updatedAt?.toISOString(),
   }

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Decree upload department APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
