<!-- purpose-doc: normalized -->
# Role Model (`role.model.js`)

## Scenario
Role‑based access control relies on a defined set of roles. This model stores the available roles (e.g., `public`, `inspector`, `inspector_admin`, `system_admin`) along with their display names and permissions. The system uses these roles to restrict access to routes and functionality.

## What it does
Schema with `key` (enum from `ROLE_KEYS`), `label`, `permissions` (array of strings or Mixed). Exported as `RoleModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/roles.js**.

## Logic implemented
1. Fields:
   - `key`: String, enum of role keys, unique.
   - `label`: String (display name).
   - `permissions`: [String] (list of rights).
2. Unique index on `key`.
3. Seeded on first run; rarely changed afterward.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
