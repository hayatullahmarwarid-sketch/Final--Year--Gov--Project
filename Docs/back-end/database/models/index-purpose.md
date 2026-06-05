<!-- purpose-doc: normalized -->
# Models Index (`index.js`)

## Scenario
In a Mongoose‑based application, all models must be registered before they can be used in queries, population, or migrations. Instead of requiring each model file individually throughout the codebase, a central `index.js` file imports all models (for their side‑effects) and re‑exports nothing. This ensures that as soon as the `models` folder is required, every model is available via `mongoose.models`.

## What it does
The file contains a series of side‑effect imports (using `import './model-name.js'`) for each model in the directory. It does not export anything itself. This pattern is common when models are defined by calling `mongoose.model(...)` at the top level of their respective files, and they need to be executed to register the schema.

## Libraries used
- No external libraries; only relative imports of all model files.

## Logic implemented
1. The file imports the following models (listed in the file):
   - `role.model.js`, `user.model.js`, `refresh-token.model.js`, `decree-category.model.js`, `decree.model.js`, `decree-view.model.js`, `decree-bookmark.model.js`, `decree-version.model.js`, `stored-file.model.js`, `inspection-template.model.js`, `inspection-assignment.model.js`, `inspection-submission.model.js`, `pending-inspection-offline.model.js`, `inspection-evidence-file.model.js`, `exam.model.js`, `exam-question.model.js`, `exam-attempt.model.js`, `certificate.model.js`, `notification.model.js`, `static-content-page.model.js`, `homepage-banner.model.js`, `notification-user-state.model.js`, `audit-log.model.js`, `dashboard-metrics-snapshot.model.js`, `system-platform-settings.model.js`, `device-token.model.js`, `schema-migration.model.js`.
2. Each import executes the model file’s top‑level code, which typically:
   - Defines the schema.
   - Applies plugins.
   - Calls `mongoose.model('ModelName', schema)`.
3. After this index is loaded, all models are registered and can be fetched via `mongoose.model('ModelName')` anywhere in the application.
4. The index itself has no exports because its sole purpose is to trigger those side‑effects.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
