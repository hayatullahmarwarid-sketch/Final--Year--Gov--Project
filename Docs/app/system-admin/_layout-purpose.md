<!-- purpose-doc: normalized -->
# System Admin Root Layout (`_layout.tsx`)

## Scenario
The System Admin section is the highest‑privilege area of the app, accessible only to users with the “system admin” role. When an admin navigates to any screen under `/system-admin`, the layout first checks that the user is authenticated. If the session is missing or expired, they are immediately redirected to the login screen. Once authenticated, the layout provides two shared contexts—**remote data** and **UI state**—to all child screens, and wraps everything inside the app’s standard `DashboardShell` for a consistent header and navigation experience.

## What it does
The component calls `useAuthSession` to verify the current session. If no valid session exists, it uses `expo-router` to replace the current route with `/login`. When the session is valid, it renders a `<DashboardShell>` with the brand colour token and a localised title (e.g., “System Admin”) from `useAppTranslation`. Inside the shell, two context providers wrap the child routes via `<Slot />`:

- **`SystemAdminRemoteProvider`** – fetches and caches all remote data needed by the section (platform users, staff accounts, audit logs, metrics).
- **`SystemAdminUiProvider`** – provides optional UI theming overrides and local UI state (e.g., selected tabs, open modals) specific to the system‑admin look and feel.

All sub‑screens (Overview, Users, All Users, Logs, Settings) share these contexts, eliminating redundant API calls and ensuring a consistent UI theme.

## Libraries used
- **expo-router** – provides `<Slot />` for nested routes and the redirect logic.
- **react** / **react-native** – core rendering.
- **@/components/dashboard/DashboardShell** – the standard app shell with header and status bar.
- **@/constants/brand** – brand colour token for the header.
- **@/contexts/auth-session-context** (`useAuthSession`) – retrieves the current session.
- **@/hooks/use-app-translation** – localised string for the header title.
- **@/contexts/system-admin-remote-context** (`SystemAdminRemoteProvider`) – provides all remote data.
- **@/contexts/system-admin-ui-context** (`SystemAdminUiProvider`) – provides UI theme and local state.

## Logic implemented
1. `SystemAdminLayout` is called when any route under `app/system-admin` is about to appear.
2. It reads the session from `useAuthSession()`. If `session` is `null` or invalid, it calls `router.replace('/login')` and renders nothing.
3. If authenticated, it renders:
   - `<DashboardShell>` with the brand colour and a title from `useAppTranslation('system_admin')`.
   - Inside the shell, `<SystemAdminRemoteProvider>` wraps `<SystemAdminUiProvider>`, which in turn wraps `<Slot />`.
4. All child screens (e.g., `index`, `users`, `all-users`, `logs`, `settings`) inherit the auth protection, data, and theming.
5. Deep links to any system‑admin route first pass through this guard.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Primary UI for system administration features.
