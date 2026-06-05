<!-- purpose-doc: normalized -->
# Exam Question Model (`exam-question.model.js`)

## Scenario
Exam questions are created by inspector admins and can be reused across exams. Each question has a type (multiple‑choice, true/false, text), a stem, a list of options, and a correct answer. Questions can be edited independently of exams, and they are linked to an exam via the exam’s `questions` array.

## What it does
Schema with `type` (enum `EXAM_QUESTION_TYPE_KEYS`), `stem`, `options` (array of strings), `correctOptionIndex` (or `correctAnswer`), and `explanation`. Applies `standardDomainPlugin`. Exported as `ExamQuestionModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/exam-question-type.js**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `type`: enum, required.
   - `stem`: String, required.
   - `options`: [String], required for MCQ types.
   - `correctOptionIndex`: Number, or `correctAnswer`: Mixed.
   - `explanation`: optional String.
2. Index on `type` and perhaps `stem` for text search.
3. `standardDomainPlugin` adds tenant scoping.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
