<!-- purpose-doc: normalized -->
# Bookmarked Decrees Screen (`bookmarked-decrees.tsx`)

## Scenario
A public user often finds decrees they want to keep for quick reference. They bookmark decrees from the Home or Decrees tab. This screen lists all their bookmarked decrees in one place. Each decree card shows title, date, and a download button. The user can tap a card to view details, or tap the download button to save or share the PDF. The screen also ensures that only authenticated public users can access it; otherwise they are redirected.

## What it does
The component first invokes `useRedirectNonPublicFromPublicRoutes` to guard against non‑public access. It then fetches the bookmarked decrees page‑by‑page using `listPublicBookmarksPage` (from the public user data context). Raw bookmark data is adapted twice: first `apiBookmarkToListItem` extracts the decree reference, then `apiDecreeToListItem` converts it into a full `DecreeListItem`. The list is rendered with `DecreeCard` components. Each card offers a download action via `downloadPublicDecreePdf`. Language‑adaptive UI copy is provided by `useAppLanguage` and `useAppTranslation`. `HomeColors` and `FormColors` style the screen. Errors are shown via `showToast`.

## Libraries used
- **expo-router** – navigation to decree detail, and the route itself.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – card icons.
- **react** / **react-native-safe-area-context** – core UI.
- **@/components/home/DecreeCard** – renders each bookmarked decree.
- **@/constants/form** / **@/constants/home** – design tokens.
- **@/hooks/use-app-translation** – localised text.
- **@/contexts/public-user-data-context** – provides the public user ID.
- **@/data/decree-models** – type `DecreeListItem`.
- **@/lib/api/public-user** – `listPublicBookmarksPage`.
- **@/lib/adapters/toast** (`showToast`) – feedback.
- **@/lib/public/decree-adapters** – `apiBookmarkToListItem`, `apiDecreeToListItem`.
- **@/lib/public/public-decree-download** – download PDF.
- **@/hooks/use-redirect-non-public-from-public-routes** – access guard.
- **@/contexts/app-language-context** – language context.

## Logic implemented
1. The guard `useRedirectNonPublicFromPublicRoutes()` runs; if the user is not a valid public user, they are redirected.
2. On mount, page 1 of bookmarks is fetched via `listPublicBookmarksPage(publicUserId, page)`.
3. Each raw bookmark is transformed: `apiBookmarkToListItem` → an intermediate object, then `apiDecreeToListItem` → `DecreeListItem`.
4. The list is displayed using `FlatList`. Empty state shows a translated message.
5. Pull‑to‑refresh re‑fetches page 1.
6. On scroll end, the next page is loaded and appended.
7. Tapping a card navigates to the decree detail (`/decree/[id]`).
8. Tapping download calls `downloadPublicDecreePdf(decree.id)`, which generates/shows the PDF share dialog.
9. Errors from API or download are caught and displayed via `showToast`.
10. All labels (empty state, download) are translated via `useAppTranslation` with language from `useAppLanguage`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
