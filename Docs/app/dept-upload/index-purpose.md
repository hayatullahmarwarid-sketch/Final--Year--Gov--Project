<!-- purpose-doc: normalized -->
# Department Upload Home Screen (`index.tsx`)

## Scenario
When a department officer opens the department upload section, they land on this home dashboard. It gives them a quick overview of their department’s decree activities: key metrics (total uploaded, pending actions), a prominent “Upload Decree” button, a list of recent uploads, cards showing pending actions that require their attention, a feed of recent activity, and an analytics summary. From here, the officer can quickly jump to uploading a new decree, preview/edit a recently uploaded decree, or navigate to detailed reports.

## What it does
The screen uses `useDeptUploadWorkspace` to access the department’s workspace data (metrics, recent uploads, pending actions, activity log). It arranges these data into a vertically scrollable dashboard composed of several specialised components:

- **`DeptUploadUploadHero`** – a hero banner with a large “Upload Decree” button. Pressing it opens `UploadDecreeFormModal` where the officer can add a new decree. The modal, on success, triggers a toast and refreshes the workspace.
- **`DeptUploadMetricGrid`** – displays numeric KPIs (e.g., “Decrees Uploaded”, “Pending Review”) in a grid.
- **`DeptUploadRecentUploadsCard`** – shows the latest uploaded decrees, each with actions like “Preview” or “Edit”. Tapping preview opens `DecreePreviewModal`, tapping edit opens `EditDecreeModal`.
- **`DeptUploadPendingActionsCard`** – highlights items needing action (e.g., decrees awaiting approval) and allows quick resolution.
- **`DeptUploadRecentActivityCard`** – a chronological list of activity entries (e.g., “Decree #45 was approved”) using the `ActivityRow` type.
- **`DeptUploadSharedAnalyticsSection`** – a shared analytics component showing charts or summary statistics about decree performance.
- **`DeptUploadBottomInsights`** – additional contextual insights or tips.

The screen also accesses optional theme overrides from `useDeptUploadThemeColorsOptional` and applies them throughout. Actions such as preview, edit, and upload all communicate outcomes through `showToast`. The `formatDecreeNumberLabel` function is used to display decree numbers in a human‑readable format.

## Libraries used
- **expo-router** – no direct navigation shown (modals are presented using `react-native` Modal or the library’s own modal, but `expo-router` might be used for navigation to detail).
- **react** / **react-native** / **react-native-safe-area-context** – core UI.
- **@/components/dept-upload/DecreePreviewEditModals** – modals for previewing and editing decrees.
- **@/components/dept-upload/DeptUploadBottomInsights** – bottom insights component.
- **@/components/dept-upload/DeptUploadMetricGrid** – KPI grid.
- **@/components/dept-upload/DeptUploadPendingActionsCard** – pending actions list.
- **@/components/dept-upload/DeptUploadRecentActivityCard** – activity feed (uses `ActivityRow` type).
- **@/components/dept-upload/DeptUploadRecentUploadsCard** – recent uploads list (uses `RecentUploadRow` type).
- **@/components/dept-upload/DeptUploadSharedAnalyticsSection** – analytics section.
- **@/components/dept-upload/DeptUploadUploadHero** – hero upload banner.
- **@/components/dept-upload/UploadDecreeFormModal** – form modal for new decree.
- **@/constants/dept-upload-dashboard** – base theme token.
- **@/hooks/use-app-translation** – localised strings.
- **@/lib/adapters/toast** (`showToast`) – feedback.
- **@/contexts/dept-upload-ui-context** – theme overrides and UI state.
- **@/contexts/dept-upload-workspace-context** (`useDeptUploadWorkspace`) – workspace data and actions.
- **@/lib/decree-number-format** (`formatDecreeNumberLabel`) – formats decree numbers.

## Logic implemented
1. On mount, the screen reads the workspace from `useDeptUploadWorkspace()`. This includes `metrics`, `recentUploads`, `pendingActions`, `activity`, and functions like `refresh()`.
2. All data is passed to the respective child components. If any piece is missing, a loading or empty placeholder is shown.
3. **Upload:**
   - The hero button opens `UploadDecreeFormModal`.
   - On successful submission, the modal calls the workspace’s `uploadDecree` method and closes.
   - `showToast('Decree uploaded')` and the workspace refreshes.
4. **Recent uploads actions:**
   - Preview: opens `DecreePreviewModal` with the selected decree’s data.
   - Edit: opens `EditDecreeModal`, which pre‑fills the form. On save, the workspace updates the decree, toast confirms, and the list refreshes.
5. **Pending actions** are displayed as cards; tapping an action may trigger a confirmation dialog and then call a workspace mutation (e.g., approve/reject), updating the pending list.
6. The activity feed is rendered using the `ActivityRow` data from the workspace.
7. The analytics section is rendered using `DeptUploadSharedAnalyticsSection`, receiving the analytics portion of the workspace data.
8. The entire screen’s colours adapt via `useDeptUploadThemeColorsOptional()` merged with `DeptUploadDash`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
