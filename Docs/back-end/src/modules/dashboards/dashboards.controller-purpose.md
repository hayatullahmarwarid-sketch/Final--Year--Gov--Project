<!-- purpose-doc: normalized -->
# Dashboards Controller (`dashboards.controller.js`)

## Scenario
Each user role—public user, inspector, inspector admin, decree upload officer, system admin—has a dedicated dashboard view that presents relevant metrics and actions. The client requests the dashboard for the authenticated user’s role, and the controller fetches the appropriate data and returns it in a ready‑to‑use format. For inspectors, the controller also resolves the actual inspector user ID from the request context, as the authenticated subject may differ from the inspector’s own identity when an admin is previewing.

## What it does
Exports a `DashboardsController` class and a singleton `dashboardsController`. It contains a method for each dashboard type (likely a single method like `getDashboard` that switches on `req.user.role`, or distinct methods per role). The methods:

1. Receive the request and extract the user or inspector ID as needed. For the inspector dashboard, it uses `resolveInspectorUserId(req)` to get the correct inspector’s user ID (the request may be from the inspector themselves or from an admin viewing on behalf of an inspector).
2. Call the corresponding method in `dashboardsService` (e.g., `dashboardsService.getInspectorDashboard(inspectorUserId)`, `dashboardsService.getSystemAdminDashboard()`).
3. Send the result with `sendSuccess` and an HTTP 200 status.
4. All operations are wrapped with `asyncHandler` for automatic error forwarding.

## Libraries used
- **../shared/http/index.js** – `asyncHandler`, `sendSuccess`.
- **../inspectors/inspectors.context.js** – `resolveInspectorUserId` to get the target inspector’s user ID.
- **./dashboards.service.js** – `dashboardsService` that computes the dashboard data.

## Logic implemented
1. Example – `getInspectorDashboard(req, res)`:
   - `const inspectorUserId = resolveInspectorUserId(req);` – returns the authenticated user’s ID if they are an inspector, or the admin‑specified ID if the caller is an inspector admin.
   - `const data = await dashboardsService.getInspectorDashboard(inspectorUserId);`
   - `sendSuccess(res, 200, data);`
2. Example – `getSystemAdminDashboard(req, res)`:
   - `const data = await dashboardsService.getSystemAdminDashboard();`
   - `sendSuccess(res, 200, data);`
3. All errors (e.g., inspector not found, database errors) propagate through `asyncHandler` to the global error handler.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
