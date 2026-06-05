<!-- purpose-doc: normalized -->
# Registration Screen (`register.tsx`)

## Scenario
A new public user opens the app, selects a language, and then taps “Create account” on the login screen. They are taken to this registration form. They must provide their full name, email, password, province, district, and possibly accept terms. After successful registration, a verification email is sent. The user is then directed to the verification screen. The screen must also handle the case where the backend is unhealthy.

## What it does
This is a comprehensive form that uses many validation and mapping utilities. It guards with `useAuthSession` to ensure no logged‑in session exists (or redirects). It reads app language from `useAppLanguage` to set the user’s preferred language in the backend. The form fields include:
- Full name (validated with `isFullPersonNameValid`)
- Email (validated with `isLoginEmailValid`)
- Password (validated with `isPasswordPolicyValid`)
- Province and district (using `PROVINCES` and `districtsForProvince`)
- Possibly role selection hidden or default to public user.

The `OptionPickerModal` component is used for province/district selection. On submit:
- Combines data with `appLanguageIdToBackendPreferred`.
- Calls `postBackendRegister`.
- On success, calls `postEmailVerificationSend` to send a verification email.
- Shows a success toast and navigates to `/verify-email`.
- On failure, shows error toast.
Health check `getHealth` is called on mount; if the backend is down, a message is displayed.
The screen uses `useClearSensitiveOnWebRestore` to clear fields on web restores.

## Libraries used
- **expo-router** – navigation.
- **expo-haptics** – feedback.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – form icons.
- **react** / **react-native-safe-area-context** – core.
- **@/components/auth/OptionPickerModal** – dropdown picker.
- **@/constants/brand** / **@/constants/form** – tokens.
- **@/contexts/app-language-context** – language.
- **@/contexts/auth-session-context** – session (to detect already logged in).
- **@/contexts/user-profile-context** – profile.
- **@/hooks/use-app-translation** – translations.
- **@/hooks/use-clear-sensitive-on-web-restore** – clear fields.
- **@/lib/adapters/toast** (`showToast`) – feedback.
- **@/lib/api/auth-public-flow** – `postBackendRegister`, `postEmailVerificationSend`.
- **@/lib/api/health** (`getHealth`) – health check.
- **@/lib/auth-backend-role-map** – role mapping.
- **@/constants/api** (`getApiBaseUrl`) – base URL.
- **@/lib/language-backend-map** (`appLanguageIdToBackendPreferred`) – language mapping.
- **@/lib/validation/full-name** – name validation.
- **@/lib/validation/login-email** – email validation.
- **@/lib/validation/password-policy** – password validation.
- **@/data/afghanistan-regions** – provinces and districts.

## Logic implemented
1. Check health; if fail, show “Service unavailable”.
2. If `useAuthSession` indicates logged in, redirect to home.
3. `useClearSensitiveOnWebRestore` clears inputs if on web.
4. Form state: `fullName`, `email`, `password`, `confirmPassword`, `province`, `district`.
5. On province change, `districtsForProvince(provinceId)` updates available districts; reset district.
6. Validation on submit:
   - `isFullPersonNameValid(fullName)`
   - `isLoginEmailValid(email)`
   - `isPasswordPolicyValid(password)`
   - passwords match
7. If valid:
   - Map language: `appLanguageIdToBackendPreferred(language)`.
   - Build payload: `{ fullName, email, password, provinceId, districtId, preferredLanguage, role: 'public' }`.
   - `postBackendRegister(payload)`.
   - On success:
     - `postEmailVerificationSend(email)` (no context needed).
     - `showToast('Account created. Please verify your email.')`.
     - `router.push('/verify-email?email=...')`.
   - On error: show error toast.
8. Option picker modals for province/district.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
