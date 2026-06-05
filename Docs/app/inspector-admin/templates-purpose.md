<!-- purpose-doc: normalized -->
# Inspector Admin Templates Screen (`templates.tsx`)

## Scenario
The admin defines and manages inspection templates. Each template contains the fields that inspectors will fill out during an inspection. The admin can see a list of all templates, each showing its title, category, number of fields, and active status (using the `StatusBadge` component). Active templates can be assigned to inspectors. The admin can create a new template, edit an existing one (add/remove fields, change the “Inspection Location” field, etc.), or deactivate a template so it can no longer be used for new assignments.

## What it does
The screen uses `useInspectorAdminWorkspace` to access the template list and mutation functions. It renders a `FlatList` of templates, where each row is an `AppPressable` item showing:
- Title and category.
- `StatusBadge` indicating “Active” or “Inactive”.
- A quick action to toggle active status.

Tapping a row navigates to a template editor (possibly a modal or a separate screen) where the admin can modify the template’s name, description, and add/remove/reorder fields. The admin can also delete a template if it has no active assignments. All changes are reflected in real time through the workspace and confirmed with `showToast`. The UI is fully translated.

## Libraries used
- **@expo/vector-icons** – edit, delete, field icons.
- **react** / **react-native** – core UI.
- **@/components/ui/AppPressable** – standard pressable.
- **@/components/inspector-admin/StatusBadge** – renders active/inactive status.
- **@/data/inspector-admin-store** – type `Template`.
- **@/hooks/use-app-translation** – localised strings.
- **@/hooks/use-inspector-admin-workspace** – templates data and CRUD.
- **@/lib/adapters/toast** (`showToast`) – feedback.

## Logic implemented
1. The workspace provides the list of templates.
2. Each template row displays:
   - Title.
   - Category (if applicable).
   - Number of fields (e.g., “5 fields”).
   - `StatusBadge` (active: green, inactive: grey).
3. **Toggle active status:**
   - A toggle on the row calls `workspace.updateTemplate(id, { active: !current })`.
   - Toast confirms and list updates.
4. **Create template:**
   - A “Create Template” button opens a form where the admin enters title, category, and adds fields (each field has a name, type, and whether it’s required).
   - The “Inspection Location” field can be set with a default value (e.g., “Paktika-Zerghoun Shar”).
   - On save, `workspace.createTemplate(data)` is called.
5. **Edit template:**
   - Tapping a row opens the editor pre‑filled with the template data.
   - The admin can add, remove, or reorder fields.
   - On save, `workspace.updateTemplate(id, changes)` is called.
6. **Delete template:**
   - With confirmation, `workspace.deleteTemplate(id)` removes it.
7. Errors are displayed via `showToast`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
