<!-- purpose-doc: normalized -->
# Dashboard Serializer (`dashboards.serializer.js`)

## Scenario
The back‑end computes aggregated dashboard metrics for different user roles—system admin, decree upload department, inspector admin, inspector, and general public users. Each dashboard view needs only a specific subset of the available data, and the internal representations may contain raw counts, dates that need formatting, or optional fields that must be safely cast. Instead of duplicating transformation logic across controllers, this module provides a set of pure functions that convert the internal dashboard data transfer objects (DTOs) into safe, JSON‑ready objects tailored to each role.

## What it does
Exports five serialization functions, one for each dashboard type:

- **`serializeSystemAdminDashboardDto(payload)`** – takes the system admin dashboard DTO and returns a formatted object containing key platform‑wide metrics: total users, active staff, decrees per month, inspections completed, recent audit log counts, and other system‑level statistics.
- **`serializeDecreeUploadDashboardDto(payload)`** – formats the department‑specific dashboard with decree upload counts, pending reviews, recent activity, and category breakdowns.
- **`serializeInspectorAdminDashboardDto(payload)`** – transforms the inspector admin dashboard data, including assignment statistics, submission statuses, inspector compliance rates, and upcoming deadlines.
- **`serializeInspectorDashboardDto(payload)`** – serializes the individual inspector’s dashboard: their assigned tasks, completion rates, upcoming deadlines, and recent submissions.
- **`serializePublicDashboardDto(payload)`** – formats the public dashboard with publicly available metrics like published decree count, recent decrees, and service announcements.

Each function takes a raw DTO (a plain object obtained from a service or repository) and returns a cleaned object with only the necessary fields, applying any necessary type conversions (e.g., ensuring numbers are integers, dates become ISO strings, nulls become `0` or `"N/A"`). The comment at the top suggests there is a helper function (not exported) that normalises some common field, such as converting a value to a string or null.

## Libraries used
- None – pure JavaScript transformation functions.

## Logic implemented
1. Each function acts as a mapper that destructures the incoming `payload` and builds a new object.
2. For example, `serializeInspectorDashboardDto` might do:
   ```js
   return {
     totalAssigned: payload.totalAssigned ?? 0,
     completedToday: payload.completedToday ?? 0,
     pending: payload.pending ?? 0,
     overdue: payload.overdue ?? 0,
     recentActivity: payload.recentActivity ?? [],
     lastSyncedAt: payload.lastSyncedAt?.toISOString() ?? null,
   };

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
