<!-- purpose-doc: normalized -->
# Login Screen (`login.tsx`)

## Scenario
The user reaches this screen either after choosing a language or when their session expires. They can log in using their email and password. The screen also detects if the entered email belongs to a department upload portal (via `isDeptUploadCredentials`) and, if so, may trigger a separate login flow with `tryPortalLogin`. On success, the user’s role is determined, and they are redirected to the appropriate home screen (e.g., dashboard for public users, inspector dashboard, department upload). If an error occurs, it is displayed inline or as a toast.

## What it does
The component uses `useAuthSession` to log in and `useAppLanguage` for translations. It displays email and password fields with `FormInput`, styled with `AppPressable` for buttons and using tokens from `Brand`, `FormColors`, `layout`, `radius`, `semantic`, `sizes`, `spacing`, `typography`. The login flow:
- Validate email format with `isLoginEmailValid`.
- Check if email matches department upload credentials pattern via `isDeptUploadCredentials`. If yes, attempt `tryPortalLogin` (which may return a different token or handle a separate portal).
- Otherwise, call `postBackendLogin` with email and password.
- On success, map the backend role via `mapBackendRoleKeyToAuthSessionRole`, then `homeHrefForRole` gives the target screen, `router.replace`.
- Errors are shown.
Sensitive fields are cleared on web restore via `useClearSensitiveOnWebRestore`. The screen also uses `getPublicUiCopy` for static UI copy (like “Forgot Password?”). Haptic feedback on button press and errors.

## Libraries used
- **expo-router** – navigation.
- **expo-haptics** – feedback.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – email/password icons.
- **react** / **react-native-safe-area-context** – core.
- **@/components/ui/AppPressable** – pressable button.
- **@/components/ui/FormInput** – styled text input.
- **@/constants/api** (`getApiBaseUrl`) – API base.
- **@/constants/dept-upload-auth** (`isDeptUploadCredentials`) – detector.
- **@/constants/public-ui-copy** – localised strings.
- **@/contexts/app-language-context** – language.
- **@/contexts/auth-session-context** – session.
- **@/hooks/use-app-translation** – translations.
- **@/hooks/use-clear-sensitive-on-web-restore** – clear fields.
- **@/lib/api/auth-jwt** (`postBackendLogin`) – login API.
- **@/lib/auth-backend-role-map** – role mapper.
- **@/lib/auth-routing** (`homeHrefForRole`) – home path.
- **@/lib/validation/login-email** – email validation.
- **@/services/admin-portal-auth** (`tryPortalLogin`) – department portal login.
- **@/lib/theme** – extensive design tokens.

## Logic implemented
1. Guard with `useClearSensitiveOnWebRestore` to clear inputs.
2. User enters email and password.
3. Email format validated; if invalid, error displayed.
4. On “Login”:
   - Check `isDeptUploadCredentials(email)`. If true:
     - Call `tryPortalLogin(email, password)`. If success, treat as department user; map role, redirect.
     - If fail, fallback to normal login or show error.
   - Else:
     - Call `postBackendLogin(email, password)`.
   - On success:
     - `mapBackendRoleKeyToAuthSessionRole` converts the role.
     - Update auth session (token, user).
     - `homeHrefForRole(role)` returns the home path.
     - `router.replace(homeHref)`.
   - On error:
     - Display error message (toast or inline).
     - Haptic error.
5. A “Forgot Password?” link navigates to `/forgot-password`.
6. A “Register” link navigates to `/register`.
7. All text translated; UI copy from `getPublicUiCopy` where needed.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
