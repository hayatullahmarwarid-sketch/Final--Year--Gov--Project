<!-- purpose-doc: normalized -->
# Profile Tab Screen (`profile.tsx`)

## Scenario
The user opens the Profile tab to manage their account and app preferences. They see their avatar, full name, and email address retrieved from the authenticated session and user profile. Below the user info, there are controls to change the application language (e.g., Dari, Pashto, English), a link to view their public profile, and a log‑out button. The notification inbox badge is also visible, indicating how many unread notifications they have. Tapping the language picker immediately updates all UI text across the app. Tapping “Log Out” ends the session and redirects to the login screen.

## What it does
The component combines data from multiple contexts to build a complete profile overview. `useAuthSession` provides the user’s core identity and the log‑out method. `useUserProfile` supplies additional profile details (e.g., avatar URL, job title). `usePublicUserData` gives the public‑facing identifier that can be used to link to a public profile. `useAppLanguage` and `APP_LANGUAGES` drive a language selector; changing the language causes the whole app to re‑render with the new locale. `useNotificationInbox` provides the unread notification count. The screen also applies haptic feedback on interactive elements (button presses, language change) using `expo-haptics`.

## Libraries used
- **expo-router** – navigation, especially for logout (replace with login route).
- **@expo/vector-icons** – icons for profile sections.
- **expo-constants** – reads app version/build info.
- **expo-haptics** – haptic feedback on taps.
- **expo-image** – efficiently loads the user’s avatar with caching.
- **expo-status-bar** – status bar appearance.
- **react** / **react-native-safe-area-context** – core framework.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – design tokens.
- **@/constants/languages** (`APP_LANGUAGES`) – list of supported language objects.
- **@/contexts/app-language-context** – language state and setter.
- **@/contexts/auth-session-context** – session object and `logout` method.
- **@/contexts/notification-inbox-context** – unread count.
- **@/contexts/public-user-data-context** – public user data.
- **@/contexts/user-profile-context** – detailed user profile.
- **@/hooks/use-app-translation** – for labels like “Log Out”, “Language”.

## Logic implemented
1. The screen reads `user` from `useAuthSession`, `profile` from `useUserProfile`, `publicUser` from `usePublicUserData`, `language` from `useAppLanguage`, and `unreadCount` from `useNotificationInbox`.
2. The user’s avatar is displayed with `expo-image`; if no avatar is available, a placeholder icon is shown.
3. The current language is highlighted in a list of `APP_LANGUAGES`. Tapping a different language updates the context, which triggers a re‑translation of the entire UI.
4. A “Notifications” row shows the unread count badge.
5. A “Public Profile” row navigates to a public profile screen (e.g., `/profile/public`).
6. The “Log Out” button calls `logout()` from the auth context, clears the session, and uses `expo-router` to replace the current route with `/login`.
7. All interactive elements (language picker, buttons) trigger a light haptic effect via `expo-haptics`.
8. App version information is fetched from `expo-constants` and displayed at the bottom.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
