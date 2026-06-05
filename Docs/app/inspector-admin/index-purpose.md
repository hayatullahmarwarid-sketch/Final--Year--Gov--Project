<!-- purpose-doc: normalized -->
# Inspector Admin Home Screen (`index.tsx`)

## Scenario
After logging in, the inspector admin lands on this dashboard. It gives an at‑a‑glance view of the entire inspection system: key activity metrics over time (displayed as a chart), the number of active inspectors, pending submissions, upcoming exams, and recent alerts. The admin can tap any summary card to navigate to the corresponding management screen.

## What it does
The screen uses `useInspectorAdminWorkspace` to fetch an overview of the system (e.g., counts of assignments, submissions, exams, templates) and `useAuthSession` to personalise the greeting. It renders a `DashboardActivityChart` component that visualises activity over the last weeks/months (e.g., inspections completed vs. pending). A set of tappable metric cards (using `AppPressable`) show quick stats and navigate to the relevant sub‑screens (assignments, submissions, etc.). All text is localised via `useAppTranslation`.

## Libraries used
- **expo-router** – navigation to sub‑screens.
- **@expo/vector-icons** – card icons.
- **react** / **react-native** – core UI.
- **@/components/inspector-admin/DashboardActivityChart** – the chart component.
- **@/components/ui/AppPressable** – tappable metric cards.
- **@/contexts/auth-session-context** (`useAuthSession`) – displays the admin’s name.
- **@/hooks/use-app-translation** – localised strings.
- **@/hooks/use-inspector-admin-workspace** – provides dashboard data (metrics, recent activity).

## Logic implemented
1. On mount, the workspace loads dashboard data (`workspace.dashboardData`).
2. The admin’s name is extracted from the session and displayed in a greeting.
3. The `DashboardActivityChart` receives time‑series data (e.g., completed/pending per day) and renders the chart.
4. Metric cards are built from the workspace’s summary counts:
   - “Active Inspectors: 12” → tapping navigates to `/inspector-admin/settings` (where inspectors are managed).
   - “Pending Submissions: 8” → navigates to `/inspector-admin/submissions`.
   - “Upcoming Exams: 3” → navigates to `/inspector-admin/exams`.
   - “Templates: 15” → navigates to `/inspector-admin/templates`.
5. Each card uses `AppPressable` for a pleasant touch effect.
6. If data fails to load, an error state is shown with a retry button.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin dashboards and tools.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
