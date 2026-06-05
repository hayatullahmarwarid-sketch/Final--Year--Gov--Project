<!-- purpose-doc: normalized -->
# Statuses (`statuses.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export { UserAccountStatus, USER_ACCOUNT_STATUS_KEYS } from '../enums/user-account-status.js';`
- `export { DecreeLifecycle, DECREE_LIFECYCLE_KEYS } from '../enums/decree-lifecycle.js';`
- `export {`
- `export { ExamLifecycle, EXAM_LIFECYCLE_KEYS } from '../enums/exam-lifecycle.js';`
- `export { ExamAttemptStatus, EXAM_ATTEMPT_STATUS_KEYS } from '../enums/exam-attempt-status.js';`
- `export { ExamQuestionType, EXAM_QUESTION_TYPE_KEYS } from '../enums/exam-question-type.js';`
- `export {`
- `export { CertificateStatus, CERTIFICATE_STATUS_KEYS } from '../enums/certificate-status.js';`
- `export { CertificateKind, CERTIFICATE_KIND_KEYS } from '../enums/certificate-kind.js';`
- `export { StaticPageStatus, STATIC_PAGE_STATUS_KEYS } from '../enums/static-page-status.js';`
- `export {`

Path in repo: `back-end/src/modules/shared/constants/statuses.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `statuses.js`.

## Libraries used

- **(none beyond language built-ins)** – the file only uses local control flow or relative imports not listed above.

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
