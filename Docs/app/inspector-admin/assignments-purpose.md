<!-- purpose-doc: normalized -->
# Inspector Admin Assignments Screen (`assignments.tsx`)

## Scenario
An inspector admin needs to manage which inspections are assigned to which field inspectors. On this screen, they see a list of all assignments—each linking a template (and thus an inspection) to an inspector. The admin can create new assignments, edit existing ones (change the inspector or deadline), or remove assignments that are no longer needed. Each assignment is presented as a tappable row, and actions are performed with feedback toasts.

## What it does
The component consumes the `useInspectorAdminWorkspace` hook to access the current assignments list and mutation functions (e.g., `assignInspector`, `updateAssignment`, `removeAssignment`). It renders the assignments in a `FlatList`, where each item shows the template name, assigned inspector, location (from the template), and deadline. A floating “Add” button or row‑level actions trigger assignment creation or editing. The `AppPressable` component is used for consistent touch handling. All actions are wrapped in try‑catch, and `showToast` displays success or failure messages. The UI is translated via `useAppTranslation`.

## Libraries used
- **expo-router** – possibly used for navigation to a detail form (but not explicitly imported beyond screen declaration).
- **@expo/vector-icons** – icons for edit, delete, and deadline.
- **react** / **react-native** – core UI.
- **@/components/ui/AppPressable** – standardised pressable component.
- **@/data/inspector-admin-store** – type `Assignment`.
- **@/hooks/use-app-translation** – localised labels (“Assignments”, “Deadline”, “Add Assignment”).
- **@/hooks/use-inspector-admin-workspace** – provides assignments data and CRUD operations.
- **@/lib/adapters/toast** (`showToast`) – feedback messages.

## Logic implemented
1. On mount, the screen fetches the current assignments via `useInspectorAdminWorkspace().assignments` (or an equivalent method).
2. The list is displayed with details: template name, inspector name, location, deadline.
3. **Add/Edit assignment:**
   - A modal or form appears (maybe using a child component or inline) where the admin selects a template, an inspector, and sets a deadline.
   - On submit, `workspace.createAssignment(payload)` is called.
   - On success, `showToast('Assignment created')` and the list refreshes.
4. **Delete assignment:**
   - Tapping a delete button prompts a confirmation dialog (not imported directly but often part of the screen’s logic).
   - On confirm, `workspace.removeAssignment(id)` is called, with a success toast.
5. Any API errors are caught and shown via `showToast`.
6. Each row uses `AppPressable` for a consistent touch area; tapping the row may navigate to a detail view.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
