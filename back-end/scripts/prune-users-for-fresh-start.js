/**
 * Removes user accounts and their personal/app data.
 *
 * Default: keeps users whose `roleKey` is one of
 *   system_admin | inspector_admin | decree_upload_department
 * and deletes everyone else (public_user, inspector, etc.) plus cascaded rows.
 *
 * Full wipe (including staff): pass `--all-users`, then recreate operator accounts manually (no bundled seed).
 *
 * Run from `back-end/` with `MONGODB_URI` in `back-end/.env`:
 *   npm run db:prune-users
 *   npm run db:prune-users -- --all-users
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '../database/connection/mongoose.js';
import { UserModel } from '../database/models/user.model.js';
import { DecreeBookmarkModel } from '../database/models/decree-bookmark.model.js';
import { ExamAttemptModel } from '../database/models/exam-attempt.model.js';
import { CertificateModel } from '../database/models/certificate.model.js';
import { NotificationUserStateModel } from '../database/models/notification-user-state.model.js';
import { NotificationModel } from '../database/models/notification.model.js';
import { InspectionAssignmentModel } from '../database/models/inspection-assignment.model.js';
import { InspectionSubmissionModel } from '../database/models/inspection-submission.model.js';
import { InspectionEvidenceFileModel } from '../database/models/inspection-evidence-file.model.js';
import { RefreshTokenModel } from '../database/models/refresh-token.model.js';
import { RoleKey } from '../src/modules/shared/enums/roles.js';

const STAFF_ROLE_KEYS = [
  RoleKey.SYSTEM_ADMIN,
  RoleKey.INSPECTOR_ADMIN,
  RoleKey.DECREE_UPLOAD_DEPARTMENT,
];

const nukeAll = process.argv.includes('--all-users');

/**
 * @param {mongoose.Types.ObjectId[]} ids
 */
async function cascadeDeleteForUserIds(ids) {
  if (ids.length === 0) return { usersDeleted: 0 };

  const idSet = ids.map((id) => id.toString());

  const submissions = await InspectionSubmissionModel.find({
    submittedByUserId: { $in: ids },
  })
    .select('_id')
    .lean();
  const submissionIds = submissions.map((s) => s._id);

  const evBySubmission =
    submissionIds.length > 0
      ? await InspectionEvidenceFileModel.deleteMany({ submissionId: { $in: submissionIds } })
      : { deletedCount: 0 };
  const evByCreator = await InspectionEvidenceFileModel.deleteMany({ createdByUserId: { $in: ids } });
  const subs = await InspectionSubmissionModel.deleteMany({ submittedByUserId: { $in: ids } });
  const assigns = await InspectionAssignmentModel.deleteMany({ inspectorUserId: { $in: ids } });

  const rt = await RefreshTokenModel.deleteMany({ userId: { $in: ids } });
  const bm = await DecreeBookmarkModel.deleteMany({ ownerUserId: { $in: ids } });
  const attempts = await ExamAttemptModel.deleteMany({ examineeUserId: { $in: ids } });
  const certs = await CertificateModel.deleteMany({ holderUserId: { $in: ids } });
  const nus = await NotificationUserStateModel.deleteMany({ userId: { $in: ids } });
  const notif = await NotificationModel.deleteMany({ recipientUserId: { $in: ids } });

  const userRes = await UserModel.deleteMany({ _id: { $in: ids } });

  return {
    userIds: idSet.length,
    usersDeleted: userRes.deletedCount ?? 0,
    refreshTokens: rt.deletedCount ?? 0,
    decreeBookmarks: bm.deletedCount ?? 0,
    examAttempts: attempts.deletedCount ?? 0,
    certificates: certs.deletedCount ?? 0,
    notificationUserStates: nus.deletedCount ?? 0,
    notificationsInbox: notif.deletedCount ?? 0,
    inspectionAssignments: assigns.deletedCount ?? 0,
    inspectionSubmissions: subs.deletedCount ?? 0,
    inspectionEvidenceBySubmission: evBySubmission.deletedCount ?? 0,
    inspectionEvidenceByCreator: evByCreator.deletedCount ?? 0,
  };
}

async function main() {
  await connectMongo();

  /** @type {mongoose.Types.ObjectId[]} */
  let idsToDelete;

  if (nukeAll) {
    const all = await UserModel.find({}).select('_id').lean();
    idsToDelete = all.map((u) => u._id);
    console.log(`Mode: --all-users (deleting ALL ${idsToDelete.length} user account(s) + cascades).`);
  } else {
    const victims = await UserModel.find({
      roleKey: { $nin: STAFF_ROLE_KEYS },
    })
      .select('_id roleKey email displayName')
      .lean();
    idsToDelete = victims.map((u) => u._id);
    console.log(
      `Mode: keep staff roles only (${STAFF_ROLE_KEYS.join(', ')}). ` +
        `Deleting ${idsToDelete.length} other account(s).`,
    );
    for (const u of victims.slice(0, 20)) {
      console.log(`  - ${String(u._id)} ${u.roleKey} ${u.email ?? ''} ${u.displayName ?? ''}`);
    }
    if (victims.length > 20) console.log(`  ... and ${victims.length - 20} more`);
  }

  const summary = await cascadeDeleteForUserIds(idsToDelete);
  console.log('Done:', summary);

  if (nukeAll || summary.usersDeleted > 0) {
    console.log('If you removed staff, recreate accounts via your admin / provisioning process.');
  }

  await disconnectMongo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
