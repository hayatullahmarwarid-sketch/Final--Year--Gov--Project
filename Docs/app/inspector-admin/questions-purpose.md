<!-- purpose-doc: normalized -->
# Inspector Admin Questions Screen (`questions.tsx`)

## Scenario
The admin is creating or editing an exam and needs to manage its questions. This screen lists all questions for a selected exam. Each question is a multiple‑choice item with a stem and several options. The options are labelled (e.g., “A.”, “B.”, “C.”), and the admin can see which option is marked as correct. The screen allows adding new questions, editing existing ones, and deleting questions. The option labels are parsed and compared using utility functions (`optionLabelEquals`, `parseOptionLabels`) to ensure consistency when the admin sets the correct answer.

## What it does
The component likely receives the exam ID via route parameters or workspace state and fetches the list of `Question` objects using `useInspectorAdminWorkspace` (or directly from the `useInspectorAdminStore`). It renders the questions in a list, each showing the stem and the options with their labels. The admin can tap a question to edit it (modal or inline), change the stem, edit options, and mark the correct option. When saving, the screen ensures the correct answer matches one of the parsed option labels using `optionLabelEquals`. The `AppPressable` component is used for each question row and action button. All mutations use `showToast` for feedback, and the UI is translated.

## Libraries used
- **@expo/vector-icons** – edit, delete, correct‑answer icons.
- **react** – core rendering.
- **@/components/ui/AppPressable** – pressable rows and buttons.
- **@/data/inspector-admin-store** – type `Question`, and `useInspectorAdminStore` for direct store access.
- **@/hooks/use-app-translation** – localised labels.
- **@/hooks/use-inspector-admin-workspace** – questions data and mutations.
- **@/lib/adapters/toast** (`showToast`) – feedback.
- **@/lib/mcq-label-utils** – `optionLabelEquals` and `parseOptionLabels` for handling option letters.

## Logic implemented
1. The screen obtains the exam ID from route params or workspace context.
2. It fetches the questions for that exam (e.g., `workspace.getQuestions(examId)`).
3. The questions are displayed as a list; each item shows:
   - The question stem.
   - The list of options with labels.
   - A badge or colour indicating which option is correct.
4. **Add question:**
   - A “Add Question” button opens a form where the admin enters the stem and up to 4 options.
   - The correct answer is selected from a dropdown of the entered options (labels are auto‑generated: A, B, C, D).
   - `parseOptionLabels` may be used to standardise labels before saving.
   - On submit, `workspace.createQuestion(examId, data)` is called.
   - The list refreshes and a toast confirms.
5. **Edit question:**
   - Tapping a question opens an edit modal pre‑filled with current data.
   - Changes are saved via `workspace.updateQuestion(questionId, data)`.
   - The correct option is validated with `optionLabelEquals` to ensure it matches one of the option labels.
6. **Delete question:**
   - With confirmation, `workspace.deleteQuestion(questionId)` is called.
7. Errors are displayed via `showToast`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
