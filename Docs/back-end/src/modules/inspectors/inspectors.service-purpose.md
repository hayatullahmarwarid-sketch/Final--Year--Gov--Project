<!-- purpose-doc: normalized -->
# Inspectors Service (`inspectors.service.js`)

## Scenario

Business rules for this domain execute when controllers, jobs, or other services call into this service layer.

## What it does

The file exports the following surface (representative `export` lines):

- `export class InspectorsService {`
- `export const inspectorsService = new InspectorsService();`

Path in repo: `back-end/src/modules/inspectors/inspectors.service.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspectors.service.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **../shared/constants/api.js** (`{ API_VERSION }`) – relative project import.
- **../../../database/repositories/inspection-assignment.repository.js** (`{ inspectionAssignmentRepository }`) – relative project import.
- **../../../database/repositories/inspection-submission.repository.js** (`{ inspectionSubmissionRepository }`) – relative project import.
- **../../../database/repositories/inspection-evidence-file.repository.js** (`{ inspectionEvidenceFileRepository }`) – relative project import.
- **../../../database/repositories/inspection-template.repository.js** (`{ inspectionTemplateRepository }`) – relative project import.
- **../../../database/repositories/stored-file.repository.js** (`{ storedFileRepository }`) – relative project import.
- **../../../database/repositories/user.repository.js** (`{ userRepository }`) – relative project import.
- **../../../database/repositories/decree.repository.js** (`{ decreeRepository }`) – relative project import.
- **../../../database/models/inspection-assignment.model.js** (`{ InspectionAssignmentModel }`) – relative project import.
- **../../../database/models/inspection-submission.model.js** (`{ InspectionSubmissionModel }`) – relative project import.
- **../../../database/models/pending-inspection-offline.model.js** (`{ PendingInspectionOfflineModel }`) – relative project import.
- **../../../database/models/inspection-template.model.js** (`{ InspectionTemplateModel }`) – relative project import.
- **../../../database/models/decree-category.model.js** (`{ DecreeCategoryModel }`) – relative project import.
- **../../core/database/mongo-session.js** (`{ withMongoTransaction }`) – relative project import.
- **../shared/query/pagination.js** (`{ toOffsetLimit }`) – relative project import.
- **../shared/http/index.js** (`{ BadRequestError, ConflictError, ForbiddenError, NotFoundError }`) – relative project import.
- **../shared/enums/inspection-assignment-status.js** (`{ InspectionAssignmentStatus }`) – relative project import.
- **../inspections/inspection-submission.rules.js** (`{ assertInspectionSubmissionMatchesTemplate }`) – relative project import.
- **../inspections/inspection-audit-score.js** (`{ computeInspectionAuditScore }`) – relative project import.
- **./inspectors.constants.js** (`{ INSPECTORS_ROUTE_MAP }`) – relative project import.
- **../inspector-admin/serializers/inspection-assignment.serializer.js** (`{ serializeInspectionAssignment }`) – relative project import.
- **../inspector-admin/serializers/inspection-submission.serializer.js** (`{ serializeInspectionSubmission }`) – relative project import.
- **../inspector-admin/serializers/inspection-template.serializer.js** (`{ serializeInspectionTemplate }`) – relative project import.
- **./serializers/inspection-evidence.serializer.js** (`{ serializeInspectionEvidenceFile }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
4. Zod validates structured input before business logic runs.
5. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
6. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Direct: Inspector-specific back-end resources (field users).
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
