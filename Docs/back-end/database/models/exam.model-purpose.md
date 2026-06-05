<!-- purpose-doc: normalized -->
# Exam Model (`exam.model.js`)

## Scenario
Inspector administrators create exams to test the knowledge of inspectors. An exam can be in draft, active, or archived state. It holds a title, description, passing score, and a list of questions (either embedded or referenced via `ExamQuestionBank` / `ExamQuestionModel`). Inspectors take exams; attempts are stored in `ExamAttemptModel`.

## What it does
Defines a schema with `title`, `description`, `lifecycle` (enum from `EXAM_LIFECYCLE_KEYS`), `passingPercent`, `allowedRoles` (enum from `ROLE_KEYS`), `questions` (array of question IDs), and timestamps. Applies `standardDomainPlugin`. Exported as `ExamModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/exam-lifecycle.js**.
- **../../src/modules/shared/enums/roles.js**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `title`: String, required.
   - `description`: optional.
   - `lifecycle`: enum, default `'DRAFT'`.
   - `passingPercent`: Number, default 70.
   - `allowedRoles`: [String] from roles enum (who can take this exam).
   - `questions`: [ObjectId, ref: `'ExamQuestion'`].
   - `durationMinutes`: Number (time limit).
2. Indexes: `lifecycle + allowedRoles` for fetching exams available to a inspector.
3. Plugin adds `tenantId` and soft‑delete.
4. Conditional model export.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
