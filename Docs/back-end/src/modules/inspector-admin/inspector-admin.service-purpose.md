<!-- purpose-doc: normalized -->
# Inspector Admin Service (`inspector-admin.service.js`)

## Scenario

Business rules for this domain execute when controllers, jobs, or other services call into this service layer.

## What it does

The file exports the following surface (representative `export` lines):

- `export class InspectorAdminService {`
- `export const inspectorAdminService = new InspectorAdminService();`

Path in repo: `back-end/src/modules/inspector-admin/inspector-admin.service.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `inspector-admin.service.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **../shared/constants/api.js** (`{ API_VERSION }`) – relative project import.
- **../../../database/repositories/inspection-template.repository.js** (`{ inspectionTemplateRepository }`) – relative project import.
- **../../../database/repositories/inspection-assignment.repository.js** (`{ inspectionAssignmentRepository }`) – relative project import.
- **../../../database/repositories/inspection-submission.repository.js** (`{ inspectionSubmissionRepository }`) – relative project import.
- **../../../database/repositories/exam.repository.js** (`{ examRepository }`) – relative project import.
- **../../../database/repositories/exam-question-bank.repository.js** (`{ examQuestionBankRepository }`) – relative project import.
- **../../../database/repositories/exam-question.repository.js** (`{ examQuestionRepository }`) – relative project import.
- **../../../database/repositories/exam-attempt.repository.js** (`{ examAttemptRepository }`) – relative project import.
- **../../../database/repositories/certificate.repository.js** (`{ certificateRepository }`) – relative project import.
- **../../../database/repositories/decree.repository.js** (`{ decreeRepository }`) – relative project import.
- **../../../database/repositories/decree-category.repository.js** (`{ decreeCategoryRepository }`) – relative project import.
- **../../../database/repositories/user.repository.js** (`{ userRepository }`) – relative project import.
- **../../../database/models/decree-version.model.js** (`{ DecreeVersionModel }`) – relative project import.
- **../../../database/models/inspection-assignment.model.js** (`{ InspectionAssignmentModel }`) – relative project import.
- **../../../database/models/inspection-template.model.js** (`{ InspectionTemplateModel }`) – relative project import.
- **../../../database/models/exam.model.js** (`{ ExamModel }`) – relative project import.
- **../../../database/models/certificate.model.js** (`{ CertificateModel }`) – relative project import.
- **../../../database/models/inspection-submission.model.js** (`{ InspectionSubmissionModel }`) – relative project import.
- **../shared/query/pagination.js** (`{ toOffsetLimit }`) – relative project import.
- **../shared/enums/roles.js** (`{ RoleKey }`) – relative project import.
- **../shared/enums/inspection-assignment-status.js** (`{ InspectionAssignmentStatus }`) – relative project import.
- **../shared/enums/certificate-status.js** (`{ CertificateStatus }`) – relative project import.
- **../shared/enums/exam-lifecycle.js** (`{ ExamLifecycle }`) – relative project import.
- **../shared/enums/exam-question-type.js** (`{ ExamQuestionType }`) – relative project import.
- **../exams/exam-lifecycle.rules.js** (`{ assertExamAdminLifecycleTransition }`) – relative project import.
- **../inspections/inspection-submission-review.workflow.js** (`{ inspectionSubmissionReviewWorkflow }`) – relative project import.
- **../../../database/repositories/inspection-evidence-file.repository.js** (`{ inspectionEvidenceFileRepository }`) – relative project import.
- **../../services/storage/upload.service.js** (`{ resolveStoredFileUrl }`) – relative project import.
- **./inspector-admin.constants.js** (`{ INSPECTOR_ADMIN_ROUTE_MAP }`) – relative project import.
- **./serializers/inspection-template.serializer.js** (`{ serializeInspectionTemplate }`) – relative project import.
- **./serializers/inspection-assignment.serializer.js** (`{ serializeInspectionAssignment }`) – relative project import.
- **./serializers/inspection-submission.serializer.js** (`{ serializeInspectionSubmission }`) – relative project import.
- **./serializers/exam.serializer.js** (`{ serializeExam }`) – relative project import.
- **./serializers/certificate.serializer.js** (`{ serializeCertificate }`) – relative project import.
- **./serializers/exam-question.serializer.js** (`{ serializeExamQuestionAdmin }`) – relative project import.
- **./serializers/exam-question-bank.serializer.js** (`{ serializeExamQuestionBankEntry }`) – relative project import.
- **./serializers/exam-attempt-admin.serializer.js** (`{ serializeExamAttemptAdmin }`) – relative project import.
- **../shared/enums/user-account-status.js** (`{ UserAccountStatus }`) – relative project import.
- **../shared/enums/exam-attempt-status.js** (`{ ExamAttemptStatus }`) – relative project import.
- **../shared/enums/certificate-kind.js** (`{ CertificateKind }`) – relative project import.
- **../certificates/certificate-issue.workflow.js** (`{ certificateIssueWorkflow }`) – relative project import.
- **../../../database/models/notification.model.js** (`{ NotificationModel }`) – relative project import.

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
