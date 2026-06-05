<!-- purpose-doc: normalized -->
# Inspector Admin Root Layout (`_layout.tsx`)

## Scenario
The Inspector Admin section is a protected area accessible only to users with the “inspector admin” role. When an admin navigates to any screen under `/inspector-admin`, the layout first checks that the user is authenticated. If not, they are redirected to the login screen. Once authenticated, the entire section is wrapped in the app’s standard `DashboardShell`, providing a consistent header, status bar, and navigation container. All child screens (Home, Assignments, Exams, Templates, etc.) are rendered through this layout, sharing the same auth check and shell.

## What it does
The component calls `useAuthSession` to verify the current session. If the session is missing, it uses `expo-router`’s `router.replace` to send the user to `/login`. When the session is valid, it renders a `<DashboardShell>` with the brand colour token and a localised title (from `useAppTranslation`). Inside the shell, it likely defines a `<Stack>` navigator containing all the inspector‑admin sub‑screens, allowing the admin to navigate between them while maintaining the shared layout.

## Libraries used
- **expo-router** – provides `<Stack>` or `<Slot>` for nested navigation, and the redirection logic.
- **react** / **react-native** – core UI rendering.
- **@/components/dashboard/DashboardShell** – the standard app shell with header and status bar.
- **@/constants/brand** – brand colour for the header.
- **@/contexts/auth-session-context** (`useAuthSession`) – retrieves the current auth session.
- **@/hooks/use-app-translation** – localised string for the header title (e.g., “Inspector Admin”).

## Logic implemented
1. `InspectorAdminLayout` is invoked when any route under `app/inspector-admin` is activated.
2. It reads the session via `useAuthSession()`. If `session` is `null` or invalid, it performs `router.replace('/login')` and renders nothing.
3. If authenticated, it renders:
   - `<DashboardShell>` with the brand colour and a title from `useAppTranslation`.
   - Inside the shell, a `<Stack>` (or `<Slot>`) that contains screens like `index`, `assignments`, `exams`, `templates`, etc.
4. All sub‑screens inherit the auth protection and the shared shell.
5. Deep links to any inspector‑admin route first pass through this guard.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
