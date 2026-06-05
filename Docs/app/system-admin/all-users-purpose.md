<!-- purpose-doc: normalized -->
# System Admin All Users Screen (`all-users.tsx`)

## Scenario
The system admin needs to see every registered user on the platform—not just staff members, but also public users who have signed up to view decrees, exams, and certificates. This screen lists all platform users in a searchable, scrollable list. Each row shows the user’s display name, email, role, and account status. The admin can tap a user to view more details or perform administrative actions like disabling an account. The screen uses a dedicated API endpoint (`listAllPlatformUsers`) that returns a paginated list of `SystemAdminStaffMember` objects (the type name is reused generically for all platform users).

## What it does
The component fetches the full platform user list from `listAllPlatformUsers`, using the remote context (`useSystemAdminRemote`) to cache and paginate results. Each raw API record is mapped through helper functions:
- `apiRoleKeyToStaffRole` – converts the backend role key into a standardised staff role.
- `resolveStaffDisplayName` – produces a human‑readable display name (first name + last name, or a fallback).
- `staffRoleLabel` – returns a localised label for the role (e.g., “Public User”, “Inspector”, “Department Officer”).

The rendered list uses `Brand`, `FormColors`, and theme tokens (`radius`, `spacing`, `touchTarget`, `typography`) for consistent styling. The UI context (`useSystemAdminUi`) may provide colour overrides. All text is localised via `useAppTranslation`.

## Libraries used
- **expo-router** – possibly for navigating to a user detail page (not directly imported beyond screen declaration).
- **@expo/vector-icons** – user avatar icons, role badges.
- **react** – core rendering.
- **@/constants/brand** / **@/constants/form** – design tokens.
- **@/contexts/system-admin-remote-context** (`useSystemAdminRemote`) – provides the cached user list and pagination.
- **@/contexts/system-admin-ui-context** (`useSystemAdminUi`) – UI theme overrides.
- **@/hooks/use-app-translation** – localised labels.
- **@/lib/api/system-admin** – `listAllPlatformUsers` API function and the type `SystemAdminStaffMember`.
- **@/lib/theme** – `radius`, `spacing`, `touchTarget`, `typography`.
- **@/data/system-admin-store** – `staffRoleLabel` function.
- **@/lib/system-admin-mapper** – `apiRoleKeyToStaffRole`, `resolveStaffDisplayName`.

## Logic implemented
1. On mount (or when focused), the screen triggers a fetch via `useSystemAdminRemote().fetchAllUsers()` (or similar), which calls `listAllPlatformUsers(page)`.
2. While loading, a spinner or skeleton list is shown.
3. On success, the raw user array is mapped:
   - Each user’s role key is converted via `apiRoleKeyToStaffRole`.
   - The display name is resolved with `resolveStaffDisplayName`.
   - The role label is obtained from `staffRoleLabel`.
4. The list is rendered in a `FlatList`. Each row displays:
   - An avatar placeholder with initials.
   - Display name.
   - Email.
   - Role badge (localised label, colour‑coded by role).
   - Active/inactive indicator.
5. Tapping a row may navigate to a user detail screen or open a bottom sheet with actions (enable/disable, reset password, etc.).
6. Pull‑to‑refresh or scroll‑to‑end triggers loading the next page.
7. Any errors during fetch are caught and shown via a toast (not directly imported here but typically part of the remote context’s error handling).

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Primary UI for system administration features.
