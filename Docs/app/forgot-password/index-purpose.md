<!-- purpose-doc: normalized -->
# Forgot Password – Email Entry Screen (`index.tsx`)

## Scenario
The user has tapped “Forgot Password?” on the login screen. They now see a form asking for their registered email address. After entering a valid email and pressing “Send Reset Link” (or “Continue”), the app sends a password‑reset request to the backend. If the email is valid and recognised, the user is taken to the token verification step. If the email is invalid or the request fails, an error is shown inline.

## What it does
This screen renders a text input for the email address and a submit button. It uses `isLoginEmailValid` to validate the email format locally. On submit, it calls `postPasswordResetRequest(email)` (with the API base URL derived from `getApiBaseUrl`). While the request is in flight, the button is disabled and a spinner is shown. On success, the recovery context (set up by the parent layout) stores the email, and the user is navigated to `/forgot-password/verify`. On failure, an error toast or inline message is displayed. The screen also renders the `ForgotPasswordProgress` component, which visualises the current step (e.g., step 1 of 3) and gives the user a sense of progress. All text (labels, button, error messages) is translated using `useAppTranslation` and, for some UI copy, `getPublicUiCopy` with the current app language from `useAppLanguage`. Additionally, the hook `useClearSensitiveOnWebRestore` ensures that any sensitive data (like the email field) is cleared if the app is restored on the web after a refresh, improving security.

## Libraries used
- **expo-router** – navigation to `verify` screen.
- **expo-haptics** – may provide haptic feedback on errors or success.
- **expo-status-bar** – status bar management.
- **@expo/vector-icons** – email icon.
- **react** / **react-native-safe-area-context** – core UI.
- **@/components/auth/ForgotPasswordProgress** – step indicator.
- **@/constants/brand** / **@/constants/form** – design tokens.
- **@/constants/public-ui-copy** (`getPublicUiCopy`) – localised UI strings.
- **@/contexts/app-language-context** – current language.
- **@/hooks/use-app-translation** – translated labels.
- **@/hooks/use-clear-sensitive-on-web-restore** – clears sensitive fields on web restores.
- **@/lib/api/auth-public-flow** – `postPasswordResetRequest`.
- **@/constants/api** (`getApiBaseUrl`) – base URL for the request.
- **@/lib/validation/login-email** (`isLoginEmailValid`) – email format validator.

## Logic implemented
1. On mount, `useClearSensitiveOnWebRestore` clears the email input if the app is being restored in a web environment.
2. The screen displays the `ForgotPasswordProgress` component with the current step (1) highlighted.
3. The user types an email. On every change, `isLoginEmailValid` checks the string; if invalid, a subtle error color or disabled button is shown.
4. When the user presses “Continue”:
   - The email is validated. If invalid, the button stays disabled and a translation‑based error label is shown.
   - If valid, `postPasswordResetRequest(email)` is called.
   - A loading indicator replaces the button label.
   - On success:
     - The recovery context stores the email via a setter (assuming context provides `setEmail`).
     - The user is navigated with `router.push('/forgot-password/verify')`.
   - On error:
     - An error message (from server or a generic translation) is displayed near the button.
     - Haptic feedback may indicate failure.
5. The screen’s colors are derived from `Brand` and `FormColors`.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
