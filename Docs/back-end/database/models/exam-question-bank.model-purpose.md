<!-- purpose-doc: normalized -->
# Exam Question Bank Model (`exam-question-bank.model.js`)

## Scenario
To help administrators build exams faster, they can create question banks—collections of tagged questions. An exam can pull random questions from a bank rather than using a fixed list. This model stores a bank with a name, optional tags, and a list of question IDs.

## What it does
Schema with `name`, `tags` (array of strings), `questions` (array of ObjectId ref to `ExamQuestion`). Applies `standardDomainPlugin` and uses `EXAM_QUESTION_TYPE_KEYS` (maybe for filtering ability). Exported as `ExamQuestionBankModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/exam-question-type.js**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `name`: String.
   - `tags`: [String].
   - `questions`: [ObjectId, ref: `'ExamQuestion'`].
2. Index on `tags` and `name`.
3. Plugin adds tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
