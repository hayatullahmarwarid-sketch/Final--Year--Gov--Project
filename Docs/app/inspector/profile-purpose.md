<!-- purpose-doc: normalized -->
# Inspector Profile Screen (`profile.tsx`)

## Scenario
An inspector wants to view or update their personal information, change their password, or adjust app preferences specific to the inspector role (such as preferred language for inspection forms). They navigate to the Profile tab within the inspector section. Here they can see their name, avatar, department, and contact details, and make any necessary changes.

## What it does
This route renders the `InspectorProfileScreen` component. That component presents a form pre‑filled with the inspector’s profile data (fetched from the workspace or a dedicated API). It allows editing of allowed fields (e.g., display name, phone number, local language preference). The component likely uses `InspectorWorkspaceContext` to read the current inspector’s details and to persist updates. It may also interact with `InspectorLangProvider` to change the inspection form language. The screen itself is a simple wrapper that just exports the imported component, ensuring it fits into the file‑based navigation.

## Libraries used
- **expo-router** – defines the route; the component may use it for navigation (e.g., back to dashboard).
- **react** / **react-native** – renders the profile form.
- **@/components/inspector/InspectorProfileScreen** – the actual screen logic and UI.

## Logic implemented
1. The file default‑exports `InspectorProfileScreen`.
2. Inside the component:
   - It retrieves the inspector’s profile data (either from the workspace context or by calling an API on mount).
   - It displays an avatar (with an option to change it), name, email, department, and language preference.
   - The language preference dropdown reads from `InspectorLangContext` and updates it on change.
   - A “Save” button sends updates to the backend via an API call (not imported here, but likely part of the component’s internal logic).
   - Feedback (toast) on success or failure.
   - A “Log Out” button may also be present, which clears the session and redirects to login.
3. The screen uses the inspector’s theme colours for consistent styling.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Field inspector workflow.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
