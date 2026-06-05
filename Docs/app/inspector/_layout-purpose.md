<!-- purpose-doc: normalized -->
# Inspector Root Layout (`_layout.tsx`)

## Scenario
The inspector section of the app is a restricted area. Only authenticated users with the inspector role should be able to access any screen under this section—dashboard, tasks, profile, or sync. When the user navigates to `/inspector` or any of its sub‑routes, the layout first checks that a valid session exists. If not, the user is immediately sent back to login. Once authenticated, the entire inspector workspace is initialised: the language preference for inspections is loaded, an offline sync queue is created for low‑connectivity areas, and the core workspace data (assigned tasks, templates, etc.) is made available to all child screens.

## What it does
The component calls `useAuthSession` to get the current session. If the session is missing, it redirects to `/login` using `expo-router`’s navigation methods. When the session is valid, it wraps the child routes (via `<Slot />`) with three context providers in the correct order:

1. **`InspectorLangProvider`** – provides the inspector‑specific language (e.g., Dari/Pashto) for form labels and inspection templates, which may differ from the general app language.
2. **`InspectorSyncQueueProvider`** – manages a queue of offline inspection submissions, enabling the inspector to work in areas without network and later sync the results.
3. **`InspectorWorkspaceProvider`** – fetches and holds the inspector’s assigned tasks, available templates, and other relevant data, making it accessible to all screens.

These providers ensure that any screen inside `app/inspector` can instantly access the inspector’s language context, sync state, and workspace data without re‑fetching or duplicating logic.

## Libraries used
- **expo-router** – provides the `<Slot />` and routing; used for redirection.
- **react** / **react-native** – core rendering.
- **@/contexts/auth-session-context** (`useAuthSession`) – checks authentication.
- **@/contexts/inspector-lang-context** (`InspectorLangProvider`) – inspector‑specific language context.
- **@/contexts/inspector-sync-queue-context** (`InspectorSyncQueueProvider`) – provides offline sync queue.
- **@/contexts/inspector-workspace-context** (`InspectorWorkspaceProvider`) – provides workspace data and actions.

## Logic implemented
1. `InspectorLayout` renders and immediately calls `useAuthSession()`.
2. If `session` is `null` or invalid:
   - The layout performs a `router.replace('/login')` (or equivalent) and returns `null` to prevent any child from rendering.
3. If the session is valid, the layout renders the providers in a hierarchy:
   - `<InspectorLangProvider>`
     - `<InspectorSyncQueueProvider>`
       - `<InspectorWorkspaceProvider>`
         - `<Slot />` (renders the active child screen, e.g., `index`, `profile`, `sync`, `tasks`)
4. The providers are mounted once and persist as long as the inspector layout remains in the navigation stack, ensuring a consistent state across all inspector screens.
5. Deep links to any inspector sub‑route first pass through this layout’s auth guard.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Field inspector workflow.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
