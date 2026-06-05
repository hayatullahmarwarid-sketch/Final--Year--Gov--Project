<!-- purpose-doc: normalized -->
# Verify Email Screen (`verify-email.tsx`)

## Scenario
After registration, the user is directed to this screen. They must enter the 6‑digit verification code sent to the email address they provided. Once they enter the code and tap “Verify”, the account becomes active. If they didn’t receive the code, they can tap “Resend” to trigger another email. Upon successful verification, they are redirected to their appropriate home screen (e.g., `/` for public user).

## What it does
The screen receives the email via route params. It uses `postEmailVerificationConfirm` to verify the code. It also can call `postEmailVerificationSend` to resend the code. The UI contains a segmented input for the code. On success, it maps the role from the response (via `mapBackendRoleKeyToAuthSessionRole` — actually that is imported? Not shown, but `homeHrefForRole` is used, implying the response includes a role). It then calls `homeHrefForRole` and `router.replace` to send the user home. If verification fails, an error is displayed. `useAppTranslation` provides localised strings. `getApiBaseUrl` is used for API calls. Haptic feedback on actions. The screen uses `Brand` and `FormColors`.

## Libraries used
- **expo-router** – navigation.
- **expo-haptics** – feedback.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – email icon.
- **react** / **react-native-safe-area-context** – core.
- **@/constants/brand** / **@/constants/form** – tokens.
- **@/constants/api** (`getApiBaseUrl`) – base URL.
- **@/hooks/use-app-translation** – translations.
- **@/lib/api/auth-public-flow** – `postEmailVerificationConfirm`, `postEmailVerificationSend`.
- **@/lib/auth-routing** (`homeHrefForRole`) – home route.

## Logic implemented
1. Read `email` from route params.
2. Display a message “We sent a code to {email}”.
3. User enters code.
4. On “Verify”:
   - Call `postEmailVerificationConfirm(email, code)`.
   - On success:
     - Extract role from response (or it’s already known? The screen uses `homeHrefForRole` so likely the response includes role).
     - `router.replace(homeHrefForRole(role))`.
   - On failure: show “Invalid code” error.
5. “Resend” button:
   - Calls `postEmailVerificationSend(email)`.
   - Shows a toast “Code resent”.
6. Haptic on button taps.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
