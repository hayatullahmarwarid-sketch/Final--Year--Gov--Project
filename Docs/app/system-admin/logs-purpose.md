<!-- purpose-doc: normalized -->
# System Admin Audit Logs Screen (`logs.tsx`)

## Scenario
The system admin needs to monitor platform activity for security and compliance. This screen displays a chronological list of audit log entries—who did what and when. Each entry shows the actor (user), the action (e.g., “LOGIN”, “CREATE_STAFF”, “DELETE_DECREE”), the target resource, and a timestamp. The admin can scroll back in time, possibly filter by action type or date range, and review the details of any log entry.

## What it does
The component fetches paginated audit logs using `listAllAuditLogs` from `@/lib/api/system-admin`. Each raw log record is adapted into a human‑readable entry object via the `auditRowToEntry` mapper, which extracts the actor’s name, action type, target description, and timestamp. The adapted entries are rendered in a `FlatList`, styled with `Brand`, `FormColors`, and theme tokens (`spacing`, `touchTarget`). The UI context (`useSystemAdminUi`) may supply colour overrides. The admin can tap an entry for more details (perhaps a modal with the full JSON payload). `showToast` is used for error feedback, and all labels are translated via `useAppTranslation`.

## Libraries used
- **expo-router** – possibly for navigation to a log detail screen.
- **@expo/vector-icons** – action‑type icons (e.g., a key for login, a trash for delete).
- **react** – core rendering.
- **@/lib/adapters/toast** (`showToast`) – error messages.
- **@/constants/brand** / **@/constants/form** – design tokens.
- **@/contexts/system-admin-ui-context** (`useSystemAdminUi`) – UI theme.
- **@/lib/api/system-admin** – `listAllAuditLogs` API function.
- **@/hooks/use-app-translation** – localised text (“Audit Logs”, “Action”, “Timestamp”, “No logs found”).
- **@/lib/theme** – `spacing`, `touchTarget`.
- **@/lib/system-admin-mapper** – `auditRowToEntry` adapter.

## Logic implemented
1. On mount, the screen calls `listAllAuditLogs(page=1)` (or uses the remote context if it wraps this). While loading, a spinner is shown.
2. On success, each raw audit row is passed through `auditRowToEntry(row)`, producing an array of structured entry objects with fields like `actorName`, `action`, `target`, `timestamp`, and `details`.
3. The entries are displayed in a `FlatList`, ordered by most recent first. Each row shows:
   - An action‑specific icon (e.g., login, create, update, delete).
   - The actor’s name.
   - A human‑readable action phrase (e.g., “Created staff account for Ahmad”).
   - A relative or absolute timestamp.
4. Tapping a row may expand it to show additional metadata (IP address, request body, etc.) or open a detail modal.
5. The list supports infinite scroll: when the user reaches the bottom, the next page is fetched and appended.
6. A filter bar (if implemented) allows narrowing by action type or date range, triggering a filtered API call.
7. Any API errors trigger `showToast('Failed to load audit logs')`.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Primary UI for system administration features.
