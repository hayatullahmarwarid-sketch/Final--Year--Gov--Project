<!-- purpose-doc: normalized -->
# Department Upload Reports Screen (`reports.tsx`)

## Scenario
A department officer wants to analyse their decree upload data in detail. They navigate to the Reports tab. The screen presents an interactive analytics dashboard showing trends, charts, and key performance indicators. Additionally, they can tap a “Download Report” button to export the full analytics data as a file (e.g., CSV or PDF) for offline sharing or archiving.

## What it does
The screen calls `getDecreeUploadDashboard` on mount to fetch a `DecreeUploadDashboardDto` object containing aggregated statistics (e.g., uploads per month, status breakdown, category distribution). This data is rendered using the `DeptUploadSharedAnalyticsSection` component, which displays charts and summary cards. A download button triggers `downloadDeptUploadAnalyticsReport`, which generates the report file and opens the native share sheet so the officer can save or send the file. Any errors during fetching or downloading are caught and shown via `showToast`. The screen uses the department upload theme through `useDeptUploadThemeColorsOptional` and applies translations for labels.

## Libraries used
- **expo-router** – possibly for navigation; not explicitly seen besides screen existence.
- **@expo/vector-icons** – icons for download button, chart icons, etc.
- **react** / **react-native** / **react-native-safe-area-context** – core UI.
- **@/components/dept-upload/DeptUploadSharedAnalyticsSection** – renders the analytics UI.
- **@/contexts/dept-upload-ui-context** (`useDeptUploadThemeColorsOptional`) – theme colours.
- **@/hooks/use-app-translation** – localised labels (“Reports”, “Download”, “Error loading data”).
- **@/lib/api/decree-upload** – `getDecreeUploadDashboard` API function and `DecreeUploadDashboardDto` type.
- **@/lib/adapters/toast** (`showToast`) – feedback messages.
- **@/lib/dept-upload/reports-download** (`downloadDeptUploadAnalyticsReport`) – handles report generation and sharing.

## Logic implemented
1. The screen initialises a state variable `dashboardData` (null initially).
2. On mount, `getDecreeUploadDashboard()` is called. While waiting, a loading spinner is shown.
3. On success, `dashboardData` is set and passed to `DeptUploadSharedAnalyticsSection`.
4. If the API call fails, `showToast('Failed to load reports')` is displayed, and an error view is rendered.
5. **Download:**
   - A button labelled “Download Report” is shown.
   - On press, `downloadDeptUploadAnalyticsReport(dashboardData)` is called.
   - The function generates the file and opens the share sheet. If it fails, a toast error is shown.
6. The entire screen is styled with colours from `useDeptUploadThemeColorsOptional()`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
