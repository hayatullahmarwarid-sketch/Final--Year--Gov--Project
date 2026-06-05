<!-- purpose-doc: normalized -->
# Decree Detail Screen (`[id].tsx`)

## Scenario
A user taps on a decree card from the Home or Decrees tab and is brought to this full‑detail view. The screen displays the complete decree text, metadata, and any associated legal references. The user can copy a decree reference number to the clipboard with a single tap, receiving haptic confirmation. The screen tracks that the user has viewed this decree (engagement counting) and the content is rendered with smooth animations for a polished reading experience.

## What it does
The component extracts the decree `id` from the route parameter and fetches the full decree object via `getPublicDecreeById`. The API response is adapted to a `DecreeDetailModel` using `apiDecreeToDetailModel`. The model contains structured content (headings, paragraphs, articles) that is rendered with `react-native-reanimated` for entrance animations and scroll transitions. A prominent **Copy Reference** button takes the decree’s official reference identifier and writes it to the device clipboard using `expo-clipboard`; a short haptic pulse confirms the action. The custom hook `useDecreeEngagementView` increments the view count on the backend (or local analytics) when the screen mounts. The interface uses colour tokens from `Brand`, `FormColors`, and `HomeColors` to maintain a consistent legal‑document aesthetic. The screen adapts to the current app language via `useAppLanguage` so that labels like “Copy Reference” and “Decree No.” are always in the user’s chosen language.

## Libraries used
- **expo-router** – retrieves the `[id]` route parameter.
- **expo-clipboard** – copies text (the decree reference) to the system clipboard.
- **expo-haptics** – triggers a haptic feedback when the user copies the reference.
- **react-native-reanimated** – powers smooth scroll and entry animations for the decree content.
- **@expo/vector-icons** – icons for the copy button and metadata fields.
- **expo-status-bar** – manages the status bar appearance.
- **react** / **react-native-safe-area-context** – core UI framework.
- **@/constants/brand**, **@/constants/form**, **@/constants/home** – design tokens.
- **@/contexts/public-user-data-context** – provides the public user identity for engagement tracking and potentially personalisation.
- **@/contexts/app-language-context** – the current app language.
- **@/data/decree-detail-content** – TypeScript type `DecreeDetailModel`.
- **@/hooks/use-app-translation** – localised strings.
- **@/hooks/use-decree-engagement-view** – records that the user has viewed this decree (increments a count, possibly sends analytics).
- **@/lib/api/public-user** – `getPublicDecreeById` API function.
- **@/lib/public/decree-adapters** – `apiDecreeToDetailModel` adapter.

## Logic implemented
1. The `id` is extracted from the route parameters (`useLocalSearchParams`).
2. On mount, `getPublicDecreeById(id)` is called. While loading, a full‑screen skeleton or spinner is shown.
3. On success, `apiDecreeToDetailModel` transforms the raw data into a structured `DecreeDetailModel`.
4. The detail model is rendered inside a `ScrollView` with animated sections (using `FadeInUp` etc. from `react-native-reanimated`).
5. The **Copy Reference** button:
   - Reads the reference string from the model (e.g., “Decree No. 42/1402”).
   - Calls `Clipboard.setStringAsync(reference)`.
   - Triggers `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`.
   - Displays a brief “Copied!” tooltip or toast.
6. The hook `useDecreeEngagementView(decreeId, publicUserId)` is called once the data is loaded. It sends a view event to the backend (or increments local analytics).
7. The screen observes `useAppLanguage`; when the language changes, all UI labels re‑render with the correct translation.
8. The `expo-status-bar` is configured to match the decree detail theme (usually dark text on light background or vice‑versa).
9. If the API call fails, an error screen is shown with a retry option.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
