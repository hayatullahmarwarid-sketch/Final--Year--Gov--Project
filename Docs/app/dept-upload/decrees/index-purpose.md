<!-- purpose-doc: normalized -->
# Department Upload Decrees List Screen (`index.tsx`)

## Scenario
A department officer enters the decree management dashboard. They see a table listing all decrees previously uploaded by their department, with columns for title, category, date, status, and actions. From here the officer can:

- **Upload a new decree** – tapping the “Upload” button opens a modal form where they fill in decree details and submit.
- **View/Edit a decree** – tapping a row navigates to the decree detail screen.
- **Reject a decree** – choosing the “Reject” action on a row triggers a confirmation dialog, and on approval creates an activity entry (for audit/history) and updates the decree status, then refreshes the list.

The entire screen uses department‑specific theme colors (provided by `useDeptUploadThemeColorsOptional` or falling back to the global brand palette). Operations are performed within the department workspace context, ensuring data isolation per department.

## What it does
The component relies on `useDeptUploadWorkspace` to access the list of decrees, loading state, and actions like upload and reject. The list is rendered using `DecreeManagementTable`, a specialised table component that accepts data, columns, and row action callbacks. **Upload** is handled by `UploadDecreeFormModal`: pressing the upload button shows the modal; upon successful submission, the modal closes and the workspace’s decree list is updated. **Reject** uses the helper `buildRejectActivityEntry` to construct the activity payload, then calls the workspace’s reject method; a `confirm` dialog (from `@/lib/adapters/dialog`) is shown before executing the reject. Success or failure is communicated through `showToast`. The screen also imports `formatDecreeNumberLabel` to properly display formatted decree numbers in the table and possibly for use in the reject activity log.

## Libraries used
- **expo-router** – navigation (row tap → detail, modal presentation).
- **@expo/vector-icons** – table action icons.
- **react** / **react-native** / **react-native-safe-area-context** – core UI.
- **@/components/dept-upload/DecreeManagementTable** – renders the decree data in a table with action buttons.
- **@/components/dept-upload/UploadDecreeFormModal** – modal form for adding a new decree.
- **@/components/dept-upload/decrees-activity-helpers** (`buildRejectActivityEntry`) – creates the activity log entry object for a reject action.
- **@/contexts/dept-upload-workspace-context** (`useDeptUploadWorkspace`) – provides the decree list, upload function, and reject function tied to the current department workspace.
- **@/contexts/dept-upload-ui-context** (`useDeptUploadThemeColorsOptional`) – optional theme overrides specific to the department upload UI.
- **@/lib/adapters/toast** (`showToast`) – feedback messages.
- **@/lib/decree-number-format** (`formatDecreeNumberLabel`) – formats decree numbers for display.
- **@/lib/theme** (`Brand`, `palette`) – base design tokens.

## Logic implemented
1. On mount, the screen reads the decree list and workspace actions from `useDeptUploadWorkspace()`.
2. The `DecreeManagementTable` renders the list, with columns defined (e.g., Decree Number, Title, Status, Actions).
3. **Upload flow:**
   - A floating action button shows the `UploadDecreeFormModal`.
   - The modal collects decree information and calls `workspace.uploadDecree(data)`.
   - On success, `showToast('Decree uploaded successfully')` and the modal closes. The workspace automatically refreshes the list.
4. **Reject flow:**
   - Each row may have a “Reject” icon/button. Tapping it opens a `confirm` dialog: “Reject this decree?”.
   - If confirmed, the function `buildRejectActivityEntry(decree)` is called to build the activity payload.
   - `workspace.rejectDecree(decreeId, activityEntry)` is invoked.
   - Upon result, `showToast` notifies success or failure.
5. **Navigate to detail:** row press calls `router.push(`/dept-upload/decrees/${item.id}`)` passing the necessary data.
6. Theme colors are merged from `Brand`/`palette` and optionally overridden by `useDeptUploadThemeColorsOptional()`.
7. All labels use `useAppTranslation` (indirectly via the components or directly if needed).

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
