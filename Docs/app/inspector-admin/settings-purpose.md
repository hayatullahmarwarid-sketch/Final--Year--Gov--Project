<!-- purpose-doc: normalized -->
# Inspector Admin Settings Screen (`settings.tsx`)

## Scenario
The admin needs to configure system‑wide settings for the inspector module. This screen includes toggles for features (e.g., “Enable Offline Mode”, “Require Photo on Submission”) and a section to manage field inspector accounts. In the inspectors list, the admin can view all registered field inspectors, add new ones, or deactivate accounts. The settings are persisted locally using `AsyncStorage`, so they survive app restarts.

## What it does
The screen uses `useInspectorAdminWorkspace` to read and write settings, and to access the list of `FieldInspector` objects. It renders two main sections:
- **Feature Settings:** A series of `AppSwitch` components bound to boolean settings values. Toggling a switch calls the workspace to update the setting and stores the new value in `AsyncStorage` for persistence.
- **Inspector Management:** A list of field inspectors, each showing name, email, and an active/inactive toggle. The admin can add a new inspector via a form (possibly a modal). Changes are communicated to the backend via workspace methods and confirmed with `showToast`.

`@react-native-async-storage/async-storage` is used directly or indirectly to cache settings locally. The `useAuthSession` hook is also imported, possibly to restrict certain settings to super‑admins or to identify the current user.

## Libraries used
- **@expo/vector-icons** – settings and user icons.
- **@react-native-async-storage/async-storage** – for local persistence of settings.
- **react** – core rendering.
- **@/components/ui/AppPressable** – pressable rows and buttons.
- **@/components/ui/AppSwitch** – styled switch component.
- **@/data/inspector-admin-store** – type `FieldInspector`.
- **@/contexts/auth-session-context** (`useAuthSession`) – session info.
- **@/hooks/use-app-translation** – localisation.
- **@/hooks/use-inspector-admin-workspace** – settings and inspectors data/mutations.
- **@/lib/adapters/toast** (`showToast`) – feedback.

## Logic implemented
1. The screen reads the current settings from `useInspectorAdminWorkspace().settings` (or directly from `AsyncStorage`).
2. **Feature toggles:**
   - Each toggle’s state is initialised from the stored value.
   - On change, the workspace’s `updateSetting(key, value)` is called, and `AsyncStorage.setItem(key, JSON.stringify(value))` saves the value.
   - Toast confirms the change.
3. **Inspector list:**
   - The workspace provides the list of `FieldInspector` objects.
   - Each inspector row shows name, email, and an active switch.
   - Toggling active calls `workspace.updateInspector(id, { active })` and updates the list.
   - “Add Inspector” button opens a form where the admin enters name, email, and perhaps an initial password.
   - On creation, `workspace.createInspector(data)` is called, list refreshes.
4. The admin’s own session is checked; perhaps certain settings are hidden if not the primary admin.
5. All error handling uses `showToast`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
