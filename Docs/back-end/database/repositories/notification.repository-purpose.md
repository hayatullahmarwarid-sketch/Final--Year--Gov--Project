<!-- purpose-doc: normalized -->
# Notification Repository (`notification.repository.js`)

## Scenario
Push notifications are created for users or roles. The inbox screen lists notifications for a user, marks them as read, and counts unread. The repository also supports role‑targeted notifications.

## What it does
Extends `BaseRepository` (note: only one export, no singleton instance exported in some files; but likely singleton exists). Uses `NotificationModel` and `NotificationUserStateModel`. Also uses `mergeFilters` and `RoleKey`. Likely methods:
- `createNotification({ recipientId, roles, title, body, data, channel })` – creates a notification.
- `findByUser(userId, { readStatus, pagination })` – notifications for a user (including role‑targeted ones, combined).
- `markAsRead(notificationId, userId)` – updates `NotificationUserState` and maybe the notification itself.
- `unreadCount(userId)` – uses `NotificationUserStateModel`.

## Libraries used
- **mongoose**.
- `../models/notification.model.js`.
- `../models/notification-user-state.model.js`.
- `./base.repository.js`.
- `./repository.helpers.js`.
- `../../src/modules/shared/enums/roles.js`.

## Logic implemented
1. `findByUser`: queries notifications where `recipientId = userId` OR `roles` includes user’s role, using `$or`. Combines with `readStatus` filter.
2. `markAsRead`: updates the notification, and decrements unread count in user state.
3. `unreadCount`: fetches from `NotificationUserStateModel.findOne({ userId })`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
