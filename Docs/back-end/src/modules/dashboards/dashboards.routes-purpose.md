<!-- purpose-doc: normalized -->
# Dashboards Routes (`dashboards.routes.js`)

## Scenario
The API exposes a set of endpoints under `/api/v1/dashboards/` so clients can fetch role‑specific dashboards. Unauthenticated requests cannot access any dashboard; the endpoint requires a valid access token. Moreover, the public user dashboard needs additional context setup (e.g., setting the public user data on the request). This route file wires the endpoints with the necessary middleware.

## What it does
Creates an Express `Router` and defines routes for each dashboard type, applying middleware:

- **Inspector Dashboard** – `GET /inspector` (or `GET /inspector/:inspectorId` for admins). Uses `authenticate` and `authorize` to allow inspectors and inspector admins. The controller then calls `resolveInspectorUserId`.
- **Inspector Admin Dashboard** – `GET /inspector-admin`. Only inspector admin role allowed.
- **System Admin Dashboard** – `GET /system-admin`. Only system admin role allowed.
- **Dept Upload Dashboard** – `GET /dept-upload`. Only decree upload department role allowed.
- **Public Dashboard** – `GET /public`. Uses `authenticate` to identify the user, then `publicUserContextMiddleware` to load the public user profile (if needed), and `authorize` for public users.

The exact route patterns may be like `/inspector`, `/inspector-admin`, `/system-admin`, `/dept-upload`, `/public`. The `dashboardsRouter` is exported.

## Libraries used
- **express** – Router.
- **../../middlewares/auth.middleware.js** – `authenticate`.
- **../../middlewares/authorize.middleware.js** – `authorize`.
- **../public-users/middleware/public-user-context.middleware.js** – `publicUserContextMiddleware` to set public user data on the request.
- **./dashboards.controller.js** – `dashboardsController`.

## Logic implemented
1. The router is created.
2. For each route, the appropriate middleware chain is assembled, e.g.:
   ```js
   dashboardsRouter.get(
     '/inspector/:inspectorId?',
     authenticate,
     authorize(['inspector', 'inspector_admin']),
     dashboardsController.getInspectorDashboard
   );
   dashboardsRouter.get(
     '/public',
     authenticate,
     authorize(['public']),
     publicUserContextMiddleware,
     dashboardsController.getPublicDashboard
   );

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
