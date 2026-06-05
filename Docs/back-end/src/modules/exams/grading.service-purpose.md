<!-- purpose-doc: normalized -->

---

### `grading.service-purpose.md`
```markdown
# Grading Service (`grading.service.js`)

## Scenario
After an exam is submitted, the server must automatically grade objective questions (multiple‑choice, true/false) and compute a total score. Essay questions require manual grading. This service provides the algorithms to score an attempt, calculate the raw total, check if all essays have been manually scored, and apply manual scores when the admin reviews the attempt.

## What it does
Exports four pure functions:

- **`gradeAttempt(questions, answersInput, options = {})`** – main function that iterates over the exam questions, compares the submitted answer to the correct answer, and assigns a score per question. For objective types (MCQ, TRUE_FALSE), scoring is automatic (e.g., 1 point for correct, 0 for incorrect). For essay type, the score is `null` if not yet manually graded. Returns an array of answer objects enriched with `score` and `maxScore`.
- **`totalScoreFromAnswers(questions, answers)`** – sums up the `score` values from the graded answers, but only for answers that have a numeric score (i.e., not `null`). Returns the total.
- **`allEssaysHaveManualScores(questions, answers)`** – checks all essay‑type questions in the attempt; if any has a `score` that is `null` or `undefined`, returns `false`. This is used to decide whether the attempt can be fully marked as completed/passed.
- **`applyManualEssayGrades(questions, currentAnswers, manualGrades)`** – takes an array of manual grade overrides (e.g., from an admin form) and merges them into the current answers, setting the `score` for each essay question to the manual value. This is used when an admin reviews an exam and fills in essay marks.

The module uses `ExamQuestionType` to distinguish question types.

## Libraries used
- **../shared/enums/exam-question-type.js** – `ExamQuestionType` enum.

## Logic implemented
1. `gradeAttempt(questions, answersInput)`:
   - For each question, find the corresponding answer.
   - If question type is `MCQ` or `TRUE_FALSE`:
     - `correct = question.correctOptionIndex`.
     - `score = (answer.selectedIndex === correct) ? question.points || 1 : 0`.
   - If type is `ESSAY`:
     - `score = answer.manualScore ?? null`.
   - Attach `score`, `maxScore` to the answer object.
   - Return the enriched answers array.
2. `totalScoreFromAnswers`:
   - `answers.reduce((sum, a) => sum + (typeof a.score === 'number' ? a.score : 0), 0)`.
3. `allEssaysHaveManualScores`:
   - Filter questions where type is `ESSAY`, then check each corresponding answer’s `score !== null`.
4. `applyManualEssayGrades`:
   - For each `manualGrade` in `manualGrades` array, find the answer by `questionId` and set `answer.score = manualGrade.score`.
   - Return updated answers.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
