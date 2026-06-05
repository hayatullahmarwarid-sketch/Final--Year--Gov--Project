<!-- purpose-doc: normalized -->
# App (`app.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export function createApp() {`

Path in repo: `back-end/src/app.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `app.js`.

## Libraries used

- **compression** – third-party dependency for this module.
- **cors** – third-party dependency for this module.
- **express** – third-party dependency for this module.
- **helmet** – third-party dependency for this module.
- **node:path** – third-party dependency for this module.
- **pino-http** – third-party dependency for this module.
- **./config/env.js** (`{ getEnv }`) – relative project import.
- **./config/logger.js** (`{ getLogger }`) – relative project import.
- **./middlewares/request-context.middleware.js** (`{ requestContextMiddleware }`) – relative project import.
- **./middlewares/auth.middleware.js** (`{ resolveBearerJwtMiddleware }`) – relative project import.
- **./middlewares/not-found.middleware.js** (`{ notFoundMiddleware }`) – relative project import.
- **./middlewares/error-handler.middleware.js** (`{ errorHandlerMiddleware }`) – relative project import.
- **./middlewares/audit-http-writes.middleware.js** (`{ auditHttpWritesMiddleware }`) – relative project import.
- **./middlewares/rate-limit.middleware.js** (`{ globalApiLimiter }`) – relative project import.
- **./middlewares/metrics.middleware.js** (`{ metricsMiddleware }`) – relative project import.
- **./modules/shared/i18n/index.js** (`{ i18nMiddleware }`) – relative project import.
- **./routes/index.js** (`{ rootRouter }`) – relative project import.

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
