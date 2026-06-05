<!-- purpose-doc: normalized -->
# System Admin Service (`system-admin.service.js`)

## Scenario

Business rules for this domain execute when controllers, jobs, or other services call into this service layer.

## What it does

The file exports the following surface (representative `export` lines):

- `export class SystemAdminService {`
- `export const systemAdminService = new SystemAdminService();`

Path in repo: `back-end/src/modules/system-admin/system-admin.service.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `system-admin.service.js`.

## Libraries used

- **mongoose** – third-party dependency for this module.
- **node:fs** – third-party dependency for this module.
- **node:path** – third-party dependency for this module.
- **../../../database/models/user.model.js** (`{ UserModel }`) – relative project import.
- **../../../database/models/notification.model.js** (`{ NotificationModel }`) – relative project import.
- **../../../database/repositories/user.repository.js** (`{ userRepository }`) – relative project import.
- **../../../database/repositories/audit-log.repository.js** (`{ auditLogRepository }`) – relative project import.
- **../../../database/repositories/decree.repository.js** (`{ decreeRepository }`) – relative project import.
- **../../../database/repositories/system-platform-settings.repository.js** (`{ systemPlatformSettingsRepository }`) – relative project import.
- **../../../database/repositories/role.repository.js** (`{ roleRepository }`) – relative project import.
- **../../../database/repositories/notification.repository.js** (`{ notificationRepository }`) – relative project import.
- **../../../database/repositories/notification-user-state.repository.js** (`{ notificationUserStateRepository }`) – relative project import.
- **../shared/query/pagination.js** (`{ toOffsetLimit }`) – relative project import.
- **../../lib/auth.js** (`{ hashPassword }`) – relative project import.
- **../shared/http/index.js** (`{ NotFoundError, BadRequestError }`) – relative project import.
- **../notifications/notification.serializer.js** (`{ serializeInboxNotification }`) – relative project import.
- **../shared/enums/roles.js** (`{ RoleKey, ROLE_KEYS }`) – relative project import.
- **./system-admin.constants.js** (`{ STAFF_DIRECTORY_ROLE_KEYS, STAFF_DIRECTORY_ROLE_KEY_SET }`) – relative project import.
- **./serializers/staff.serializer.js** (`{ serializeStaffMember }`) – relative project import.
- **./serializers/audit-log.serializer.js** (`{ serializeAuditLog }`) – relative project import.
- **./serializers/platform-settings.serializer.js** (`{ serializePlatformSettings }`) – relative project import.
- **../../config/env.js** (`{ getEnv }`) – relative project import.
- **../../services/audit/auditService.js** (`{ auditService }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: No direct use; admin-only routes.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Direct: Elevated administration APIs.
