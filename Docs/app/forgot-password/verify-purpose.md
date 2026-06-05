<!-- purpose-doc: normalized -->
# Forgot Password – Token Verification Screen (`verify.tsx`)

## Scenario
After requesting a password reset, the user receives a one‑time code via email. This screen asks them to enter that code. It provides a segmented input field (or a single field) for the token. As the user types, the code is validated (e.g., must be exactly 6 digits). Once a valid token is entered, the screen automatically verifies it through the recovery context and advances the user to the password reset step. If the code is incorrect or expired, an error message is shown and the user can request a new code or go back.

## What it does
The screen renders the `ForgotPasswordProgress` component, now highlighting step 2 (“Verify Code”). It displays an input for the token. Because no direct API import is detected, the verification logic is likely encapsulated in the `useForgotPasswordRecovery` context. The context may provide a method like `verifyToken(code)` that checks the code against the server or validates it locally if the token is a hash of the original token (e.g., in a secure flow). On successful verification, the context updates its state with the verified token, and the screen navigates to `/forgot-password/reset`. On failure, the context sets an error state, and the screen renders a translated error message. The user can also tap a “Resend code” link if available (logic likely handled by the context or by navigating back to `index`). The screen uses haptic feedback for input interactions (e.g., when the correct number of digits is reached) and for errors.

## Libraries used
- **expo-router** – navigates to the reset screen or back.
- **expo-haptics** – feedback on digit entry and error.
- **expo-status-bar** – status bar appearance.
- **@expo/vector-icons** – keypad or lock icons.
- **react** / **react-native-safe-area-context** – core UI.
- **@/components/auth/ForgotPasswordProgress** – step indicator.
- **@/constants/brand** / **@/constants/form** – design tokens.
- **@/contexts/forgot-password-recovery-context** (`useForgotPasswordRecovery`) – state and actions (email, token, verify method, error).
- **@/hooks/use-app-translation** – translated strings for the screen.

## Logic implemented
1. The screen reads the recovery context:
   - `email` (to display “Code sent to user@example.com”).
   - `verifyToken` function.
   - `error` state (if any).
2. It renders `ForgotPasswordProgress` with step 2 active.
3. An `TextInput` (or a segmented input) captures the token. As the user types:
   - The input style changes when all required digits are entered.
   - When the token is fully entered, the screen calls `recoveryCtx.verifyToken(enteredToken)`.
4. While verifying, a loading indicator is shown and the input is disabled.
5. On success:
   - The token is stored in context.
   - The screen navigates to `/forgot-password/reset`.
   - Minimal haptic success feedback.
6. On failure:
   - The error message from context (or a fallback translation) is displayed.
   - Haptic error feedback is triggered.
   - The user can edit the code and try again.
7. A “Resend code” link (if present) navigates back to `index` or triggers a resend via context.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
