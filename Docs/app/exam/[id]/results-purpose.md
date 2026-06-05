<!-- purpose-doc: normalized -->
# Exam Results Screen (`results.tsx`)

## Scenario
After completing an exam or reviewing a past attempt, the user arrives at the Results screen. They see a large score ring indicating their percentage (or pass/fail status), along with detailed feedback: marks obtained, total marks, and any other result metadata. The screen also shows the exam title and date. Haptic feedback is provided when the screen first appears or when the user interacts with the score ring.

## What it does
The screen expects both the exam ID and the attempt ID (or just the exam ID if the latest result is shown). It fetches two things:
- `getPublicExamById(examId)` to get the exam summary (via `apiExamSummaryToListItem`).
- `getPublicExamAttemptById(attemptId)` (or possibly the latest attempt) to get the attempt result.

The attempt data includes the score, total marks, and pass status. That information is passed to the `ExamScoreRing` component, which renders a circular progress indicator with the percentage. The exam summary provides contextual information (exam title, category) styled with `Brand`, `FormColors`, and `HomeColors`. The `usePublicUserData` context ensures that only the current user’s attempt is fetched. All text (“Results”, “Your Score”, “Passed”/“Failed”) uses translations via `useAppTranslation`. The screen may also allow navigating back to the instructions or the exams list.

## Libraries used
- **expo-router** – retrieves route params (`[id]` and possibly `attemptId`).
- **expo-haptics** – can provide feedback when the ring animates.
- **expo-status-bar** – status bar styling.
- **@expo/vector-icons** – supplementary icons.
- **react** / **react-native** / **react-native-safe-area-context** – core UI.
- **@/components/exam/ExamScoreRing** – circular score indicator.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – design tokens.
- **@/contexts/public-user-data-context** – provides public user ID for fetching attempts.
- **@/data/exams** – `ExamListItem` type.
- **@/hooks/use-app-translation** – localised strings.
- **@/lib/api/public-user** – `getPublicExamAttemptById` and `getPublicExamById`.
- **@/lib/public/exam-cert-adapters** – `apiExamSummaryToListItem` adapter.

## Logic implemented
1. Extract `id` (exam) and optionally `attemptId` from route params.
2. Fetch the exam summary with `getPublicExamById(id)` and adapt via `apiExamSummaryToListItem` → `examItem`.
3. Fetch the attempt with `getPublicExamAttemptById(attemptId)` (or if no attemptId, perhaps the most recent via another parameter). The attempt contains `score`, `total`, `passed`.
4. While either request is loading, a loading indicator is shown.
5. On success:
   - Display the exam title and date from `examItem`.
   - Render `<ExamScoreRing score={...} total={...} />` which shows the percentage and colour (green for pass, red for fail).
   - Show additional details like “Marks: 42/50”.
   - A “Back to Exams” or “Review Incorrect Answers” button could be present (not imported here, so maybe not).
6. The screen triggers a haptic notification through `expo-haptics` when the score ring appears.
7. Errors are caught and displayed with a toast or alert.
8. The UI uses the colour tokens for consistent styling.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
