<!-- purpose-doc: normalized -->
# Index (`index.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export const rootRouter = Router();`

Path in repo: `back-end/src/routes/index.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `index.js`.

## Libraries used

- **express** – third-party dependency for this module.
- **../modules/shared/constants/api.js** (`{ API_VERSION }`) – relative project import.
- **./health.routes.js** (`{ healthRouter }`) – relative project import.
- **./metrics.routes.js** (`{ metricsRouter }`) – relative project import.
- **../modules/notifications/notifications.routes.js** (`{ notificationsRouter }`) – relative project import.
- **../modules/super-admin/super-admin.routes.js** (`{ superAdminRouter }`) – relative project import.
- **../modules/system-admin/system-admin.routes.js** (`{ systemAdminRouter }`) – relative project import.
- **../modules/decree-upload/decree-upload.routes.js** (`{ decreeUploadRouter }`) – relative project import.
- **../modules/inspector-admin/inspector-admin.routes.js** (`{ inspectorAdminRouter }`) – relative project import.
- **../modules/inspectors/inspectors.routes.js** (`{ inspectorsRouter }`) – relative project import.
- **../modules/public-users/public-users.routes.js** (`{ publicUsersRouter }`) – relative project import.
- **../modules/content/content.routes.js** (`{ contentRouter }`) – relative project import.
- **../modules/files/files.routes.js** (`{ filesRouter }`) – relative project import.
- **../modules/dashboards/dashboards.routes.js** (`{ dashboardsRouter }`) – relative project import.
- **../modules/devices/devices.routes.js** (`{ devicesRouter }`) – relative project import.
- **../modules/certificates/certificates-public.routes.js** (`{ certificatesPublicRouter }`) – relative project import.
- **../modules/search/search.routes.js** (`{ searchRouter }`) – relative project import.
- **../api/v1/auth/auth.routes.js** (`{ authRouter }`) – relative project import.
- **../api/v1/uploads/uploads.routes.js** (`{ uploadsRouter }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
