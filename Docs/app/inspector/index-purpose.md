<!-- purpose-doc: normalized -->
# Inspector Dashboard Screen (`index.tsx`)

## Scenario
After logging in, an inspector lands on their dashboard. This is the home screen of the inspector section. It gives a quick overview of the day’s work: how many tasks are pending, how many are due today, recent inspection activity, and a shortcut to the task list. The inspector can see key metrics at a glance and tap any summary card to jump directly into the relevant list or task.

## What it does
This file is a thin Expo Router route that default‑exports the `InspectorDashboardScreen` component. The component consumes the `InspectorWorkspaceContext` (set up by the parent layout) to access the inspector’s assigned tasks, statistics, and recent activity. It renders a visually rich dashboard with:
- A greeting banner with the inspector’s name.
- Metric cards (e.g., “Pending Inspections: 5”, “Completed Today: 2”, “Overdue: 1”).
- A “Recent Activity” feed showing status changes and submissions.
- Quick‑action buttons to navigate to the task list or sync screen.

The screen participates in deep linking: navigating to `/inspector` opens this dashboard.

## Libraries used
- **expo-router** – provides the route, and the component uses it to navigate to sub‑screens (`tasks`, `sync`, etc.).
- **react** / **react-native** – renders the dashboard UI.
- **@/components/inspector/InspectorDashboardScreen** – the fully implemented dashboard component containing all data fetching, aggregation, and UI.

## Logic implemented
1. The file re‑exports `InspectorDashboardScreen`.
2. Inside that component (not shown but implied):
   - It reads workspace data from `useInspectorWorkspace()` (provided by the layout).
   - It computes metrics: total assigned, pending, completed, overdue (possibly based on task deadlines and statuses).
   - It renders metric cards using a grid or horizontal scroll.
   - It may fetch fresh data on mount or rely on the workspace context being updated periodically.
   - Tapping a metric card navigates to the filtered task list (e.g., `router.push('/inspector/tasks?status=pending')`).
   - The “Sync” quick action navigates to `sync.tsx`.
   - Errors or empty states are handled gracefully (e.g., “No tasks assigned”).
3. The screen integrates with the inspector theme (provided by the context) so that colors and fonts match the overall inspector UI.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Field inspector workflow.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
