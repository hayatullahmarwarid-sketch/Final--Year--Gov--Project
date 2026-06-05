<!-- purpose-doc: normalized -->
# Inspector Admin Results Screen (`results.tsx`)

## Scenario
The admin wants to view the exam results of all inspectors. This screen lists each exam attempt, showing the inspector’s name, the exam title, score, pass/fail status, and date taken. The admin can filter by exam or by inspector, and can copy a result summary to the clipboard for sharing. This helps the admin quickly identify which inspectors have passed required exams and which need retraining.

## What it does
The screen uses `useInspectorAdminWorkspace` to access exam results (an array of `ExamResult` objects). It displays them in a `FlatList`, each item containing the inspector’s name, exam name, score (e.g., “42/50 – Passed”), and date. `AppPressable` rows allow tapping to view more details. A filter section at the top lets the admin select which exam to view. Clipboard copying is enabled via `expo-clipboard`: pressing a copy button on a row copies a formatted string like “Inspector X scored 84% on Exam Y”. `showToast` gives feedback, and `useAppTranslation` provides localised labels.

## Libraries used
- **@expo/vector-icons** – pass/fail icons.
- **expo-clipboard** – copies result summary to clipboard.
- **react** / **react-native** – core UI.
- **@/components/ui/AppPressable** – pressable rows.
- **@/data/inspector-admin-store** – types `Exam`, `ExamResult`.
- **@/hooks/use-app-translation** – localised strings.
- **@/hooks/use-inspector-admin-workspace** – results data.
- **@/lib/adapters/toast** (`showToast`) – feedback.

## Logic implemented
1. On mount, the workspace loads the full list of exam results.
2. The admin can select a specific exam from a dropdown. The list filters to show only results for that exam.
3. Each result row shows:
   - Inspector name (from the result object).
   - Exam title.
   - Score and total (e.g., “38 / 50”).
   - Pass/Fail badge (green “Passed” or red “Failed”).
4. **Copy to clipboard:**
   - Tapping a copy icon next to a row builds a string: `"${inspectorName}: ${score}/${total} on ${examName} — ${passed ? 'Passed' : 'Failed'}"`.
   - `Clipboard.setStringAsync(...)` is called, followed by a “Copied” toast.
5. Tapping the row may navigate to a detailed result page showing individual question responses (if the system supports it).
6. The list supports pull‑to‑refresh to re‑fetch results.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
