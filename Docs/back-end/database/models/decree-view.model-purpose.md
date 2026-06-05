<!-- purpose-doc: normalized -->
# Decree View Model (`decree-view.model.js`)

## Scenario
Each time a user reads a decree, a view record is created to track engagement. The system uses these records to count total views per decree, and after migration #0005, multiple views per user per decree are allowed to distinguish unique readers from repeat reads. Analytics queries aggregate these records to show popular decrees and user engagement patterns.

## What it does
Defines a schema with `decreeId`, `viewerUserId`, `viewedAt`, and possibly `sessionId`. Applies `standardDomainPlugin`. Exported as `DecreeViewModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `decreeId`: ObjectId, ref: `'Decree'`.
   - `viewerUserId`: ObjectId, ref: `'User'`.
   - `viewedAt`: Date, default now.
   - `sessionId`: optional String.
2. Originally had unique compound index on `decreeId + viewerUserId`. Migration #0005 drops that unique constraint and creates a non‑unique compound index for efficient lookups of all views by decree and user.
3. Plugin adds `tenantId`, `deletedAt`.
4. Used in aggregate queries for view counts, often grouped by `decreeId`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
