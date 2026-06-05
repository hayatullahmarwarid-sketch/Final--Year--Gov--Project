<!-- purpose-doc: normalized -->
# Decree Model (`decree.model.js`)

## Scenario
Decrees are the heart of the public‑facing content. Government officials upload decrees, categorise them, assign lifecycle statuses (draft, published, archived), and store the full text along with metadata (title, number, date, PDF file reference). Public users browse and download published decrees. The model must support versioning (stored separately) and engagement tracking (views, downloads).

## What it does
Defines a Mongoose schema for decrees, including `title`, `decreeNumber`, `categoryId`, `lifecycle` (enum from `DECREE_LIFECYCLE_KEYS`), `body` (or a reference to stored file), `publishedAt`, `createdBy`, and engaging counters (views, downloads) or links to separate engagement collections. It applies `standardDomainPlugin`. The model is exported as `DecreeModel`.

## Libraries used
- **mongoose** – schema and model.
- **../../src/modules/shared/enums/decree-lifecycle.js** – lifecycle enum.
- **./plugins/standard-domain.plugin.js** – multi‑tenant, soft‑delete, index.

## Logic implemented
1. Schema fields:
   - `title`: String, required, text‑indexed for search.
   - `decreeNumber`: String, unique.
   - `categoryId`: ObjectId, ref: `'DecreeCategory'`.
   - `lifecycle`: enum from `DECREE_LIFECYCLE_KEYS`.
   - `body`: String (or ObjectId referencing `StoredFile`).
   - `publishedAt`: Date.
   - `createdBy`: ObjectId, ref: `'User'`.
   - Optional counters for `viewCount`, `downloadCount`.
2. Indexes:
   - Text index on `title`, `body` for full‑text search.
   - `categoryId + lifecycle + publishedAt` for listing.
   - `decreeNumber` unique.
3. `standardDomainPlugin` adds `tenantId` and soft‑delete support.
4. Version history is handled by `DecreeVersionModel`, not in this schema.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
