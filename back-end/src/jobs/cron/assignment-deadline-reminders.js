import { InspectionAssignmentModel } from '../../../database/models/inspection-assignment.model.js';
import { NotificationModel } from '../../../database/models/notification.model.js';
import { RoleKey } from '../../modules/shared/enums/roles.js';
import { InspectionAssignmentStatus } from '../../modules/shared/enums/inspection-assignment-status.js';
import { getLogger } from '../../config/logger.js';

const OPEN_STATUSES = [
  InspectionAssignmentStatus.ASSIGNED,
  InspectionAssignmentStatus.IN_PROGRESS,
  InspectionAssignmentStatus.DRAFT_SAVED,
];

/**
 * Hourly: assignments due in ~24h (23.5–24.5h window) get one in-app reminder per row.
 */
export async function runAssignmentDeadlineReminderTick() {
  const log = getLogger();
  const now = Date.now();
  const windowStart = new Date(now + 23.5 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 24.5 * 60 * 60 * 1000);

  const rows = await InspectionAssignmentModel.find({
    isDeleted: { $ne: true },
    deadlineReminderSent: { $ne: true },
    dueAt: { $gt: windowStart, $lte: windowEnd },
    status: { $in: OPEN_STATUSES },
  })
    .select({ _id: 1, inspectorUserId: 1, dueAt: 1, decreeId: 1 })
    .limit(500)
    .lean();

  let sent = 0;
  for (const a of rows) {
    const due = a.dueAt ? new Date(a.dueAt).toISOString().slice(0, 10) : '';
    await NotificationModel.create({
      title: 'Inspection deadline approaching',
      body: `An assigned inspection is due soon (${due}). Please complete or sync your work.`,
      recipientUserId: a.inspectorUserId,
      recipientRoleKey: RoleKey.INSPECTOR,
      metadata: { kind: 'deadline_reminder', assignmentId: String(a._id), decreeId: String(a.decreeId) },
    });
    await InspectionAssignmentModel.updateOne(
      { _id: a._id },
      { $set: { deadlineReminderSent: true, updatedAt: new Date() } },
    );
    sent += 1;
  }

  if (sent) log.info({ sent }, 'cron.assignment_deadline_reminders');
  return { sent };
}
