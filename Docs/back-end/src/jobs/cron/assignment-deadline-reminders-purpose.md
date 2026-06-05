<!-- purpose-doc: normalized -->
# Assignment Deadline Reminder Job (`assignment-deadline-reminders.js`)

## Scenario
Field inspectors have inspection assignments with deadlines. If a deadline is approaching and the assignment is still in progress, the system should automatically send a push notification to remind the inspector to complete the work. This must happen even when no administrator is manually triggering it. A scheduled background job (cron tick) regularly scans the `inspection_assignments` collection, finds assignments whose deadline is within a configurable window (e.g., the next 24 hours) and which are still in an active status, and creates notifications for the responsible inspectors.

## What it does
Exports an async function `runAssignmentDeadlineReminderTick()`, intended to be called by a scheduler (e.g., `node-cron`, a job queue, or a simple `setInterval`). The function:

1. Queries `InspectionAssignmentModel` for documents that are **not** soft‑deleted, have a status equal to `InspectionAssignmentStatus.IN_PROGRESS` (or another active status), and whose `deadline` is less than or equal to a future date (e.g., `now + reminderWindowHours`).
2. For each such assignment, it checks whether a reminder notification has already been sent recently (to avoid spamming). This could be done by looking for a notification with a specific tag or by storing a `lastReminderSentAt` field on the assignment (though the code shown here uses the model directly, so it likely either updates the assignment or just checks against existing `NotificationModel` records).
3. Creates a `NotificationModel` document for each assignment that needs a reminder, with:
   - `recipientId` set to the `inspectorId` on the assignment.
   - `title` and `body` containing the assignment name and deadline.
   - `data` containing a deep‑link route to the assignment (e.g., `/inspector/tasks/[id]`).
   - A tag or category to identify the notification as a deadline reminder.
4. Logs the number of reminders sent and any errors encountered.

## Libraries used
- **../../../database/models/inspection-assignment.model.js** – `InspectionAssignmentModel` to query assignments.
- **../../../database/models/notification.model.js** – `NotificationModel` to insert reminder notifications.
- **../../modules/shared/enums/roles.js** – `RoleKey` (maybe used if notifications are role‑targeted in addition to the specific user, or to include inspectors generally).
- **../../modules/shared/enums/inspection-assignment-status.js** – `InspectionAssignmentStatus` to filter for active assignments.
- **../../config/logger.js** – `getLogger` for logging.

## Logic implemented
1. The function reads a reminder window from configuration (could be environment variable or hard‑coded, e.g., 24 hours). It computes `reminderThreshold = new Date(Date.now() + windowMs)`.
2. It queries `InspectionAssignmentModel`:
   ```js
   const assignments = await InspectionAssignmentModel.find({
     status: InspectionAssignmentStatus.IN_PROGRESS,
     deadline: { $lte: reminderThreshold },
     deletedAt: null,
   }).populate('inspectorId templateId');

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
