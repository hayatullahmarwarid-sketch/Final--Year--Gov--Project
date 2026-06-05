<!-- purpose-doc: normalized -->
# Role Seeder (`role.seeder.js`)

## Scenario
When the platform is first deployed or a new environment is set up, the database lacks the required roles (e.g., `public`, `inspector`, `inspector_admin`, `system_admin`) and their associated permissions. The application’s role‑based access control (RBAC) relies on these roles being present and correctly configured. This seeder ensures that all roles defined in the `RoleKey` enum exist in the database with their default permissions, making them immediately available for user assignment.

## What it does
The exported `seedRoles` function reads the `RoleKey` enum to get a list of all known roles. For each role key, it retrieves the corresponding `defaultPermissionsByRoleKey` mapping (a set of permissions that each role should have by default, such as `'read:decree'`, `'create:inspection'`, etc.). It then uses the `roleRepository` to either create the role (if it doesn’t exist) or update its permissions to match the current defaults. This operation is idempotent—running it multiple times will not create duplicates and will update permissions if they have changed in a newer version of the application.

## Libraries used
- **../../src/modules/shared/enums/roles.js** – the `RoleKey` enumeration (e.g., `PUBLIC`, `INSPECTOR`, `INSPECTOR_ADMIN`, `SYSTEM_ADMIN`).
- **../../src/core/security/rbac-placeholders.js** – `defaultPermissionsByRoleKey` object mapping each role key to an array of permission strings.
- **../repositories/role.repository.js** – `roleRepository` with methods like `findByKey` and `create`/`update`.

## Logic implemented
1. The function iterates over the values in `RoleKey`.
2. For each key, it looks up `defaultPermissionsByRoleKey[key]` (or an equivalent fallback).
3. It attempts to find an existing role using `roleRepository.findByKey(key)`.
4. If the role does not exist, it creates it with `roleRepository.createRole({ key, label, permissions })` where `label` might be derived from the key or a separate mapping.
5. If the role already exists, it checks whether the stored permissions differ from the default. If they do, it updates the role’s permissions using `roleRepository.updateRole(id, { permissions })`.
6. The function may log each creation/update action for audit purposes.
7. After processing all roles, the database contains the minimal set of roles required for the platform to function.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
