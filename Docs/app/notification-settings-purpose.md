<!-- purpose-doc: normalized -->
# Notification Settings Screen (`notification-settings.tsx`)

## Scenario
A user wants to fine‑tune which push notifications they receive—for example, new decrees, exam results, or inspection assignments. On this screen, they see a list of notification categories with toggle switches. They can turn each category on or off. Changes are saved immediately to the backend (if online) and cached locally.

## What it does
The screen guards with `useRedirectNonPublicFromPublicRoutes`. It uses `useNotificationSettings` to read the current preferences and to update them. It renders a list of notification categories, each with a label and a switch. The categories might be hard‑coded or fetched from the context. Toggling a switch calls the context’s `updateSetting` method, which persists the change. The UI is styled with `Brand`, `FormColors`, `HomeColors`. No additional API imports are needed because the context handles persistence internally.

## Libraries used
- **expo-router** – navigation.
- **expo-haptics** – feedback.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – category icons.
- **react** / **react-native-safe-area-context** – core.
- **@/constants/brand** / **@/constants/form** / **@/constants/home** – tokens.
- **@/hooks/use-app-translation** – translations.
- **@/contexts/notification-settings-context** – settings state and updater.
- **@/hooks/use-redirect-non-public-from-public-routes** – guard.

## Logic implemented
1. Guard runs; if not public user, redirect.
2. The `notificationSettings` object is read from context. It contains boolean flags for each category (e.g., `decreePublished`, `examResult`).
3. A `FlatList` renders each category:
   - Label from `useAppTranslation` (e.g., “New decrees”).
   - A `Switch` whose value is the corresponding flag.
4. On toggle:
   - Haptic feedback.
   - Context’s `updateSetting(categoryKey, newValue)` is called.
   - Context handles API call and local storage.
5. If an error occurs during update, the toggle may revert and a toast is shown (toast is likely used inside the context, but screen may also import `showToast` if needed—not imported here, but possible).
6. The screen uses the supplied colours.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
