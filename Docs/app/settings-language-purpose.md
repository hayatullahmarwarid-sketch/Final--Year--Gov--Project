<!-- purpose-doc: normalized -->
# Settings Language Screen (`settings-language.tsx`)

## Scenario
Inside the profile or settings area, a user can change the app’s display language. This screen presents a list of available languages, similar to the initial language selection but without the emblem. The user picks a language, the app re‑renders with the new translation, and if necessary, the app may apply live updates via `expo-updates` to reload with new language resources. The screen is only accessible to logged‑in public users.

## What it does
The screen guards with `useRedirectNonPublicFromPublicRoutes`. It uses `useAppLanguage` to read and update the language. It imports `APP_LANGUAGES` (array of `AppLanguageId` options) and renders them as a tappable list with a checkmark on the current language. On selection, the context updates the language, and optionally, `expo-updates` `reloadAsync()` may be triggered to fully reflect the language change (depending on implementation). Styling uses `Brand`, `FormColors`, `HomeColors`. Haptic feedback on selection.

## Libraries used
- **expo-router** – navigation back.
- **expo-haptics** – feedback.
- **expo-status-bar** – status bar.
- **expo-updates** – possibly reloads the app for language change.
- **@expo/vector-icons** – check icon.
- **react** / **react-native** / **react-native-safe-area-context** – core.
- **@/constants/brand** / **@/constants/languages** (`APP_LANGUAGES`, `AppLanguageId`) – tokens and language list.
- **@/constants/form** / **@/constants/home** – colours.
- **@/contexts/app-language-context** – language state.
- **@/hooks/use-app-translation** – translations.
- **@/hooks/use-redirect-non-public-from-public-routes** – guard.

## Logic implemented
1. Guard runs.
2. Read current language from context.
3. Render list of `APP_LANGUAGES`. Each item:
   - Language name in its native script.
   - Radio button or checkmark if active.
4. On tap:
   - Haptic.
   - `setLanguage(languageId)` updates context.
   - Context persists to `AsyncStorage`.
   - If `expo-updates` is used, may call `Updates.reloadAsync()` to ensure all dynamic labels update immediately (or a manual re‑render through i18n).
5. The user can navigate back; the new language is already applied everywhere.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
