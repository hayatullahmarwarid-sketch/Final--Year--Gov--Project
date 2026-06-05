<!-- purpose-doc: normalized -->
# Decree Category Model (`decree-category.model.js`)

## Scenario
Decrees are organised into categories (e.g., “Education”, “Health”, “Finance”). This model allows administrators to manage those categories—create, rename, delete—and public users to browse decrees by category.

## What it does
Defines a schema with `name` (localised or a single string), `slug` (URL‑friendly), and optionally `description`. Applies `standardDomainPlugin`. Exported as `DecreeCategoryModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `name`: String, required.
   - `slug`: String, unique, generating from name.
   - `description`: optional String.
2. Unique index on `slug`.
3. Plugin adds multi‑tenant and soft‑delete.
4. Typically queried with `deletedAt: null` for active categories.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
