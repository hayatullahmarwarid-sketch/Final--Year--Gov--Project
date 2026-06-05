<!-- purpose-doc: normalized -->
# Exam Attempt Repository (`exam-attempt.repository.js`)

## Scenario
Inspectors start and submit exam attempts; admins view attempts for grading. The repository provides methods to create attempts, update answers, and fetch attempts by user or exam.

## What it does
Extends `BaseRepository` with `ExamAttemptModel`. Uses `mergeFilters` and `ExamAttemptStatus`. Likely methods:
- `createAttempt(userId, examId)` – creates a new attempt with status `IN_PROGRESS`.
- `updateAnswers(attemptId, answers)` – updates the `answers` array.
- `submitAttempt(attemptId, score, total)` – updates status to `COMPLETED` and sets score.
- `findByUser(userId, { status, pagination })` – list a user’s attempts.
- `findByExam(examId, { status, pagination })` – admin view.

## Libraries used
- **mongoose**.
- `../models/exam-attempt.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.
- `../../src/modules/shared/enums/exam-attempt-status.js`.

## Logic implemented
1. `createAttempt`: `this.create({ userId, examId, status: AttemptStatus.IN_PROGRESS, startedAt: new Date() })`.
2. `submitAttempt`: `this.updateById(id, { status: COMPLETED, submittedAt, score, total })`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
