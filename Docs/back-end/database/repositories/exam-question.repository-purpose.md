<!-- purpose-doc: normalized -->
# Exam Question Repository (`exam-question.repository.js`)

## Scenario
Questions are created, edited, and listed. The repository provides CRUD operations and listing with optional filtering by type.

## What it does
Extends `BaseRepository` with `ExamQuestionModel`. Likely methods:
- `findByType(type?)` – list questions optionally filtered by type.
- `findById(id)` – get a question.
- `createQuestion(data)` / `updateQuestion(id, data)`.

## Libraries used
- **mongoose**.
- `../models/exam-question.model.js`.
- `./base.repository.js`.

## Logic implemented
Standard CRUD; `findByType` adds `{ type }` if provided.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
