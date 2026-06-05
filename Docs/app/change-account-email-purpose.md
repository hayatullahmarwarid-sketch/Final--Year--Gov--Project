<!-- purpose-doc: normalized -->
# Change Account Email Screen (`change-account-email.tsx`)

## Scenario
A logged‑in user wants to change the email address associated with their account. They navigate to this screen from the profile or settings. They must enter their current password and the new email, which is validated locally. Upon successful change, the session is updated with the new email, and any locally stored data keyed to the old email is migrated to the new email’s storage key, ensuring continuity of offline data.

## What it does
The screen first guards with `useRedirectNonPublicFromPublicRoutes`. It uses `useAuthSession` to get the current user and later update it. The form has two fields: current password and new email. The new email is validated with `isLoginEmailValid` and normalised with `normalizeLoginEmail`. On submit, the backend is called via `patchBackendAuthMe` to change the email. On success:

- The returned role is mapped via `mapBackendRoleKeyToAuthSessionRole`.
- The old email’s public‑account‑scoped storage is migrated to the new key using `migratePublicAccountScopedStorage` and `publicAccountKeyFromEmail`.
- The auth session is updated with the new email.
- A success toast is shown, and the user is navigated back.

Haptic feedback gives a tangible sense of completion. The UI uses `Brand`, `FormColors`, and `HomeColors`. API base URL comes from `getApiBaseUrl`.

## Libraries used
- **expo-router** – navigation.
- **expo-haptics** – haptic feedback.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – email icon.
- **react** / **react-native-safe-area-context** – core UI.
- **@/constants/brand** / **@/constants/api** / **@/constants/form** / **@/constants/home** – tokens.
- **@/contexts/auth-session-context** (`useAuthSession`) – session and updater.
- **@/hooks/use-app-translation** – localised labels.
- **@/hooks/use-redirect-non-public-from-public-routes** – guard.
- **@/lib/adapters/toast** (`showToast`) – feedback.
- **@/lib/api/auth-jwt** (`patchBackendAuthMe`) – API call.
- **@/lib/auth-backend-role-map** – role mapper.
- **@/lib/migrate-preauth-profile** (`migratePublicAccountScopedStorage`) – migrates local data.
- **@/lib/user-scoped-storage-keys** (`publicAccountKeyFromEmail`) – computes storage key.
- **@/lib/validation/login-email** – email validation/normalization.

## Logic implemented
1. Guard redirects non‑public users.
2. Form state: `currentPassword`, `newEmail`, `error`.
3. User edits fields; `newEmail` is checked with `isLoginEmailValid`. If invalid, an error message is shown.
4. On tap “Change Email”:
   - Checks if new email is valid; if not, aborts.
   - Calls `patchBackendAuthMe({ currentPassword, newEmail })`.
   - On success:
     - Maps role from response, updates session with new email.
     - Computes old key `publicAccountKeyFromEmail(oldEmail)` and new key from `newEmail`.
     - Calls `migratePublicAccountScopedStorage(oldKey, newKey)`.
     - Shows success toast.
     - `router.back()`.
   - On failure:
     - Shows error toast (e.g., “Password incorrect”).
     - Haptic error feedback.
5. Sensitive fields are cleared on web restore (via `useClearSensitiveOnWebRestore` if implemented in this component, though not directly imported; might be inherited from a wrapper, or the screen uses its own logic).

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
