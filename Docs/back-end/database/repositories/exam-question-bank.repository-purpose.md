<!-- purpose-doc: normalized -->
# Exam Question Bank Repository (`exam-question-bank.repository.js`)

## Scenario
Admins manage question banks—collections of reusable questions. The repository provides listing, creation, and updating of banks, with filtering by tags.

## What it does
Extends `BaseRepository` with `ExamQuestionBankModel`. Uses `mergeFilters` and `parseSortQuery`. Likely methods:
- `findAll({ tags, sort, pagination })` – list banks, optionally filtered by tags.
- `findById(id)` – single bank with populated questions.
- `createBank(data)` / `updateBank(id, data)`.

## Libraries used
- **mongoose**.
- `../models/exam-question-bank.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.
- `../../src/modules/shared/query/mongo-query.helpers.js`.

## Logic implemented
1. `findAll`: merges `tags` filter using `$in`.
2. Sorting via `parseSortQuery`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
