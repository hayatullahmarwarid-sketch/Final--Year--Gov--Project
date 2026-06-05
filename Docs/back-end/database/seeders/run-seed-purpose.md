<!-- purpose-doc: normalized -->
# Seed Runner (`run-seed.js`)

## Scenario
During initial application setup (e.g., in a CI/CD pipeline, a fresh deployment, or a developer’s local environment), all seeders must be executed in the correct order. This module provides a single entry point—`runAllSeeders`—that orchestrates the seeding process. Currently it invokes the role seeder, but it can easily be extended to include seeders for other entities (e.g., default system settings, a root admin user, sample categories).

## What it does
The exported `runAllSeeders` function currently imports and calls `seedRoles` from `./role.seeder.js`. The function is designed to be called after the database connection is established (e.g., from a startup script or a dedicated `npm run seed` command). It can be extended to run additional seeders in sequence, and it returns a promise that resolves when all seeders have completed. If a seeder fails, the error can be caught and logged, allowing the process to either stop or continue depending on the desired behavior.

## Libraries used
- **./role.seeder.js** – the `seedRoles` function that populates roles and permissions.

## Logic implemented
1. When `runAllSeeders()` is called:
   - It logs a message indicating that seeding has started.
   - It calls `await seedRoles()`.
   - If additional seeders are added in the future (e.g., `seedAdminUser()`, `seedCategories()`), they would be called sequentially after roles, because roles often form the basis for user or entity creation.
2. Any error thrown during seeding is logged and may be re‑thrown to stop the process, or captured to allow partial seeding with a warning.
3. Once all seeders have completed, a final “Seeding complete” message is logged.
4. The function can be invoked directly from a script (e.g., `node -e "require('./run-seed').runAllSeeders()"`) or imported into the main server startup flow when the `SEED_ON_START` environment variable is set.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
