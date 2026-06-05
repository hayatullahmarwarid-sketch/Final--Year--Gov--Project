<!-- purpose-doc: normalized -->
# Language Selection Screen (`language.tsx`)

## Scenario
When the app is launched for the first time (or if the user hasn’t chosen a language), they are presented with this screen. It displays a list of available languages (e.g., Dari, Pashto, English) using cards that show the language name in its own script. After the user taps a language, the app switches to that language, persists the choice, and navigates to the login screen.

## What it does
The screen uses `useAppLanguage` to get the current language and a setter. It imports `orderedLanguageOptionsFromPortal` (an array of `AppLanguageOption` objects) and renders them as `LanguageOptionCard` components. Each card displays the language name, perhaps a flag or emblem. When a card is tapped, haptic feedback triggers, the language is set via the context setter, and `expo-router` navigates to `/login`. The screen also displays the `EmblemMark` at the top for brand consistency. All UI text is translated with `useAppTranslation`, but since it’s a language picker, much of the text may be fixed or pre‑defined. The status bar is styled with `Brand`.

## Libraries used
- **expo-haptics** – feedback on selection.
- **expo-router** – navigation to login.
- **expo-status-bar** – status bar.
- **react** / **react-native** / **react-native-safe-area-context** – core.
- **@/components/brand/EmblemMark** – emblem.
- **@/components/language/LanguageOptionCard** – card for each language.
- **@/constants/brand** – colour.
- **@/constants/languages** – `orderedLanguageOptionsFromPortal`, `AppLanguageId` type, `AppLanguageOption` type.
- **@/contexts/app-language-context** – language state and setter.
- **@/hooks/use-app-translation** – translations.

## Logic implemented
1. Render `EmblemMark` centered.
2. Below, a `FlatList` of `LanguageOptionCard` components, each receiving a language object.
3. The currently selected language (from context) is highlighted (maybe with a checkmark).
4. On tap of a card:
   - `Haptics.impactAsync(...)` provides feedback.
   - The language context’s `setLanguage(languageId)` updates the language.
   - `router.replace('/login')` navigates to the login screen.
5. The language choice is persisted to `AsyncStorage` inside the provider (so future app launches skip this screen).
6. Status bar matches `Brand` colour.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
