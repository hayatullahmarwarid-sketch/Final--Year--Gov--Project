<!-- purpose-doc: normalized -->
# System Admin Routes (`system-admin.routes.js`)

## Scenario

HTTP requests hit this router after the server maps a URL prefix here. It runs for each matching request (with middleware such as auth and validation applied upstream or inline).

## What it does

The file exports the following surface (representative `export` lines):

- `export const systemAdminRouter = Router();`

Path in repo: `back-end/src/modules/system-admin/system-admin.routes.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `system-admin.routes.js`.

## Libraries used

- **express** – third-party dependency for this module.
- **../shared/http/index.js** (`{ validateRequest }`) – relative project import.
- **../../middlewares/auth.middleware.js** (`{ authenticate }`) – relative project import.
- **../../middlewares/authorize.middleware.js** (`{ authorize }`) – relative project import.
- **./system-admin.controller.js** (`{ systemAdminController }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Express routing maps HTTP methods and paths to handlers (often composed with `asyncHandler` and validation middleware).
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Elevated administration APIs.
