<!-- purpose-doc: normalized -->
# Exam Attempt Rules (`exam-attempt.rules.js`)

## Scenario
When an inspector takes an exam, the mobile app may submit answers incrementally or as a single batch. The server must merge partial answers while maintaining integrity, validate that the overall attempt follows the exam’s rules (the exam must be active, all questions must be answered, and answers must match question types), and ensure that no question is left unanswered by filling in a placeholder (e.g., “skipped”) before grading. This module provides pure functions to enforce those business rules without coupling to the database.

## What it does
Exports three functions:

- **`mergeExamAnswersForSubmit(existing = [], incoming = [])`** – merges a new set of answers (incoming) into an existing set. Later answers override earlier ones for the same `questionId`. Returns the merged array, ensuring that the latest answer for each question is kept.
- **`assertExamAttemptFollowsExamRules(input)`** – takes an object containing the exam (with `lifecycle` and `questions`), the attempt, and the merged answers. It asserts:
  - The exam’s lifecycle is `ExamLifecycle.ACTIVE` (or whatever is allowed for attempts).
  - All questions in the exam have a corresponding answer (no missing questions). If any are missing, it throws an `AppError` with a `422` status and a message like “All questions must be answered.”
  - Each answer conforms to the question type (e.g., multiple‑choice answers must be a number index, essay answers must be strings). Uses `ExamQuestionType` to differentiate.
- **`fillMissingAnswersForQuestions(activeQuestions, mergedAnswers)`** – for any exam question that does not yet have an answer, adds a default “unanswered” entry (e.g., with `selected: null` for MCQ, or an empty string for essay). This ensures completeness before grading.

## Libraries used
- **../../core/errors/app-error.js** – `AppError` for throwing validation errors.
- **../../core/errors/http-status.js** – `HttpStatus` for setting the error status code (e.g., `422`).
- **../shared/enums/exam-lifecycle.js** – `ExamLifecycle` to check if the exam is active.
- **../shared/enums/exam-question-type.js** – `ExamQuestionType` to validate answer format.

## Logic implemented
1. `mergeExamAnswersForSubmit`:
   - Create a map from `existing` keyed by `questionId`.
   - Iterate `incoming`, overwriting entries in the map.
   - Return `Object.values(map)`.
2. `assertExamAttemptFollowsExamRules`:
   - If `exam.lifecycle !== ExamLifecycle.ACTIVE`, throw `AppError('Exam is not active', HttpStatus.BAD_REQUEST)`.
   - Find which question IDs in the exam do not have a corresponding answer.
   - If any are missing, throw `AppError('All questions must be answered', HttpStatus.UNPROCESSABLE_ENTITY)`.
   - For each answer, validate its structure:
     - If question type is `MCQ` or `TRUE_FALSE`, ensure `answer.selected` is a number and within the options range.
     - If essay, ensure `answer.text` is a string.
3. `fillMissingAnswersForQuestions`:
   - Iterate over the exam’s questions. For each question, if no answer exists in `mergedAnswers`, create a placeholder answer object (e.g., `{ questionId: q._id, selected: null }` for MCQ, `{ questionId: q._id, text: '' }` for essay).
   - Return the updated answers array.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
