<!-- purpose-doc: normalized -->
# Decrees Tab Screen (`decrees.tsx`)

## Scenario

A user visits the Decrees tab to browse official government decrees. The screen first shows a list of decree categories (e.g., “Education”, “Health”). Tapping a category navigates to a second view that lists all decrees belonging to that category. Each decree card shows relevant metadata, and the user can download the full decree in PDF format directly from the card. Throughout the browsing and downloading process, the interface respects the user’s selected language.

## What it does
The component manages two levels of navigation within the decrees section: category listing and decree listing. It fetches decree categories from `listPublicDecreeCategoriesPage` and decrees from `listPublicDecreesPage`. The data is adapted via `apiDecreeToListItem` and displayed using the `DecreeBrowseCard` component. When the user taps a category, the screen’s internal state switches to show the decrees for that category, providing a seamless drill‑down experience. A download button on each decree card triggers `downloadPublicDecreePdf`, which generates the PDF and opens the native share sheet.

## Libraries used
- **expo-router** – manages navigation between the categories list and the decrees list via local state (or optional route params).
- **@expo/vector-icons** – location, calendar, and download icons on cards.
- **expo-status-bar** – status bar styling.
- **react** / **react-native-safe-area-context** – core rendering and safe area.
- **@/components/decrees/DecreeBrowseCard** – reusable card component for a decree.
- **@/components/layout/public-mobile-column** – ensures consistent mobile padding and max width.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – color and spacing tokens.
- **@/constants/public-ui-copy** (`getPublicUiCopy`) – returns language‑specific UI copy (labels, buttons).
- **@/contexts/app-language-context** – current language state.
- **@/hooks/use-app-translation** – general translation fallback.
- **@/data/decree-models** – TypeScript type `DecreeListItem`.
- **@/lib/api/public-user** – `listPublicDecreeCategoriesPage` and `listPublicDecreesPage`.
- **@/lib/adapters/toast** – shows error/success toasts.
- **@/lib/public/decree-adapters** – `apiDecreeToListItem` adapter.
- **@/lib/public/public-decree-download** – initiates PDF download and share.

## Logic implemented
1. On mount, the screen fetches the first page of decree categories and stores them.
2. The categories are displayed as tappable cards. Tapping a category sets a local state variable (`selectedCategoryId`).
3. When a category is selected, a second API call fetches decrees for that category (paginated).
4. The decree data is adapted using `apiDecreeToListItem` and rendered as `DecreeBrowseCard` components.
5. Each card contains a download button. Pressing it calls `downloadPublicDecreePdf` with the decree ID. The function handles PDF generation and opens the OS share sheet.
6. If any API call fails, `showToast` displays an error message with a retry prompt.
7. All static text (category names, labels like “Download”, “No decrees”) comes from `getPublicUiCopy` based on the current app language.
8. When the user presses the back button (or a breadcrumb) from the decree list, the state resets to the category view.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
