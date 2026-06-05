<!-- purpose-doc: normalized -->
# Certificates Tab Screen (`certificates.tsx`)

## Scenario
A public user opens the Certificates tab to view a list of their published examination or training certificates. The user sees a scrollable, paginated list of certificate cards. They can pull to refresh, and tapping a certificate navigates to its detailed view. If the network request fails, a toast notification informs them of the problem.

## What it does
The component fetches a paginated list of public certificates associated with the currently logged‑in user. It adapts the raw API response into a uniform list item shape that can be rendered by a reusable card component. While data is loading, a skeleton or spinner placeholder is shown. Once loaded, each certificate card displays key information such as the certificate title, issuing authority, issue date, and a status indicator. Interspersed with the list are gentle haptic feedback events on significant interactions.

## Libraries used
- **expo-router** – for linking to a certificate’s detail page and handling navigation.
- **@expo/vector-icons** – used for icons within certificate cards.
- **expo-haptics** – triggers light haptic feedback when the user pulls to refresh or interacts with a card.
- **expo-status-bar** – manages the status bar appearance.
- **react** / **react-native-safe-area-context** – core UI and safe‑area handling.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – design tokens (colors, spacing).
- **@/contexts/public-user-data-context** – provides the public user ID needed for API calls.
- **@/hooks/use-app-translation** – translates static UI text (empty states, button labels).
- **@/lib/api/public-user** (`listPublicCertificatesPage`) – performs the API request to fetch certificates.
- **@/lib/public/exam-cert-adapters** (`apiCertificateToListItem`) – transforms API data into the app’s internal item model.

## Logic implemented
1. The screen extracts the current public user ID from `usePublicUserData`.
2. On mount (and on pull‑to‑refresh), `listPublicCertificatesPage` is called with the user ID and page parameters.
3. The API response is mapped through `apiCertificateToListItem` to create an array of `CertificateListItem` objects.
4. The list is displayed in a `FlatList`, with each item rendered as a card that shows the title, issuer, and date.
5. An empty state (with translated text) is shown if the list is empty and loading is finished.
6. Pulling down triggers a haptic feedback via `expo-haptics` and re‑fetches the first page.
7. Tapping a card calls `router.push` to navigate to the certificate’s detail route (e.g., `/certificates/[id]`).
8. Errors during fetch are caught and displayed using a toast (not directly imported here, but used through a helper from adapters or the API module).

## Roles

- **public** — Direct: Public authentication, catalog, or signed-in public user experiences.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
