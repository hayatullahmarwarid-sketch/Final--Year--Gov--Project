<!-- purpose-doc: normalized -->
# Root App Layout (`_layout.tsx`)

## Scenario
Every user who opens the app passes through this layout first. It is the outermost wrapper for the entire application. Its job is to initialise all global context providers—language, authentication, notifications, user profile, and more—so that any screen in the app can rely on them without rebuilding. It also bootstraps internationalisation (`i18n`) and the toast system, then renders the appropriate navigation structure via Expo Router’s `<Slot />`.

## What it does
The component exports `unstable_settings` (for Expo Router) and a `RootLayout` function. Inside, it calls `useColorScheme` to detect light/dark mode preferences and applies them. It wraps the entire app in a series of providers, ordered from outermost to innermost:

1. **`AppBootstrap`** – handles any initialisation that must happen before rendering (e.g., loading fonts, stored settings).
2. **`AppLanguageProvider`** – makes the current language and a setter available everywhere.
3. **`AuthSessionProvider`** – manages the login session; screens can read the user’s role and token.
4. **`NotificationInboxProvider`** – keeps the list of in‑app notifications up to date.
5. **`NotificationSettingsProvider`** – manages the user’s notification channel preferences.
6. **`PublicUserDataProvider`** – loads public‑facing user data (ID, display name).
7. **`UserProfileProvider`** – fetches the authenticated user’s full profile.

After the providers, it renders `<Slot />` (the current route) and a global `<Toast />` component from `react-native-toast-message`. Expo Router’s screen tracking integrates with `@react-navigation/native` for analytics.

The `unstable_settings` export likely sets `initialRouteName` to `index` (the splash screen).

## Libraries used
- **expo-router** – file‑based routing, `Slot`, `unstable_settings`.
- **@react-navigation/native** – navigation container.
- **expo-status-bar** – status bar control.
- **react-i18next** – i18n initialisation (`i18n` import).
- **react-native-reanimated** – used for layout animations.
- **react-native-toast-message** – toast UI.
- **react** / **react-native** – core rendering.
- **@/components/app-bootstrap** – initialisation component.
- **@/contexts/app-language-context** – language provider.
- **@/contexts/auth-session-context** – auth provider.
- **@/contexts/notification-inbox-context** – notification inbox provider.
- **@/contexts/notification-settings-context** – notification settings provider.
- **@/contexts/public-user-data-context** – public user data provider.
- **@/contexts/user-profile-context** – user profile provider.
- **@/hooks/use-color-scheme** – colour scheme.
- **@/lib/i18n/init** – i18n initialisation.

## Logic implemented
1. `RootLayout` calls `useColorScheme()` to get the theme.
2. It applies the theme to the status bar and global styles.
3. It renders the provider hierarchy exactly as described.
4. Inside `AppBootstrap`, fonts, cached language, and any other launch‑time assets are loaded.
5. `AppLanguageProvider` sets the initial language from storage or defaults.
6. `AuthSessionProvider` checks for a stored token and validates it; if missing, the app stays on the auth‑required screens.
7. `NotificationInboxProvider` and `NotificationSettingsProvider` hydrate from local storage and start listening for push notifications.
8. `PublicUserDataProvider` and `UserProfileProvider` fetch their data only after a valid session is established.
9. Once bootstrapped, `<Slot />` renders the child route determined by Expo Router.
10. Toasts from `showToast` (anywhere in the app) are displayed by the global `<Toast />` at the bottom.
11. The `unstable_settings` export helps Expo Router decide the initial screen (`index`).

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
