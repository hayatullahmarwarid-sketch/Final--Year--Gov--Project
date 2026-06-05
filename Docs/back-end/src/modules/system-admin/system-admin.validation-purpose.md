<!-- purpose-doc: normalized -->
# System Admin Validation (`system-admin.validation.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export const listStaffQuerySchema = extendListQuery({`
- `export const listPlatformUsersQuerySchema = extendListQuery({`
- `export const listAuditLogsQuerySchema = extendListQuery({`
- `export const listAdminNotificationsQuerySchema = extendListQuery({});`
- `export const notificationIdParamsSchema = z.object({`
- `export const staffIdParamsSchema = z.object({`
- `export const createStaffBodySchema = z`
- `export const patchStaffBodySchema = z`
- `export const patchSystemAdminSettingsBodySchema = z`
- `export const systemAnnounceBodySchema = z`

Path in repo: `back-end/src/modules/system-admin/system-admin.validation.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `system-admin.validation.js`.

## Libraries used

- **zod** – third-party dependency for this module.
- **../../api/v1/auth/auth.validation.js** (`{ strongPasswordSchema }`) – relative project import.
- **../shared/query/list-query.schema.js** (`{ extendListQuery }`) – relative project import.
- **../shared/enums/user-account-status.js** (`{ USER_ACCOUNT_STATUS_KEYS }`) – relative project import.
- **../shared/enums/roles.js** (`{ ROLE_KEYS }`) – relative project import.
- **./system-admin.constants.js** (`{ STAFF_DIRECTORY_ROLE_KEY_SET }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Job or cron wiring schedules background execution or processes queued payloads.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Elevated administration APIs.
