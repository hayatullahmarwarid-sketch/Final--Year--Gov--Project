<!-- purpose-doc: normalized -->
# User Data Pruning Script (`prune-users-for-fresh-start.js`)

## Scenario
After initial load testing, a staging refresh, or before a major release, administrators may need to wipe personal user data while keeping administrative staff accounts intact. This script selectively removes user accounts and all associated data, with the option to perform a full wipe including staff. It is a one‑shot maintenance tool, not part of the regular migration flow. The script must cascade deletions across all related collections (bookmarks, exam attempts, certificates, notifications, inspection assignments, refresh tokens, etc.) to avoid orphaned records.

## What it does
The script connects to MongoDB, then reads a command‑line argument (`--all-users`) to decide the scope of deletion. By default, it preserves users whose `roleKey` is one of: `system_admin`, `inspector_admin`, `decree_upload_department`. All other users (public, inspectors, etc.) are deleted, along with their data in dependent collections. If `--all-users` is passed, no users are preserved—every account is removed.

The script imports not only `UserModel` but also:
- `DecreeBookmarkModel`
- `ExamAttemptModel`
- `CertificateModel`
- `NotificationUserStateModel`
- `NotificationModel`
- `InspectionAssignmentModel`
- `InspectionSubmissionModel`
- `InspectionEvidenceFileModel`
- `RefreshTokenModel`

For each deleted user, it removes related records in these collections (either by user ID or by referenced assignment/submission). After the deletions, it disconnects from MongoDB and exits.

## Libraries used
- **dotenv** – loads `.env` for `MONGODB_URI`.
- **mongoose** – connects to DB, executes deletions.
- **../database/connection/mongoose.js** – `connectMongo`, `disconnectMongo` (likely used instead of raw `mongoose.connect`).
- **../database/models/user.model.js** – to find and remove users.
- **../database/models/decree-bookmark.model.js**, **exam-attempt.model.js**, **certificate.model.js**, **notification-user-state.model.js**, **notification.model.js**, **inspection-assignment.model.js**, **inspection-submission.model.js**, **inspection-evidence-file.model.js**, **refresh-token.model.js** – to delete associated records.
- **../src/modules/shared/enums/roles.js** – `RoleKey` enum to know which roles are considered “staff”.

## Logic implemented
1. Load environment variables (`dotenv`).
2. Connect to MongoDB using either `connectMongo()` or `mongoose.connect(process.env.MONGODB_URI)`.
3. Determine scope:
   - If `--all-users` flag is present, the filter for users to delete is `{}` (all users).
   - Otherwise, build a filter that excludes the protected roles: `{ roleKey: { $nin: ['system_admin', 'inspector_admin', 'decree_upload_department'] } }`.
4. Find all user IDs that match the deletion filter using `UserModel.find(filter, { _id: 1 })`.
5. For each user (or using bulk deletion with those IDs):
   - Delete from dependent collections where the user ID appears. Examples:
     - `DecreeBookmarkModel.deleteMany({ userId: { $in: userIds } })`
     - `ExamAttemptModel.deleteMany({ userId: { $in: userIds } })`
     - `CertificateModel.deleteMany({ userId: { $in: userIds } })`
     - `NotificationUserStateModel.deleteMany({ userId: { $in: userIds } })`
     - `NotificationModel.deleteMany({ recipientId: { $in: userIds } })` (or where user is the owner)
     - For inspections: find assignments for the user, then delete submissions and evidence linked to those assignments.
     - `RefreshTokenModel.deleteMany({ userId: { $in: userIds } })`
   - Finally, delete the users themselves: `UserModel.deleteMany({ _id: { $in: userIds } })`.
6. Log the number of deleted users and the number of related records removed.
7. Disconnect from MongoDB (`disconnectMongo()`).
8. Exit with code 0 on success, or 1 on error.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
