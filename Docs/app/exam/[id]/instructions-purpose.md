<!-- purpose-doc: normalized -->
# Exam Instructions Screen (`instructions.tsx`)

## Scenario
After selecting an exam, the user lands on the Instructions screen. Here they see the exam title, category, duration, and a comprehensive list of rules and guidelines before they start. A prominent “Start Exam” button at the bottom allows them to begin. Tapping it provides haptic feedback and navigates to the exam‑taking screen. The screen ensures all UI text is localised.

## What it does
The component extracts the exam `id` from the route parameters and fetches the exam details via `getPublicExamById`. The API response is adapted into an `ExamListItem` using `apiExamSummaryToListItem`. From that list item, the exam rules (e.g., “This exam has a time limit of 60 minutes”) are extracted using `getExamRulesFromListItem`, which returns an array of rule strings. These rules are rendered as a styled list, each with an icon. The exam title, category, and duration are displayed at the top using `Brand`, `FormColors`, and `HomeColors` design tokens. A “Start Exam” button, when pressed, triggers a haptic feedback via `expo-haptics` and calls `router.push(\`/exam/${id}/take\`)`. The screen also uses `useAppTranslation` for all labels (“Instructions”, “Start Exam”, “Rules”).

## Libraries used
- **expo-router** – retrieves `[id]` param, navigates to the take screen.
- **expo-haptics** – haptic feedback on button press.
- **expo-status-bar** – manages status bar appearance.
- **@expo/vector-icons** – icons for each rule item.
- **react** / **react-native** / **react-native-safe-area-context** – core UI.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – design tokens.
- **@/data/exams** – `ExamListItem` type.
- **@/data/exam-content** – `getExamRulesFromListItem` function.
- **@/hooks/use-app-translation** – localised text.
- **@/lib/api/public-user** – `getPublicExamById` fetch.
- **@/lib/public/exam-cert-adapters** – `apiExamSummaryToListItem` adapter.

## Logic implemented
1. The `id` is read from `useLocalSearchParams()`.
2. On mount, `getPublicExamById(id)` is called. While loading, a spinner is displayed.
3. On success, the raw exam data is passed to `apiExamSummaryToListItem`, yielding an `ExamListItem`.
4. The exam’s title, category, and duration are rendered in a header section.
5. `getExamRulesFromListItem(examListItem)` is called to generate an array of rule strings.
6. The rules are mapped to `View` components, each containing an icon and the rule text.
7. The “Start Exam” button is placed below the rules.
8. On press:
   - `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` is triggered.
   - `router.push(\`/exam/${id}/take\`)` navigates to the exam‑taking screen.
9. Errors from the API call are caught and displayed as an alert or inline error.
10. The status bar is configured via `expo-status-bar` to match the screen’s colour scheme.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
