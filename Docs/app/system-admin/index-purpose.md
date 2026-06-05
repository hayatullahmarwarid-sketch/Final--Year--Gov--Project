<!-- purpose-doc: normalized -->
# System Admin Overview Dashboard (`index.tsx`)

## Scenario
After logging in, the system admin lands on this overview dashboard. It gives a high‑level snapshot of the entire platform: how many active users there are, how many inspections were completed this week, recent activity trends, and other key performance indicators. The centrepiece is an interactive line chart (`ActivityLineChart`) that shows platform activity over time (e.g., daily logins, inspections completed, decrees uploaded). The admin can use this data to quickly gauge platform health and spot anomalies.

## What it does
The screen uses `useSystemAdminRemote` to fetch aggregated dashboard metrics (e.g., total users, active staff, decrees uploaded, inspections completed, weekly activity series). It renders a set of metric cards in a grid, each styled with `shadowMetricDashboard`, `spacing`, and `Brand` tokens. The `ActivityLineChart` component receives a time‑series dataset and renders a line chart (built with a charting library, possibly via `@react-navigation/native` for screen awareness). The UI context (`useSystemAdminUi`) may provide theme overrides. All labels and numbers are formatted with `useAppTranslation` and localised date/number formatting. `showToast` is imported for displaying any fetching errors.

## Libraries used
- **expo-router** – may navigate to sub‑screens when a metric card is tapped.
- **@react-navigation/native** – likely used by the chart or for screen‑focus events to refresh data.
- **@expo/vector-icons** – metric card icons.
- **react** – core rendering.
- **@/lib/theme** – `Brand`, `shadowMetricDashboard`, `spacing`.
- **@/lib/adapters/toast** (`showToast`) – error feedback.
- **@/components/system-admin/ActivityLineChart** – renders the activity line chart.
- **@/constants/form** (`FormColors`) – design tokens.
- **@/contexts/system-admin-remote-context** (`useSystemAdminRemote`) – provides dashboard data.
- **@/contexts/system-admin-ui-context** (`useSystemAdminUi`) – UI theme.
- **@/hooks/use-app-translation** – localised labels.

## Logic implemented
1. On mount (and on screen focus via `@react-navigation/native`), the remote context fetches dashboard data (e.g., `remote.fetchDashboardOverview()`).
2. While loading, a shimmer/skeleton is displayed.
3. On success:
   - The metric cards are populated: “Total Users”, “Active Staff”, “Decrees This Month”, “Inspections Completed”, etc.
   - Each card is a tappable `AppPressable` (or similar) that navigates to the relevant management screen (e.g., tapping “Total Users” → `/system-admin/all-users`).
   - The `ActivityLineChart` receives the activity time series and renders the line chart.
4. On pull‑to‑refresh, the data is re‑fetched.
5. If fetching fails, `showToast('Failed to load dashboard data')` is displayed.
6. The UI colours are merged from `Brand`, `FormColors`, and the system‑admin UI context overrides.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Primary UI for system administration features.
