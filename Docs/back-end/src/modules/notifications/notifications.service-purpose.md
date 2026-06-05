<!-- purpose-doc: normalized -->
# Notifications Service (`notifications.service.js`)

## Scenario

Business rules for this domain execute when controllers, jobs, or other services call into this service layer.

## What it does

The file exports the following surface (representative `export` lines):

- `export class NotificationsService {`
- `export const notificationsService = new NotificationsService();`

Path in repo: `back-end/src/modules/notifications/notifications.service.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `notifications.service.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **../../../database/repositories/notification.repository.js** (`{ notificationRepository }`) – relative project import.
- **../../../database/repositories/notification-user-state.repository.js** (`{ notificationUserStateRepository }`) – relative project import.
- **../../../database/models/user.model.js** (`{ UserModel }`) – relative project import.
- **./notification.serializer.js** (`{ serializeInboxNotification, serializeNotification }`) – relative project import.
- **../shared/query/pagination.js** (`{ toOffsetLimit }`) – relative project import.
- **../../core/errors/app-error.js** (`{ NotFoundError, UnauthorizedError }`) – relative project import.
- **../../jobs/queue-registry.js** (`{ enqueue }`) – relative project import.
- **../../jobs/queue-names.js** (`{ QUEUE }`) – relative project import.
- **../../config/logger.js** (`{ getLogger }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
4. Job or cron wiring schedules background execution or processes queued payloads.
5. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
6. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
