<!-- purpose-doc: normalized -->
# Inspection Template Repository (`inspection-template.repository.js`)

## Scenario
Admin manages templates (active/inactive). The repository provides listing of active templates, full CRUD, and possibly cloning.

## What it does
Extends `BaseRepository` with `InspectionTemplateModel`. Uses `mergeFilters`. Likely methods:
- `findActive({ category? })` – templates that are active and not deleted.
- `findById(id)` – single template with fields.
- `createTemplate(data)` / `updateTemplate(id, data)`.

## Libraries used
- **mongoose**.
- `../models/inspection-template.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.

## Logic implemented
1. `findActive`: merges `{ active: true, deletedAt: null }` plus optional category.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
