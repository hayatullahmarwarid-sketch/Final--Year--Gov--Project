<!-- purpose-doc: normalized -->
# Exam Attempt Model (`exam-attempt.model.js`)

## Scenario
When an inspector starts an exam, an attempt record is created. It stores the inspector's answers, the exam reference, start and end times, the score achieved, and the status (in‑progress, completed, passed, failed). Admins can review attempts and statistics.

## What it does
Schema with `userId`, `examId`, `answers` (array of selected option indices or question answers), `startedAt`, `submittedAt`, `score`, `total`, `status` (enum from `EXAM_ATTEMPT_STATUS_KEYS`). Applies `standardDomainPlugin`. Exported as `ExamAttemptModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/exam-attempt-status.js**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `userId`: ObjectId, ref: `'User'`.
   - `examId`: ObjectId, ref: `'Exam'`.
   - `answers`: [Mixed] – array of answer objects with `questionId` and `selected`.
   - `startedAt`, `submittedAt`: Date.
   - `score`: Number.
   - `total`: Number.
   - `status`: enum.
2. Indexes: `userId + examId` for duplicate prevention? Not unique, as retakes allowed. But can have an index for listing attempts per user per exam.
3. Compound index on `examId + status` for results aggregation.
4. Plugin adds multi‑tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
