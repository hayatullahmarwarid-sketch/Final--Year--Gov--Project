<!-- purpose-doc: normalized -->
# Home Screen (`index.tsx`)

## Scenario
After logging in, the user lands on the Home tab. This screen acts as a dashboard, prominently displaying the most recent official decrees. The user can scroll through decree cards, each showing a title, category, issue date, and a download button. Tapping the download button fetches the decree as a PDF and opens the operating system’s share sheet, allowing the user to save or share the document. The screen also integrates the notification inbox, showing an unread count badge in the top bar.

## What it does
The Home screen fetches the latest decrees (paginated) using `listPublicDecreesPage` and transforms the API response into a list of `DecreeListItem` objects. These items are rendered as `DecreeCard` components inside a `PublicMobileColumn` layout, which provides consistent padding and responsiveness. The screen constantly observes the current language via `useAppLanguage`; when the language changes, the UI copy (labels, messages) updates through `getPublicUiCopy`. Notification inbox status is read via `useNotificationInbox` to show the badge.

## Libraries used
- **expo-router** – base navigation; tapping a decree card navigates to a detailed view.
- **@expo/vector-icons** – icons for download, date, and category.
- **expo-status-bar** – status bar styling.
- **react** / **react-native-safe-area-context** – core UI.
- **@/components/home/DecreeCard** – renders a decree item with download action.
- **@/components/layout/public-mobile-column** – wraps the screen content.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – design tokens.
- **@/constants/public-ui-copy** (`getPublicUiCopy`) – dynamic UI strings based on language.
- **@/contexts/app-language-context** – tracks the current app language.
- **@/hooks/use-app-translation** – translation helper.
- **@/contexts/notification-inbox-context** – gives unread count and inbox state.
- **@/data/decree-models** – `DecreeListItem` type.
- **@/lib/api/public-user** – `listPublicDecreesPage` API function.
- **@/lib/adapters/toast** – shows error toasts.
- **@/lib/public/decree-adapters** – `apiDecreeToListItem` adapter.
- **@/lib/public/public-decree-download** – handles PDF download and sharing.

## Logic implemented
1. On mount, and when the language changes, the component fetches page 1 of decrees.
2. Raw decree data is mapped through `apiDecreeToListItem` to create `DecreeListItem` instances.
3. The list is rendered in a `FlatList`; each item uses `DecreeCard` which displays title, category, date.
4. Tapping the download icon on a card calls `downloadPublicDecreePdf(item.id)`. This function generates/retrieves the PDF and launches the native share dialog.
5. If the API request fails, `showToast` displays a friendly error message.
6. The notification badge is shown in a header component (imported indirectly through `DashboardShell` or custom home header) using `useNotificationInbox().unreadCount`.
7. All user‑facing text (“No decrees available”, “Download”, etc.) is obtained from `getPublicUiCopy(currentLanguage)`.
8. When the user pulls to refresh, a new page 1 request is made and the list updates.

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
