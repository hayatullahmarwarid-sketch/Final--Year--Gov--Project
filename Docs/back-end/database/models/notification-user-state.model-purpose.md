<!-- purpose-doc: normalized -->
# Notification User State Model (`notification-user-state.model.js`)

## Scenario
To provide a unified notification inbox across devices, the system needs to track per‑user counts (total unread) and settings (do not disturb). This model stores that state without needing to aggregate the entire notification history each time.

## What it does
Schema with `userId`, `unreadCount`, `lastReadAt`, `preferences` (maybe embedded). No plugin imports detected but likely plain schema. Exported as `NotificationUserStateModel`.

## Libraries used
- **mongoose**.

## Logic implemented
1. Fields:
   - `userId`: ObjectId, ref: `'User'`, unique.
   - `unreadCount`: Number, default 0.
   - `lastReadAt`: Date.
2. Index: `userId` unique.
3. Simple incrementation logic for unread count.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
