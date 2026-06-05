<!-- purpose-doc: normalized -->
# Notification Model (`notification.model.js`)

## Scenario
The system sends push notifications to users for various events—new decree published, exam result ready, inspection assigned, reminder. This model stores the notification payload: who it’s for, the message, the target route, read status, and delivery channel.

## What it does
Schema with `recipientId`, `title`, `body`, `data` (JSON for navigation), `channel` (enum `NOTIFICATION_CHANNELS`), `readStatus` (enum `NOTIFICATION_READ_STATUS_KEYS`), `roles` (for role‑targeted notifications), `createdAt`. Applies `standardDomainPlugin`. Exported as `NotificationModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/roles.js**.
- **../../src/modules/shared/enums/notification-channel.js**.
- **../../src/modules/shared/enums/notification-read-status.js**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `recipientId`: ObjectId, ref: `'User'` (optional if role‑targeted).
   - `title`: String.
   - `body`: String.
   - `data`: Mixed – e.g., `{ target: '/decree/123' }`.
   - `channel`: enum – push, email, in‑app.
   - `readStatus`: enum – unread, read.
   - `roles`: [String] from roles enum.
   - `createdAt`: Date.
2. Indexes: `recipientId + readStatus`, `roles`, `createdAt`.
3. Plugin adds tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
