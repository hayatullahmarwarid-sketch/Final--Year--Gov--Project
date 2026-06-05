<!-- purpose-doc: normalized -->
# Exams Tab Screen (`exams.tsx`)

## Scenario
A user opens the Exams tab to stay informed about upcoming examinations and to check their results. The screen presents two segmented views: “Upcoming Exams” and “Results”. In the “Upcoming Exams” section, the user sees a list that includes exam titles, dates, and locations. In the “Results” section, they see published results with pass/fail status and marks. The user can pull to refresh each list independently, and tapping an exam or result navigates to its detailed view.

## What it does
The component manages two parallel data streams: exams fetched via `listPublicExamsPage` and results fetched via `listPublicResultsPage`. A segmented control (or tab) allows the user to switch between the two lists without leaving the screen. Public user context ensures that only the current user’s data is loaded. Haptic feedback is emitted when switching segments or pulling to refresh. The visual presentation uses the app’s brand and home screen color tokens.

## Libraries used
- **expo-router** – navigation to detail screens.
- **@expo/vector-icons** – icons for exam cards and result indicators.
- **expo-haptics** – triggers haptic feedback on interactions.
- **expo-status-bar** – status bar management.
- **react** / **react-native-safe-area-context** – UI framework.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – design tokens.
- **@/contexts/public-user-data-context** – provides public user identity.
- **@/hooks/use-app-translation** – localised labels (tabs, empty states).
- **@/lib/api/public-user** – `listPublicExamsPage` and `listPublicResultsPage`.

## Logic implemented
1. The screen reads the public user ID from `usePublicUserData`.
2. A state variable tracks which segment is active (“exams” or “results”).
3. When the “exams” segment is active, `listPublicExamsPage` is called on mount and on pull‑to‑refresh. The returned data is displayed in a `FlatList`.
4. When the “results” segment is active, `listPublicResultsPage` is called instead.
5. The segmented control uses `useAppTranslation` to display “Upcoming Exams” and “Results” labels.
6. Touching a segment triggers haptic feedback and swaps the visible list.
7. Pull‑to‑refresh on either list triggers a haptic event and re‑fetches the respective data.
8. Tapping an exam or result item navigates to a detail route (e.g., `/exams/[id]`).
9. Loading and error states are handled with spinners and inline error messages.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
