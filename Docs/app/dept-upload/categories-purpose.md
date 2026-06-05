<!-- purpose-doc: normalized -->
# Department Upload Categories Screen (`categories.tsx`)

## Scenario
A department officer opens the Categories tab inside the department upload dashboard. The screen displays a list of decree categories that have been created for this department (e.g., “Finance”, “Health Regulation”). The officer can add a completely new category via a modal, or edit the name of an existing category directly in the list. A slug is automatically generated from the category name to be used in internal references.

## What it does
The component uses `listCategories` to fetch all existing categories from the backend on mount. It renders them in a `FlatList` or `ScrollView`, with each category displaying its name and an edit button. Pressing the edit button allows inline editing or opens a secondary modal. A floating action button triggers `react-native-modal` to show a form where the officer enters a new category name. On submission, the screen calls `slugifyCategoryName` to produce a URL‑friendly slug, then calls `createCategory` with the name and slug. For edits, `patchCategory` is called with the updated name. All API interactions are wrapped in try‑catch blocks, and `showToast` displays success or error feedback. The screen uses the `DeptUploadDash` and `FormColors` tokens for consistent department‑specific styling.

## Libraries used
- **expo-router** – possibly for navigating away; not explicitly used besides basic screen presence.
- **@expo/vector-icons** – icons for edit, delete, add.
- **react-native-modal** – presents the “add category” modal.
- **react** / **react-native-safe-area-context** – core UI.
- **@/constants/brand**, **@/constants/dept-upload-dashboard**, **@/constants/form** – design tokens.
- **@/hooks/use-app-translation** – localised labels (e.g., “Add Category”, “Edit”, “Save”).
- **@/lib/api/decree-upload** – API functions `listCategories`, `createCategory`, `patchCategory`, and the type `DecreeCategory`.
- **@/lib/adapters/toast** (`showToast`) – feedback messages.
- **@/lib/dept-upload-helpers** (`slugifyCategoryName`) – converts a name like “Health Regulation” to “health-regulation”.

## Logic implemented
1. On screen focus, `listCategories()` is called; the result (an array of `DecreeCategory`) is stored in state.
2. The categories are displayed as a list, each showing the name and an icon button for editing.
3. **Add category flow:**
   - User presses the “+” button → modal opens with a text input.
   - After typing a name and pressing “Save”, the name is passed to `slugifyCategoryName` to get a slug.
   - `createCategory({ name, slug })` is called.
   - On success, `showToast('Category created')`, the modal closes, and the list is refreshed.
   - On error, the toast shows the error message.
4. **Edit category flow:**
   - User taps edit on a row → the row becomes an editable `TextInput`.
   - After submitting a new name, `patchCategory(id, { name })` is called (slug may not change).
   - The list updates optimistically or after a refresh.
   - Toast shows success or failure.
5. The screen’s colours are pulled from `DeptUploadDash` and `FormColors` to maintain the department upload theme.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
