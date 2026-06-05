<!-- purpose-doc: normalized -->
# Schema Migration Model (`schema-migration.model.js`)

## Scenario
The migration runner uses this model to record which migrations have been applied to the database. Each record contains the migration name and the timestamp when it was applied. Before running a migration, the runner checks this collection to see if the migration already ran, ensuring idempotency.

## What it does
Schema with `name` (string) and `appliedAt` (Date). No plugins imported. Exported as `SchemaMigrationModel`.

## Libraries used
- **mongoose**.

## Logic implemented
1. Fields:
   - `name`: String, unique, required.
   - `appliedAt`: Date, default now.
2. Unique index on `name`.
3. The migration runner inserts a record after each successful migration.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
