<!-- purpose-doc: normalized -->
# Notification User State Repository (`notification-user-state.repository.js`)

## Scenario
To track total unread notifications per user efficiently, a separate state document is maintained. This repository manages that document’s creation and updates.

## What it does
A simple repository (does not extend `BaseRepository` but uses `NotificationUserStateModel` directly). Exports singleton `notificationUserStateRepository`. Likely methods:
- `getOrCreate(userId)` – finds the user’s state document or creates with `unreadCount: 0`.
- `incrementUnread(userId, count = 1)` – increments `unreadCount`.
- `resetUnread(userId)` – sets `unreadCount` to 0.
- `decrementUnread(userId, count)` – decrements (e.g., when a notification is marked read).

## Libraries used
- **mongoose**.
- `../models/notification-user-state.model.js`.

## Logic implemented
1. `getOrCreate`: `findOneAndUpdate({ userId }, { $setOnInsert: { userId, unreadCount: 0 } }, { upsert: true, new: true })`.
2. Increment/decrement using `$inc`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
