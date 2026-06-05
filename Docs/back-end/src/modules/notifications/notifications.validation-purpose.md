<!-- purpose-doc: normalized -->
# Notifications Validation (`notifications.validation.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file exports the following surface (representative `export` lines):

- `export const listNotificationsQuerySchema = extendListQuery({`
- `export const createNotificationBodySchema = z.object({`
- `export const notificationIdParamSchema = z.object({`

Path in repo: `back-end/src/modules/notifications/notifications.validation.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `notifications.validation.js`.

## Libraries used

- **zod** – third-party dependency for this module.
- **../shared/enums/roles.js** (`{ ROLE_KEYS }`) – relative project import.
- **../shared/enums/notification-channel.js** (`{ NOTIFICATION_CHANNELS }`) – relative project import.
- **../shared/query/list-query.schema.js** (`{ extendListQuery }`) – relative project import.
- **../shared/validation/zod-helpers.js** (`{ objectIdString }`) – relative project import.

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
