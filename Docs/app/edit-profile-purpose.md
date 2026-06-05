<!-- purpose-doc: normalized -->
# Edit Profile Screen (`edit-profile.tsx`)

## Scenario
A user wants to update their public profile—display name, avatar, and perhaps contact information. They navigate here from the profile tab. The screen shows a form pre‑filled with current data. The user can tap on the avatar to pick a new image from the device gallery using `expo-image-picker`. After editing, they save and the profile is updated in the backend and in the local contexts.

## What it does
The screen guards with `useRedirectNonPublicFromPublicRoutes` and consumes `useAuthSession` and `useUserProfile` for the current data. The avatar is displayed with `expo-image`. Tapping it triggers `expo-image-picker` to select an image; once chosen, the image is previewed and may be uploaded later. The form has fields for display name, etc. (exact fields depend on the component but not imported). On save, likely calls a profile update API (not imported here; possibly uses a workspace or context method). After success, the profile context is refreshed, a toast is shown, and the user navigates back. Haptic feedback is used for interactions. The UI uses `Brand`, `FormColors`, `HomeColors`.

## Libraries used
- **expo-router** – navigation.
- **expo-haptics** – feedback.
- **expo-image** – displays avatar.
- **expo-image-picker** – picks picture from gallery.
- **expo-status-bar** – status bar.
- **@expo/vector-icons** – edit icon.
- **react** / **react-native-safe-area-context** – core.
- **@/constants/brand** / **@/constants/form** / **@/constants/home** – tokens.
- **@/contexts/auth-session-context** – session info.
- **@/contexts/user-profile-context** – profile data and updater.
- **@/hooks/use-app-translation** – translations.
- **@/hooks/use-redirect-non-public-from-public-routes** – guard.

## Logic implemented
1. Guard checks public user access.
2. Current profile is read from `useUserProfile` and `useAuthSession`.
3. Form fields are initialised with current values (name, maybe bio).
4. Avatar area: shows current avatar via `expo-image`. On tap, `ImagePicker.launchImageLibraryAsync()`.
   - If a picture is picked, it’s displayed as a preview; actual upload may happen on save.
5. On “Save”:
   - Gathers all fields.
   - Calls profile update API (likely via context method `updateProfile`).
   - On success, updates local context, shows success toast, `router.back()`.
   - On error, shows error toast.
6. Haptic feedback on save and on image pick.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
