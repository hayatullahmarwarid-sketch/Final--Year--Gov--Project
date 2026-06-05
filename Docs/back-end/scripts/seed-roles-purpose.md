<!-- purpose-doc: normalized -->
# Role Seeding Script (`seed-roles.js`)

## Scenario
In a fresh deployment or when resetting a staging environment, the database must contain the essential roles and their permissions before the server can start. This script is the entry point to initialise the database with roles, and optionally to ensure all model indexes are built. It is run manually or as part of a CI/CD pipeline. Running it is safe even after roles already exist because the underlying seeder is idempotent.

## What it does
The script performs a sequence of bootstrapping operations:

1. Loads environment variables (`dotenv`).
2. Connects to MongoDB using `connectMongo()`.
3. Optionally (based on the detected heuristic “Ensures database indexes are applied at startup”), it calls `ensureModelIndexes()` to create any missing indexes across all models before seeding.
4. Calls `runAllSeeders()`, which currently invokes the role seeder (`seedRoles`). This ensures the `RoleKey` roles exist and have the default permissions.
5. Logs success or failure via `getLogger()`.
6. Disconnects from MongoDB with `disconnectMongo()`.

The script does not export any functions; it simply executes the steps when run.

## Libraries used
- **dotenv** – loads `.env`.
- **../src/config/logger.js** – `getLogger()` for structured logging.
- **../database/connection/mongoose.js** – `connectMongo`, `disconnectMongo`.
- **../database/indexes/registry.js** – `ensureModelIndexes()` to build indexes.
- **../database/seeders/run-seed.js** – `runAllSeeders()` which runs `seedRoles` (and potentially other seeders).

## Logic implemented
1. `dotenv.config()` ensures `MONGODB_URI` is available.
2. `await connectMongo()` establishes the database connection.
3. `await ensureModelIndexes()` builds any missing indexes. This step may be skipped if an environment variable like `SKIP_INDEXES` is set.
4. `await runAllSeeders()` executes the role seeder (and any future seeders). Each role is created or updated with permissions from `defaultPermissionsByRoleKey`.
5. A final log message indicates success.
6. In any error scenario, the error is logged using `getLogger().error(...)`, and the process exits with code 1 after disconnecting.
7. `await disconnectMongo()` gracefully closes the connection.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
