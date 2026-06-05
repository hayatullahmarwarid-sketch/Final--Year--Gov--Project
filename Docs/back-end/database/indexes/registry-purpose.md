<!-- purpose-doc: normalized -->
# Database Index Registry (`registry.js`)

## Scenario
When the back‑end server starts, the database must be ready to handle queries efficiently. Each Mongoose model defines default indexes (e.g., unique constraints, text indexes, compound indexes) as part of its schema. To ensure these indexes are actually created in MongoDB—especially on the first deployment or after schema changes—the server must explicitly synchronise them. This module provides a single function that walks through all registered models and builds any missing indexes, avoiding performance degradation caused by unindexed queries.

## What it does
The module exports `ensureModelIndexes()`, an async function that iterates over all core application models and calls each one’s `createIndexes()` method (or equivalent). It imports the models directly (22 models are listed) and also imports `../models/index.js` for a side‑effect, which likely ensures all models are registered with Mongoose before the indexes are created. It uses `getEnv` to check whether the current environment should enforce index creation (e.g., skipping in ephemeral test environments) and `getLogger` to log progress and any errors encountered during the process.

## Libraries used
- **(implicit) mongoose** – each model inherits `createIndexes()` from Mongoose’s Model class.
- **../../src/config/env.js** (`getEnv`) – provides environment flags (e.g., `NODE_ENV`, `SKIP_INDEXES`).
- **../../src/config/logger.js** (`getLogger`) – logs index creation status.
- **../models/*.model.js** – the application’s Mongoose models, each with pre‑defined schema indexes.

## Logic implemented
1. When `ensureModelIndexes()` is called (usually during server bootstrap after `connectMongo`):
   - It may read `getEnv()` to check if index synchronisation is disabled (e.g., `SKIP_INDEXES=true`). If so, it logs a warning and returns early.
2. It retrieves an array of all models to process, either by importing each explicitly or by obtaining the list from Mongoose’s model registry after the side‑effect import of `../models/index.js`.
3. For each model, it calls `Model.createIndexes()` (or `Model.ensureIndexes()` for older Mongoose). This command:
   - Detects existing indexes in the database.
   - Compares them with the schema definitions.
   - Creates any index that is missing.
   - Does not drop or modify existing indexes unless specifically configured to do so.
4. The function logs the name of each model being processed and whether the indexes were created successfully.
5. If an error occurs for a particular model (e.g., a background index build failure), the error is caught and logged, and the process continues with the next model to avoid a complete startup failure.
6. After all models have been processed, a summary log is written, e.g., “Index synchronisation complete.”
7. The server then considers the database ready for queries that depend on these indexes (e.g., unique lookups, full‑text search on decrees, user email uniqueness).

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
