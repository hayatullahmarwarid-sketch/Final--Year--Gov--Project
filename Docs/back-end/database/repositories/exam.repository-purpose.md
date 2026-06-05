<!-- purpose-doc: normalized -->
# Exam Repository (`exam.repository.js`)

## Scenario
Inspector admins manage exams; inspectors fetch available exams. The repository provides queries filtered by lifecycle (draft/active), and sorts/listings.

## What it does
Extends `BaseRepository` with `ExamModel`. Uses `mergeFilters` and `ExamLifecycle`. Likely methods:
- `findAvailable({ roles, sort, pagination })` – active exams allowed for given role(s).
- `findAll({ lifecycle, sort, pagination })` – admin query.
- `findByIdWithQuestions(id)` – populate questions.

## Libraries used
- **mongoose**.
- `../models/exam.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.
- `../../src/modules/shared/enums/exam-lifecycle.js`.

## Logic implemented
1. `findAvailable`: filter `{ lifecycle: ExamLifecycle.ACTIVE, allowedRoles: { $in: roles } }`.
2. `findAll` can include lifecycle filter.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
