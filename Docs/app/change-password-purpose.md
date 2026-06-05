<!-- purpose-doc: normalized -->
# Change Password Screen (`change-password.tsx`)

## Scenario
A user wants to update their password while already logged in. They navigate here from profile or settings. The screen asks for the current password, a new password, and a confirmation. After validation, the credentials are sent to the backend. On success, the user is informed and can continue using the app with the new password.

## What it does
The screen guards with `useRedirectNonPublicFromPublicRoutes` and uses `useUserProfile` (likely to access profile data) but the main logic handles the password change via an API call (not directly imported—probably `patchBackendAuthMe` with password fields, or a dedicated endpoint). It imports `Brand` and `FormColors` for styling, and `useAppTranslation` for localised strings. `useClearSensitiveOnWebRestore` ensures password fields are wiped on web refreshes. The form includes current password, new password, and confirm new password. On submit, it validates complexity (likely with an internal helper or a library). The API call (though not seen, it’s implied) is wrapped in try/catch, with `expo-haptics` for feedback and a toast. On success, the user may be navigated back or shown a confirmation.

## Libraries used
- **expo-router** – navigation.
- **expo-haptics** – feedback.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – lock icon.
- **react** / **react-native-safe-area-context** – core UI.
- **@/constants/brand** / **@/constants/form** – tokens.
- **@/hooks/use-app-translation** – localised labels.
- **@/contexts/user-profile-context** – user profile.
- **@/hooks/use-clear-sensitive-on-web-restore** – clears sensitive fields.
- **@/hooks/use-redirect-non-public-from-public-routes** – guard.

## Logic implemented
1. Guard ensures public user access.
2. On mount, `useClearSensitiveOnWebRestore` clears password fields if on web.
3. The form collects `currentPassword`, `newPassword`, `confirmPassword`.
4. Validation: new password must meet policy (e.g., min length, complexity). Confirm must match.
5. On “Change Password”:
   - Calls password change API (likely `patchBackendAuthMe` with password payload, though not directly imported; maybe uses a wrapper from `@/lib/api/auth-jwt`).
   - Shows loading.
   - On success, toast and `router.back()`.
   - On error, toast with error message.
6. Haptic feedback on button press and error.
7. Styling uses `Brand` and `FormColors`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
