<!-- purpose-doc: normalized -->
# Inspector Admin Tracking Service (`inspector-admin-tracking.service.js`)

## Scenario

Business rules for this domain execute when controllers, jobs, or other services call into this service layer.

## What it does

The file exports the following surface (representative `export` lines):

- `export class InspectorAdminTrackingService {`
- `export const inspectorAdminTrackingService = new InspectorAdminTrackingService();`

Path in repo: `back-end/src/modules/inspector-admin/inspector-admin-tracking.service.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspector-admin-tracking.service.js`.

## Libraries used

- **pdfkit** – third-party dependency for this module.
- **../../../database/models/inspection-assignment.model.js** (`{ InspectionAssignmentModel }`) – relative project import.
- **../shared/enums/inspection-assignment-status.js** (`{ InspectionAssignmentStatus }`) – relative project import.
- **./lib/afghanistan-zones.js** (`{ AFGHANISTAN_ZONES, zoneByKey, zoneKeyFromLocation, extractPrimaryCityToken }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin APIs and workflows.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
