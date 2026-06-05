<!-- purpose-doc: normalized -->
# Inspector Admin Reports Service (`inspector-admin-reports.service.js`)

## Scenario

Business rules for this domain execute when controllers, jobs, or other services call into this service layer.

## What it does

The file exports the following surface (representative `export` lines):

- `export class InspectorAdminReportsService {`
- `export const inspectorAdminReportsService = new InspectorAdminReportsService();`

Path in repo: `back-end/src/modules/inspector-admin/inspector-admin-reports.service.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspector-admin-reports.service.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **../../../database/models/inspection-assignment.model.js** (`{ InspectionAssignmentModel }`) – relative project import.
- **../../../database/models/inspection-submission.model.js** (`{ InspectionSubmissionModel }`) – relative project import.
- **../../../database/models/certificate.model.js** (`{ CertificateModel }`) – relative project import.
- **../../../database/models/exam-attempt.model.js** (`{ ExamAttemptModel }`) – relative project import.
- **../../../database/models/exam.model.js** (`{ ExamModel }`) – relative project import.
- **../../../database/models/user.model.js** (`{ UserModel }`) – relative project import.
- **../../../database/models/decree.model.js** (`{ DecreeModel }`) – relative project import.
- **../shared/enums/inspection-assignment-status.js** (`{ InspectionAssignmentStatus }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Distinct from field inspector app subtree unless shared component.
- **inspector_admin** — Direct: Inspector admin APIs and workflows.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
