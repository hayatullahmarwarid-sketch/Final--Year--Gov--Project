<!-- purpose-doc: normalized -->
# Inspector Task List Screen (`index.tsx`)

## Scenario
An inspector opens the app and navigates to the “Tasks” section. They see a scrollable list of inspection tasks assigned to them. Each task is displayed as a card containing:
- The inspection title.
- The category or decree name(s).
- A location icon with the inspection location (e.g., “Paktika-Zerghoun Shar”) as set in the template, or a “Location not set” placeholder if missing.
- A date icon with the deadline (e.g., “Deadline 2026‑05‑07”).
- A status indicator (pending, in progress, completed).

Tapping a card navigates to the task detail screen where the inspector can review the full task information and start the inspection.

## What it does
This screen is an Expo Router route that re‑exports the `InspectorTaskListScreen` component. The component fetches the inspector’s assigned tasks from the backend (likely through a context or API call) and renders them in a `FlatList`. It handles loading, empty, and error states, and responds to a “pull‑to‑refresh” gesture to re‑fetch the latest assignments. The screen participates in deep‑linking: any deep link to `/inspector/tasks` will open this list.

## Libraries used
- **expo-router** – provides the route and navigation (tapping a task navigates to `tasks/[id]`).
- **react** / **react-native** – renders the list, cards, and interactive elements.
- **@/components/inspector/InspectorTaskListScreen** – the fully implemented component that contains all UI, state management, and data fetching logic.

## Logic implemented
1. The file default‑exports the `InspectorTaskListScreen` component.
2. Inside that component (not visible here but understood from its role):
   - It reads the inspector’s identity and possibly the task data from a context (e.g., `InspectorTasksContext`).
   - It fetches the paginated list of tasks, displaying a loading spinner initially.
   - It renders each task as a card with pre‑formatted metadata:
     - Title, category/decrees.
     - Location: if the inspection template defines an “Inspection Location”, that location is displayed; otherwise “Location not set” is shown.
     - Deadline: shows “Deadline YYYY‑MM‑DD” without adding unnecessary text like “Deadline on”.
   - Pull‑to‑refresh re‑fetches the first page.
   - Tapping a card calls `router.push(\`/inspector/tasks/${task.id}\`)` to open the task detail.
   - Errors are caught and displayed with a retry option.
3. Deep‑linking directly to this screen is possible if the user’s role allows.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Field inspector workflow.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
