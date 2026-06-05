<!-- purpose-doc: normalized -->
# Exam Taking Screen (`take.tsx`)

## Scenario
The user has read the instructions and now presses “Start Exam”. They are presented with the actual exam questions, one at a time or in a scrollable list. They select answers, navigate between questions, and when ready, submit the entire exam. A submission triggers haptic feedback, sends the answers to the backend, and then navigates to the Results screen to see their score. The screen respects the user’s language for question labels and interface.

## What it does
The component fetches the exam data with `getPublicExamById(id)` and adapts it via `apiExamSummaryToListItem` to get metadata. It also fetches (or already has) the full exam content including questions. The questions are transformed from the API shape into `ExamQuestion` objects using `mapPublicExamQuestionsToExamQuestions`. The screen maintains a local state for the user’s answers (an object mapping question IDs to selected answer indices). The UI renders each question with its options as tappable items. A submit button at the bottom builds the attempt payload using `buildExamAttemptAnswersPayload`, then calls `postPublicExamAttempt` (to create the attempt) and `postPublicExamAttemptSubmit` (to finalise it). On successful submission, `showToast` confirms, haptic feedback plays, and the user is navigated to `/exam/${id}/results` (or `/exam/${id}/results?attemptId=...`). The `usePublicUserData` context provides the public user ID for the submission. All user‑facing labels come from `useAppTranslation`, and the exam structure respects `useAppLanguage` for language‑specific question content.

## Libraries used
- **expo-router** – retrieves `[id]`, navigates to results post‑submission.
- **expo-haptics** – haptic feedback on answer selection and submission.
- **expo-status-bar** – status bar management.
- **@expo/vector-icons** – navigation arrows, submit icon.
- **react** / **react-native-safe-area-context** – core UI.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – design tokens.
- **@/contexts/public-user-data-context** – public user ID.
- **@/contexts/app-language-context** – language context.
- **@/data/exam-content** – `ExamQuestion` type.
- **@/data/exams** – `ExamListItem` type.
- **@/hooks/use-app-translation** – localised strings.
- **@/lib/adapters/toast** (`showToast`) – feedback.
- **@/lib/api/public-user** – `getPublicExamById`, `postPublicExamAttempt`, `postPublicExamAttemptSubmit`.
- **@/lib/public/exam-cert-adapters** – `apiExamSummaryToListItem`.
- **@/lib/public/exam-api-questions** – `buildExamAttemptAnswersPayload`, `mapPublicExamQuestionsToExamQuestions`.

## Logic implemented
1. The `id` is extracted from route params.
2. `getPublicExamById(id)` fetches the exam. The result is adapted into an `ExamListItem` for header info (title, category, duration).
3. The exam content (questions) is fetched (possibly from the same call or a separate one). The raw questions are passed to `mapPublicExamQuestionsToExamQuestions` to produce an array of `ExamQuestion` objects, each containing the question text, options, and correct answer (hidden from UI).
4. The component initialises an `answers` state object where keys are question IDs and values are selected option indices (starting empty).
5. The UI displays:
   - A progress indicator “Question 3 of 20”.
   - The current question text and a list of options as touchable items.
   - Tapping an option updates the `answers` state and triggers a light haptic.
   - Navigation buttons: “Previous”, “Next”, or swiping to move between questions.
6. A “Submit Exam” button is enabled when all questions are answered (or at any time, with a confirmation prompt).
7. On submission:
   - `buildExamAttemptAnswersPayload(examId, answers)` constructs the API payload.
   - `postPublicExamAttempt(payload)` creates the attempt record.
   - `postPublicExamAttemptSubmit(attemptId)` finalises the submission.
   - `showToast('Exam submitted')` and a success haptic.
   - `router.replace(\`/exam/${id}/results?attemptId=${attemptId}\`)` navigates to results.
8. If the API fails at any point, an error toast is shown and the user remains on the screen.
9. The entire screen is styled with `Brand`, `FormColors`, and `HomeColors`, and the status bar is adjusted accordingly.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
