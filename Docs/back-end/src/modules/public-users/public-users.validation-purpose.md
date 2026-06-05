<!-- purpose-doc: normalized -->
# Public Users Validation (`public-users.validation.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export const idParamSchema = z.object({ id: objectIdString });`
- `export const publicDecreePdfQuerySchema = z.object({`
- `export const listPublicDecreesQuerySchema = extendListQuery({`
- `export const listPublicDecreeCategoriesQuerySchema = extendListQuery({});`
- `export const listPublicBookmarksQuerySchema = extendListQuery({});`
- `export const listPublicNotificationsQuerySchema = extendListQuery({});`
- `export const listPublicExamsQuerySchema = extendListQuery({`
- `export const listPublicCertificatesQuerySchema = extendListQuery({`
- `export const listPublicResultsQuerySchema = extendListQuery({});`
- `export const createBookmarkBodySchema = z`
- `export const createExamAttemptBodySchema = z`
- `export const submitExamAttemptBodySchema = z`
- `export const patchExamAttemptBodySchema = z`
- `export const publicHomeQuerySchema = z.object({`

Path in repo: `back-end/src/modules/public-users/public-users.validation.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `public-users.validation.js`.

## Libraries used

- **zod** – third-party dependency for this module.
- **../shared/query/list-query.schema.js** (`{ extendListQuery }`) – relative project import.
- **../shared/validation/zod-helpers.js** (`{ objectIdString }`) – relative project import.
- **../shared/enums/decree-lifecycle.js** (`{ DECREE_LIFECYCLE_KEYS }`) – relative project import.
- **../shared/enums/exam-lifecycle.js** (`{ EXAM_LIFECYCLE_KEYS }`) – relative project import.
- **../shared/enums/certificate-status.js** (`{ CERTIFICATE_STATUS_KEYS }`) – relative project import.
- **../shared/enums/certificate-kind.js** (`{ CERTIFICATE_KIND_KEYS }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Direct: Public HTTP surface for end users.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
