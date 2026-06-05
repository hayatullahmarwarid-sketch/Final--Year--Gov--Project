# Notifications generation and delivery

## Creation API

`NotificationsService.create` persists a notification document (`title`, `body`, `channel`, optional `recipientRoleKey`, optional `recipientUserId`, `metadata`).

For **`channel`** values **`in_app`** or **`push`**, it asynchronously **`#enqueueFanout`** to queue `QUEUE.NOTIFICATIONS_FANOUT` with recipient resolution:

- **`recipientUserId` set:** fan-out list is that single user.
- **`recipientRoleKey` broadcast:** loads up to **50 000** active users (`status: 'active'`, `deactivatedAt: null`, `roleKey` match) and passes all ids to the job.

Other channels skip push fan-out (“email is handled elsewhere” in comment).

Source: `back-end/src/modules/notifications/notifications.service.js`.

## In-app inbox vs directory listing

`list`:

- `view=directory` → staff directory listing (`recipientRoleKey` filters, etc.).
- Default → **public inbox** path: loads dismiss ids, excludes dismissed broadcasts, merges read/dismiss **per-user state** (`notificationUserStateRepository`).

## Scheduled: inspection deadline reminders

**Cron:** `runAssignmentDeadlineReminderTick` (`back-end/src/jobs/cron/assignment-deadline-reminders.js`), intended to run hourly from the worker (`worker.js` imports it).

Rules:

1. Select assignments where `dueAt` falls in **`(now + 23.5h, now + 24.5h]`** (approx. **24 hours** before due).
2. Status must be one of **assigned**, **in_progress**, **draft_saved**.
3. `deadlineReminderSent` must **not** already be true.
4. **Cap:** 500 assignments per tick.
5. For each: `NotificationModel.create` with **direct** `recipientUserId = inspectorUserId`, role `INSPECTOR`, `metadata.kind = 'deadline_reminder'`, then set **`deadlineReminderSent: true`** on the assignment (**one reminder per assignment row**).

## Other `NotificationModel.create` call sites

The codebase also creates notifications from domain modules (e.g. `public-users.service.js`, `inspector-admin.service.js`). Those paths encode **event-specific** titles/bodies/metadata; trace each call site for exact triggers.

**Needs verification:** enumerate every `NotificationModel.create` occurrence for a complete matrix (grep across `back-end/`).

## Read / dismiss semantics

- **Direct notifications** (`recipientUserId`): ownership enforced on mark read.
- **Broadcasts** (`recipientRoleKey` without specific user): read/dismiss stored per user in **`notification_user_state`** (methods `upsertRead`, `upsertDismiss`, bulk read).
