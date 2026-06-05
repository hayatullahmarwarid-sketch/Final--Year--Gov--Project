<!-- purpose-doc: normalized -->
# Inspector Admin Controller (`inspector-admin.controller.js`)

## Scenario

A controller handles a specific HTTP action: it runs when a route delegates to it, validates input, calls services, and returns a response.

## What it does

The file exports the following surface (representative `export` lines):

- `export class InspectorAdminController {`
- `export const inspectorAdminController = new InspectorAdminController();`

Path in repo: `back-end/src/modules/inspector-admin/inspector-admin.controller.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspector-admin.controller.js`.

## Libraries used

- **../shared/http/index.js** (`{ asyncHandler, HttpStatus, sendPaginatedList, sendSuccess }`) – relative project import.
- **./inspector-admin.service.js** (`{ inspectorAdminService }`) – relative project import.
- **./inspector-admin-reports.service.js** (`{ inspectorAdminReportsService }`) – relative project import.
- **./inspector-admin-tracking.service.js** (`{ inspectorAdminTrackingService }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Async route handlers are wrapped so thrown errors reach the global error middleware.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin APIs and workflows.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
