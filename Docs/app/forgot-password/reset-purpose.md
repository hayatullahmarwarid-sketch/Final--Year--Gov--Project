<!-- purpose-doc: normalized -->
# Forgot Password – Reset Password Screen (`reset.tsx`)

## Scenario
The user has successfully verified their token. They are now on the final step: setting a new password. The screen shows two fields—new password and confirm password—and a “Reset Password” button. After the user enters a new password and confirms it, the app sends the new password along with the verified token to the backend. Upon success, the user is informed that the password has been changed and is redirected to the login screen. If the reset fails (e.g., token expired), an error is shown and the user may be offered to restart the flow.

## What it does
The screen renders `ForgotPasswordProgress` with step 3 highlighted. It provides password and confirm‑password inputs with validation (e.g., minimum length, match). The `useForgotPasswordRecovery` context gives access to the email and the verified token. On submission, it calls `postPasswordResetComplete({ token, newPassword })`. The API call is made directly in the screen (imported from `@/lib/api/auth-public-flow`). While the request is in flight, a loading spinner is shown. On success, a toast or alert congratulates the user, and `expo-router` replaces the current stack with the login route (`/login`) so the user can sign in with the new password. On failure, an error message is displayed. The hook `useClearSensitiveOnWebRestore` again clears the password fields on web restores for security. Haptic feedback accompanies button presses and errors.

## Libraries used
- **expo-router** – navigation to login after success; replacement to prevent back navigation.
- **expo-haptics** – feedback on press and error.
- **expo-status-bar** – status bar styling.
- **@expo/vector-icons** – lock icon.
- **react** / **react-native-safe-area-context** – core UI.
- **@/components/auth/ForgotPasswordProgress** – step indicator.
- **@/constants/brand** / **@/constants/form** – design tokens.
- **@/contexts/forgot-password-recovery-context** (`useForgotPasswordRecovery`) – provides email and token.
- **@/hooks/use-app-translation** – localised labels, errors, success messages.
- **@/hooks/use-clear-sensitive-on-web-restore** – clears sensitive fields on web refresh.
- **@/lib/api/auth-public-flow** – `postPasswordResetComplete` API.

## Logic implemented
1. The screen uses `useForgotPasswordRecovery` to get `email` and `token`. If these are missing (e.g., user navigated directly to this page), it may redirect back to the start.
2. `useClearSensitiveOnWebRestore` clears password inputs on web restores.
3. The `ForgotPasswordProgress` step indicator shows the final step active.
4. The user fills in `newPassword` and `confirmPassword`. Local validation:
   - Password must be at least 8 characters (configurable).
   - Confirm password must match.
   - If validation fails, inline errors appear and the submit button is disabled.
5. On press of “Reset Password”:
   - Haptic feedback triggers.
   - `postPasswordResetComplete({ token, newPassword })` is called.
   - Loading state is shown.
6. On success:
   - A success toast (e.g., “Password changed successfully. Please log in.”).
   - `router.replace('/login')` navigates to login, clearing the forgot‑password stack so the back button doesn’t return to reset.
7. On error:
   - Error message is displayed (e.g., “Token expired. Please request a new password reset.”).
   - Optionally, a “Restart process” button navigates back to `index`.
8. The entire screen uses `Brand` and `FormColors` for styling.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
