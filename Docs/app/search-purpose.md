<!-- purpose-doc: normalized -->
# Unified Search Screen (`search.tsx`)

## Scenario
A user wants to find a specific decree quickly. They tap the search icon (often in the header), which opens this screen. At the top, a search bar awaits input. As the user types, an API call is made to `getUnifiedSearch`, which returns matching decrees (possibly also exams or certificates, but imports only show decree adapters). Results appear as `DecreeCard` components. Tapping one navigates to the decree detail. The search adapts to the current language.

## What it does
The screen uses `useAppLanguage` to detect language changes and possibly re‑trigger the search. It imports `getUnifiedSearch` to perform the search. The query is sent whenever the text changes (debounced). Raw results are mapped through `apiDecreeToListItem` to produce `DecreeListItem` objects, which are rendered by `DecreeCard`. The screen uses `Brand`, `FormColors`, `HomeColors` for styling. No explicit guard is imported; but it likely inherits public‑only access from the parent layout (tabs). The status bar is configured.

## Libraries used
- **expo-router** – navigation to detail.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – search icon.
- **react** / **react-native-safe-area-context** – core.
- **@/components/home/DecreeCard** – decree card.
- **@/constants/brand** / **@/constants/form** / **@/constants/home** – tokens.
- **@/contexts/app-language-context** – language.
- **@/lib/api/search** (`getUnifiedSearch`) – search API.
- **@/lib/public/decree-adapters** (`apiDecreeToListItem`) – adapter.
- **@/data/decree-models** – `DecreeListItem` type.

## Logic implemented
1. A `TextInput` search bar captures query.
2. On text change, after a short debounce (300ms), call `getUnifiedSearch(query)`.
3. Show a loading indicator while fetching.
4. On success, map results via `apiDecreeToListItem`.
5. Display in `FlatList` with `DecreeCard`.
6. If no results, show “No decrees found” message (translated).
7. Tapping a card navigates to `/decree/[id]`.
8. The language context may trigger a re‑fetch when it changes.
9. Errors shown with a toast (not imported but likely via a global `showToast` or inline).

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
