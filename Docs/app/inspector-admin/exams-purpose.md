<!-- purpose-doc: normalized -->
# Inspector Admin Exams Screen (`exams.tsx`)

## Scenario
The admin defines and manages the exams that inspectors must pass. This screen lists all created exams, each with a title, category, question count, and active status. The admin can create a new exam, edit its metadata, view the questions it contains, or set it as active/inactive. A key requirement is that only active exams appear to inspectors.

## What it does
The screen uses `useInspectorAdminWorkspace` for the exam list and mutations. It also imports `useInspectorAdminStore` directly (possibly for selecting specific exam data). The list displays exams as `AppPressable` rows. Tapping an exam may navigate to the questions screen filtered by that exam, or open an edit modal. The screen allows the admin to toggle exam active status, delete an exam, and create a new one. All actions produce feedback via `showToast`.

## Libraries used
- **expo-router** – navigation to an exam’s questions screen (e.g., `/inspector-admin/questions?examId=...`).
- **@expo/vector-icons** – exam icons, status dots.
- **react** / **react-native** – core UI.
- **@/components/ui/AppPressable** – pressable rows.
- **@/data/inspector-admin-store** – type `Exam`, and `useInspectorAdminStore` for direct store access.
- **@/hooks/use-app-translation** – localised labels.
- **@/hooks/use-inspector-admin-workspace** – exams data and operations.
- **@/lib/adapters/toast** (`showToast`) – feedback.

## Logic implemented
1. The exam list is fetched from the workspace or store on mount.
2. Each row displays:
   - Exam title.
   - Number of questions (if included in the exam object).
   - Active/inactive badge.
3. **Create exam:**
   - A “Create Exam” button opens a form (title, description, passing score, category).
   - On submit, `workspace.createExam(data)` is called; success toast, list refresh.
4. **Edit exam:**
   - Tapping a row opens an edit modal with pre‑filled data.
   - Save calls `workspace.updateExam(id, changes)`.
5. **Toggle active:**
   - A toggle button calls `workspace.toggleExamActive(id, newStatus)`.
6. **Manage questions:**
   - A button “Questions” on the row navigates to the questions screen, passing the exam ID.
7. **Delete exam:**
   - With confirmation, `workspace.deleteExam(id)` is invoked.
8. All API interaction errors are caught and shown via `showToast`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
