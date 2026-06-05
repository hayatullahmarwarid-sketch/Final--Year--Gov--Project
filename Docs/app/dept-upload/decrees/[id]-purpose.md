<!-- purpose-doc: normalized -->
# Department Upload Decree Detail Screen (`[id].tsx`)

## Scenario
A department staff member taps a decree from the decree management list and lands on this detail screen. The screen displays the full decree information (title, category, issue date, decree number, etc.) using a theme specific to the department upload dashboard. The user can copy the formatted decree number to the device clipboard with a single tap. If a destructive action (e.g., deleting or rejecting the decree) is available, the system prompts a confirmation dialog before proceeding and shows a toast on completion.

## What it does
This screen receives the decree data via route parameters (no API call is made here; the parent list screen passes the decree object). It formats the decree number with `formatDecreeNumberLabel` and renders the details styled with tokens from `DeptUploadDash`, `Brand`, and `FormColors`. A **Copy Decree Number** button calls `expo-clipboard` to copy the formatted number and briefly acknowledges the action. For privileged actions like “Reject”, the component uses the `confirm` dialog adapter to ask the user for confirmation; on approval, it invokes the appropriate logic (often via a callback passed from the navigation state or context) and then shows a success or error toast through `showToast`. All UI labels are translated via `useAppTranslation`, but the display is not directly tied to public user data—it’s an internal management screen.

## Libraries used
- **expo-router** – reads the decree `[id]` and any passed parameters; controls navigation back.
- **expo-clipboard** – copies the formatted decree number to the system clipboard.
- **@expo/vector-icons** – icons for copy, actions, and metadata fields.
- **react** / **react-native-safe-area-context** – core UI.
- **@/constants/brand**, **@/constants/dept-upload-dashboard** (`DeptUploadDash`), **@/constants/form** (`FormColors`) – design tokens for the department upload UI.
- **@/contexts/app-language-context** – current app language for formatting.
- **@/hooks/use-app-translation** – localised strings for buttons and labels.
- **@/lib/adapters/dialog** (`confirm`) – shows a native confirmation dialog.
- **@/lib/adapters/toast** (`showToast`) – displays non‑blocking feedback messages.
- **@/lib/decree-number-format** (`formatDecreeNumberLabel`) – formats the decree’s sequential number into a human‑readable label.

## Logic implemented
1. The screen extracts the decree ID and any full decree object from the route params (likely passed as a serialised object because no internal fetch is imported).
2. The decree’s core fields (title, category, date, number) are displayed in a scrollable layout using the `DeptUploadDash` theme.
3. The decree number is formatted with `formatDecreeNumberLabel(decree)` and shown in a prominent field.
4. **Copy action:**
   - User taps “Copy Decree Number”.
   - `Clipboard.setStringAsync(formattedNumber)` is called.
   - A short haptic or visual feedback confirms the copy.
5. **Destructive action (if present):**
   - A “Reject” or “Delete” button is shown (implementation may be conditional).
   - Tapping it opens a `confirm` dialog (“Are you sure you want to reject this decree?”).
   - If confirmed, the action is performed (could involve a callback from the route or a context method), and `showToast` displays the outcome.
6. The back navigation uses `expo-router`’s `router.back()` or a header back button.
7. Language changes cause all labels to re‑render via `useAppTranslation`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
