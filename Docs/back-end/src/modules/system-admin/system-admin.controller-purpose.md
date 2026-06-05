<!-- purpose-doc: normalized -->
# System Admin Controller (`system-admin.controller.js`)

## Scenario

A controller handles a specific HTTP action: it runs when a route delegates to it, validates input, calls services, and returns a response.

## What it does

The file exports the following surface (representative `export` lines):

- `export class SystemAdminController {`
- `export const systemAdminController = new SystemAdminController();`

Path in repo: `back-end/src/modules/system-admin/system-admin.controller.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `system-admin.controller.js`.

## Libraries used

- **../shared/http/index.js** (`{ asyncHandler, HttpStatus, sendPaginatedList, sendSuccess }`) – relative project import.
- **../../core/errors/app-error.js** (`{ UnauthorizedError }`) – relative project import.
- **../../services/audit/auditService.js** (`{ auditService }`) – relative project import.
- **./system-admin.service.js** (`{ systemAdminService }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Async route handlers are wrapped so thrown errors reach the global error middleware.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Elevated administration APIs.
