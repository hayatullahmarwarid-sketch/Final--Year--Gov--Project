<!-- purpose-doc: normalized -->
# Role Repository (`role.repository.js`)

## Scenario
Roles are seeded once and rarely changed. The repository provides simple lookup methods to find roles by key or list all.

## What it does
Extends `BaseRepository` with `RoleModel`. Likely methods:
- `findByKey(key)` – finds role by its unique key.
- `findAll()` – returns all roles.
- `createRole(data)` (for seeding).

## Libraries used
- `../models/role.model.js`.
- `./base.repository.js`.

## Logic implemented
Standard CRUD; `findByKey` uses `{ key }`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
