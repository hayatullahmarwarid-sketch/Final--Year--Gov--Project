<!-- purpose-doc: normalized -->
# Migration Runner Script (`run.js`)

## Scenario
The project uses a series of numbered migration files (`.mjs`) to evolve the database schema and indexes over time. Running these manually is error‑prone. This script provides a command‑line interface to:
- Apply all pending migrations in order.
- Show the current migration status without making changes.
- Revert the most recently applied migration (for emergency rollbacks).

It is designed for use with `npm run db:migrate`, `npm run db:migrate:status`, or `npm run db:migrate:down`. The runner connects to MongoDB, reads the migration directory, and tracks which migrations have been applied via the `schema_migrations` collection.

## What it does
The script is a Node.js executable that uses `dotenv` to load environment variables, then orchestrates the migration lifecycle. Its key steps:

1. **Parses command‑line arguments** to determine the action: migrate, status, or down (not shown in imports but deduced from usage).
2. **Connects to MongoDB** via `connectMongo()`.
3. **Reads migration files** from the current directory (or a configured folder) using `node:fs` and `node:path`. It filters for `.mjs` files and sorts them lexicographically by filename (e.g., `0001_...`, `0002_...`).
4. **Queries `SchemaMigrationModel`** to find which migrations have already been applied.
5. For **`migrate`**:
   - Finds unapplied migrations (files whose exported `name` is not in the applied list).
   - For each pending migration, it dynamically imports the module, calls its `up` function passing an object with `logger` (from `getLogger`), and if successful, inserts a record into `SchemaMigrationModel` with the migration name.
   - If a migration fails, it stops the run and disconnects.
6. For **`status`**:
   - Lists all migration files and marks them as applied/pending, printing a summary.
7. For **`down`**:
   - Finds the most recently applied migration (based on the `appliedAt` timestamp in `schema_migrations`).
   - Imports that migration module, calls its `down` function, and removes the record from `SchemaMigrationModel`.
8. **Disconnects** from MongoDB via `disconnectMongo()`, regardless of success or failure (graceful cleanup).
9. The script uses `node:os` and `node:url` for host information and path resolution.

## Libraries used
- **dotenv** – loads environment variables from `.env`.
- **mongoose** – used implicitly via `connectMongo`/`disconnectMongo` and `SchemaMigrationModel`.
- **node:fs** – reads directory contents.
- **node:path** – resolves and joins file paths.
- **node:url** – converts file URLs to paths (for ESM compatibility).
- **node:os** – may provide host info for logging.
- **../connection/mongoose.js** – `connectMongo`, `disconnectMongo`.
- **../models/schema-migration.model.js** – `SchemaMigrationModel` for tracking applied migrations.
- **../../src/config/logger.js** – `getLogger` to provide a logger instance to migrations.

## Logic implemented
1. Load `.env` via `dotenv`.
2. Determine action from `process.argv` (e.g., `--down`, `--status` or default to migrate).
3. `async main()`:
   - Call `connectMongo()`.
   - Read migration folder, collect `.mjs` files sorted by name.
   - Fetch applied migration names from `SchemaMigrationModel.find({}).lean()`.
   - If action is `status`: print each file and its status.
   - If action is `migrate`:
     - For each pending file:
       - Dynamic import: `const mod = await import(fileUrl)`.
       - If mod.name exists and mod.up:
         - Log “Applying migration: mod.name”.
         - `await mod.up({ logger: getLogger() })`.
         - `await SchemaMigrationModel.create({ name: mod.name, appliedAt: new Date() })`.
       - On error, log and break.
   - If action is `down`:
     - Get the most recent migration record by `appliedAt` descending.
     - Import that migration and call `mod.down({ logger })`.
     - Delete the record.
   - Finally `await disconnectMongo()`.
   - If any migration fails, exit with code 1.
4. The script is idempotent and safe to run repeatedly; only new migrations are applied.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
