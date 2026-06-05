<!-- purpose-doc: normalized -->

---

### `dashboards.service-purpose.md`
```markdown
# Dashboards Service (`dashboards.service.js`)

## Scenario
Calculating dashboard metrics involves aggregating data from multiple collections—users, decrees, exams, inspections, certificates—and often applying role‑specific filters. Doing this directly in controllers would be repetitive and hard to test. The `DashboardsService` encapsulates all the aggregation logic, returning ready‑to‑serialize DTOs for each role. It also relies on snapshot caching (provided by `dashboard-snapshot.service.js`) but here it likely performs live computations or uses the snapshots.

## What it does
Exports a `DashboardsService` class with methods such as:
- `getSystemAdminDashboard()` – aggregates platform‑wide statistics: total users per role, decrees published, exams active, inspections completed, recent audit log counts, etc. It uses models like `UserModel`, `DecreeModel`, `ExamModel`, `InspectionSubmissionModel`, `AuditLogModel`.
- `getInspectorAdminDashboard()` – aggregates data for inspector admins: assignment counts, submission status breakdown, inspector performance, upcoming deadlines. Uses `InspectionAssignmentModel`, `InspectionSubmissionModel`, `UserModel`.
- `getInspectorDashboard(inspectorUserId)` – focuses on a single inspector: assigned tasks, completed today, overdue, pending, recent submissions. Uses `InspectionAssignmentModel`, `InspectionSubmissionModel`.
- `getDeptUploadDashboard()` – shows decree upload stats for the department, using `DecreeModel`, `DecreeBookmarkModel`, maybe `buildDecreeNumberLabel` for labelling.
- `getPublicDashboard()` – provides public metrics: latest published decrees count, popular decrees, categories list. Uses `DecreeModel`, `DecreeViewRepository`, `DecreeCategoryRepository`, etc.

The service also uses `systemAdminService` (for some shared admin logic), `notificationRepository` (maybe for unread counts), and `getLogger` for logging.

## Libraries used
- **mongoose** – implicit via all the models and repositories.
- **../../../database/models/...** – multiple models (AuditLog, Certificate, Decree, DecreeBookmark, Exam, ExamAttempt, InspectionAssignment, InspectionSubmission, User).
- **../../../database/repositories/notification.repository.js** – `notificationRepository`.
- **../../../database/repositories/decree-view.repository.js** – `decreeViewRepository`.
- **../../../database/repositories/decree-category.repository.js** – `decreeCategoryRepository`.
- **../system-admin/system-admin.service.js** – `systemAdminService` (maybe for some admin‑only aggregations).
- **../shared/enums/roles.js** – `RoleKey`.
- **../../config/logger.js** – `getLogger`.
- **../shared/enums/decree-lifecycle.js** – `DecreeLifecycle` for filtering published decrees.
- **../decree-upload/serializers/decree.serializer.js** – `buildDecreeNumberLabel` (for formatting decree numbers in the department dashboard).

## Logic implemented
1. Each method builds a pipeline or series of queries that aggregate data.
2. For example, `getInspectorDashboard(inspectorUserId)`:
   - Queries `InspectionAssignmentModel` for that `inspectorId` with statuses. Example:
     - `totalAssigned = await InspectionAssignmentModel.countDocuments({ inspectorId, deletedAt: null })`.
     - `completedToday = await InspectionSubmissionModel.countDocuments({ inspectorId, submittedAt: { $gte: startOfDay }, status: 'APPROVED' })` (or via assignment).
   - Returns an object like `{ totalAssigned, completedToday, pending, overdue }`.
3. The service may use `decreeViewRepository` for engagement metrics on the public dashboard.
4. It may also reference `DecreeLifecycle.PUBLISHED` to count published decrees.
5. All counts and aggregations are returned as a DTO that the controller can then pass to the serializer or return directly.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
