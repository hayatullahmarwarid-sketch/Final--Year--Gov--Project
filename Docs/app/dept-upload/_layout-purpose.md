<!-- purpose-doc: normalized -->
# Department Upload Root Layout (`_layout.tsx`)

## Scenario
A department staff member navigates to the department upload section of the app. Before accessing any child screen (Home, Categories, Decrees, Reports, Help, Settings), the layout checks that the user is authenticated. If the session is missing or expired, the user is redirected to login. Once authenticated, the layout provides the entire subtree with shared workspace data and theming, and it wraps everything inside the app’s standard dashboard shell so that the department upload section feels like a natural part of the main app.

## What it does
The component first calls `useAuthSession` to verify the user’s login state. If no session exists, it uses `expo-router`’s `router.replace` to send the user to the login screen. When authenticated, it renders a `DashboardShell` (the app’s consistent header/footer container) using the brand colour token. Inside that shell, it wraps the rendered child screens with two context providers:

- **`DeptUploadWorkspaceProvider`** – supplies all department‑specific data (decrees, categories, pending actions, metrics) and mutation functions to the entire section.
- **`DeptUploadUiProvider`** – provides optional theme overrides and UI state (e.g., modal visibility, selected items) for a customised look and feel.

The layout uses `useAppTranslation` to set the header title of the department upload section to a localised string.

## Libraries used
- **expo-router** – provides the `<Stack>` or `<Slot>` for nested screens and navigation.
- **react** / **react-native** – core UI components.
- **@/components/dashboard/DashboardShell** – the standard app shell (header, status bar, safe area).
- **@/constants/brand** – brand colour token.
- **@/contexts/auth-session-context** (`useAuthSession`) – retrieves the current auth session.
- **@/contexts/dept-upload-ui-context** (`DeptUploadUiProvider`) – wraps the section with UI theming.
- **@/contexts/dept-upload-workspace-context** (`DeptUploadWorkspaceProvider`) – wraps the section with data and actions.
- **@/hooks/use-app-translation** – localised text for the header.

## Logic implemented
1. `DeptUploadLayout` is called when any route under `app/dept-upload` is activated.
2. It reads the session from `useAuthSession()`. If `session` is `null` or invalid, it performs a redirect to `/login`.
3. If authenticated, it renders:
   - `<DashboardShell>` with the brand colour and a title from `useAppTranslation('dept_upload_title')`.
   - Inside the shell, `<DeptUploadUiProvider>` and `<DeptUploadWorkspaceProvider>` wrap the child routes via `<Slot />`.
4. All screens under `dept-upload` now share the same data, theme, and UI context.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
