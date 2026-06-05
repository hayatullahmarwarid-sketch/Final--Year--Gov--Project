<!-- purpose-doc: normalized -->
# Exam Content (`exam-content.ts`)

## Scenario

Bundled or typed **data modules** are loaded when features need catalogues, stores, or model shapes shared across the app.

## What it does

The file exports the following surface (representative `export` lines):

- `export type ExamQuestionType = 'mcq' | 'tf';`
- `export type ExamMcqOption = { key: string; label: string; serverKey?: string };`
- `export type ExamQuestionMcq = {`
- `export type ExamQuestionTf = {`
- `export type ExamQuestion = ExamQuestionMcq | ExamQuestionTf;`
- `export type ExamRules = {`
- `export function buildExamQuestions(_total: number): ExamQuestion[] {`
- `export function getExamRulesFromListItem(item: ExamListItem): ExamRules {`
- `export function getExamQuestionsForListItem(_item: ExamListItem): ExamQuestion[] {`

Path in repo: `data/exam-content.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `exam-content.ts`.

## Libraries used

- **@/data/exams** (`type { ExamListItem }`) – project module.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
