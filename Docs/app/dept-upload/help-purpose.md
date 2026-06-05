<!-- purpose-doc: normalized -->
# Department Upload Help Screen (`help.tsx`)

## Scenario
While using the department upload tools, a staff member taps “Help” in the navigation. They are presented with a comprehensive guide that explains how to use the decree upload feature, what each screen does, and answers to common questions. The screen is entirely static and does not fetch any live data; it just displays pre‑written content styled with the department’s theme.

## What it does
The component renders a scrollable view containing help sections. Each section may include a heading, a description paragraph, and an icon from `@expo/vector-icons`. The content is likely hard‑coded (or possibly loaded from a static JSON file) and covers topics such as “How to upload a decree”, “Managing categories”, “Understanding the reports”, etc. The screen accesses the department upload theme colours via `useDeptUploadThemeColorsOptional` and falls back to the default `DeptUploadDash` token. No data fetching or user input is involved.

## Libraries used
- **react** / **react-native** / **react-native-safe-area-context** – rendering and safe area.
- **@expo/vector-icons** – icons next to each help topic.
- **@/constants/dept-upload-dashboard** – base theme colours.
- **@/contexts/dept-upload-ui-context** (`useDeptUploadThemeColorsOptional`) – optional theme overrides for consistency with the rest of the department upload section.

## Logic implemented
1. The screen reads the current theme colours (text, background, accent) from `useDeptUploadThemeColorsOptional()` or falls back to `DeptUploadDash`.
2. It maps an array of help topics (titles, descriptions, icon names) to a list of `View` components.
3. Each help section displays an icon (e.g., “cloud-upload” for uploading, “list” for categories) and the corresponding text.
4. The content is scrollable and uses safe area insets so that nothing is obscured by notches or navigation bars.
5. No API calls, navigation actions, or state updates occur—this is a purely presentational screen.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
