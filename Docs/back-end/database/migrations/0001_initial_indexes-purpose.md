<!-- purpose-doc: normalized -->
# Baseline Index Migration (`0001_initial_indexes.mjs`)

## Scenario
The project has just been deployed to a fresh environment. The MongoDB database is empty, but the Mongoose schemas define various indexes—unique constraints, text indexes, compound indexes—that must exist in the database for queries to be efficient and constraints to be enforced. This migration ensures that every collection gets its indexes created in a single, controlled step. After this migration runs, the server can start with `autoIndex: false` in production, avoiding runtime index creation overhead. It is safe to re‑run because Mongoose idempotently reconciles indexes; running it again will only create missing ones.

## What it does
The migration exports a `name` and two lifecycle functions: `up` and `down`. The `up` function:

1. Ensures all models are registered (via the side‑effect import of `../models/index.js`).
2. Iterates through every application model listed in the imports (22 models, from `UserModel` to `SchemaMigrationModel`).
3. For each model, calls `syncIndexes()` (or equivalent) which:
   - Reads existing indexes in the database.
   - Creates any that are defined in the schema but missing.
   - Does not drop indexes that already exist.
4. Logs progress and any errors via the `logger` object passed in.
5. Records the migration as applied in the `schema_migrations` collection (handled by the migration runner, not in the migration itself).

The `down` function is typically empty or minimal for an initial index migration, as reverting indexes is often unnecessary or destructive.

## Libraries used
- **(implicit) mongoose** – each model uses Mongoose’s `syncIndexes()` method.
- **../models/index.js** – imports for side‑effect; ensures all models are registered with Mongoose.
- **../models/*.model.js** – the models whose indexes are to be created:
  - `UserModel`, `RefreshTokenModel`, `AuditLogModel`, `StoredFileModel`, `DecreeModel`, `DecreeCategoryModel`, `DecreeVersionModel`, `DecreeBookmarkModel`, `InspectionTemplateModel`, `InspectionAssignmentModel`, `InspectionSubmissionModel`, `InspectionEvidenceFileModel`, `ExamModel`, `ExamQuestionModel`, `ExamAttemptModel`, `CertificateModel`, `NotificationModel`, `NotificationUserStateModel`, `StaticContentPageModel`, `HomepageBannerModel`, `DashboardMetricsSnapshotModel`, `SystemPlatformSettingsModel`, `RoleModel`, `SchemaMigrationModel`.

## Logic implemented
1. The `up` function receives a `logger` object for structured logging.
2. A side‑effect import guarantees that Mongoose knows about all schemas before `syncIndexes` is called.
3. It loops through the listed model objects. For each model, it logs “Syncing indexes for <ModelName>” and calls `Model.syncIndexes()`.
4. If a model’s `syncIndexes` succeeds, the migration continues. If it fails, the error is logged, and the process may stop, depending on the migration runner’s error handling.
5. Once all models are processed, the function returns. The migration runner then records this migration’s `name` in the `schema_migrations` collection, preventing it from running again.
6. After this migration, the server is configured with `autoIndex: false` in production. No further `syncIndexes()` calls are made at boot; future schema changes are handled by subsequent migrations.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
