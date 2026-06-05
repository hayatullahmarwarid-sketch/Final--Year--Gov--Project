<!-- purpose-doc: normalized -->
# Public Users Service (`public-users.service.js`)

## Scenario

Business rules for this domain execute when controllers, jobs, or other services call into this service layer.

## What it does

The file exports the following surface (representative `export` lines):

- `export class PublicUsersService {`
- `export const publicUsersService = new PublicUsersService();`

Path in repo: `back-end/src/modules/public-users/public-users.service.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `public-users.service.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **../shared/constants/api.js** (`{ API_VERSION }`) – relative project import.
- **../shared/query/pagination.js** (`{ toOffsetLimit, paginatedList }`) – relative project import.
- **../shared/enums/decree-lifecycle.js** (`{ DecreeLifecycle }`) – relative project import.
- **../shared/enums/exam-lifecycle.js** (`{ ExamLifecycle }`) – relative project import.
- **../shared/enums/exam-attempt-status.js** (`{ ExamAttemptStatus }`) – relative project import.
- **../shared/enums/certificate-kind.js** (`{ CertificateKind }`) – relative project import.
- **../shared/enums/roles.js** (`{ RoleKey }`) – relative project import.
- **../shared/http/index.js** (`{ NotFoundError, ConflictError }`) – relative project import.
- **../decree-upload/serializers/decree.serializer.js** (`{ buildDecreeNumberLabel, serializeDecree }`) – relative project import.
- **../../../database/models/decree.model.js** (`{ DecreeModel }`) – relative project import.
- **../../../database/repositories/decree.repository.js** (`{ decreeRepository }`) – relative project import.
- **../../../database/repositories/decree-view.repository.js** (`{ decreeViewRepository }`) – relative project import.
- **../../../database/repositories/decree-version.repository.js** (`{ decreeVersionRepository }`) – relative project import.
- **../../../database/repositories/decree-category.repository.js** (`{ decreeCategoryRepository }`) – relative project import.
- **../../../database/repositories/decree-bookmark.repository.js** (`{ decreeBookmarkRepository }`) – relative project import.
- **../../../database/repositories/user.repository.js** (`{ userRepository }`) – relative project import.
- **../../../database/repositories/exam.repository.js** (`{ examRepository }`) – relative project import.
- **../../../database/repositories/exam-question.repository.js** (`{ examQuestionRepository }`) – relative project import.
- **../../../database/repositories/exam-attempt.repository.js** (`{ examAttemptRepository }`) – relative project import.
- **../../../database/repositories/certificate.repository.js** (`{ certificateRepository }`) – relative project import.
- **../../../database/repositories/notification.repository.js** (`{ notificationRepository }`) – relative project import.
- **../../../database/repositories/static-content-page.repository.js** (`{ staticContentPageRepository }`) – relative project import.
- **../../../database/repositories/system-platform-settings.repository.js** (`{ systemPlatformSettingsRepository }`) – relative project import.
- **../exams/grading.service.js** (`{ gradeAttempt as buildGradedAnswers }`) – relative project import.
- **../exams/public-exam-eligibility.js** (`{ assertEligibleForNewExamAttempt }`) – relative project import.
- **../certificates/certificate-issue.workflow.js** (`{ certificateIssueWorkflow }`) – relative project import.
- **./lib/shuffle.js** (`{ shuffleArray }`) – relative project import.
- **./serializers/public-exam.serializer.js** (`{ serializePublicExamSummary }`) – relative project import.
- **./serializers/public-exam-question.serializer.js** (`{ serializePublicExamQuestion }`) – relative project import.
- **./serializers/public-notification.serializer.js** (`{ serializePublicNotification }`) – relative project import.
- **./serializers/public-bookmark.serializer.js** (`{ serializePublicBookmark }`) – relative project import.
- **./serializers/public-certificate.serializer.js** (`{ serializePublicCertificate }`) – relative project import.
- **./serializers/public-exam-result.serializer.js** (`{ serializePublicExamResult }`) – relative project import.
- **./serializers/public-decree-category.serializer.js** (`{ serializePublicDecreeCategory }`) – relative project import.
- **../../../database/models/notification.model.js** (`{ NotificationModel }`) – relative project import.
- **./decree-pdf.renderer.js** (`{ renderDecreePdf }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Direct: Public HTTP surface for end users.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
