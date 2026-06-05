<!-- purpose-doc: normalized -->

---

### `decree-upload.service-purpose.md`
```markdown
# Decree Upload Service (`decree-upload.service.js`)

## Scenario
All business logic for creating, updating, publishing, and archiving decrees, as well as managing decree categories and department settings, lives in this service. It coordinates multiple repositories, enforces business rules (e.g., only published decrees are visible publicly, correctness of status transitions), computes metadata completeness, handles versioning, and triggers notifications on publication.

## What it does
Exports a standalone function and a class:

- **`computeMetadataCompleteness(decree, version)`** – uses `DECREE_COMPLETENESS_ROOT_KEYS` and `DECREE_COMPLETENESS_VERSION_KEYS` to calculate a percentage of filled‑in required fields.
- **`DecreeUploadService`** class with methods such as:
  - `listDecrees(filters, pagination)` – queries `decreeRepository` with lifecycle filters (e.g., all for admin, published for public), applies `toOffsetLimit`, serializes with `serializeDecree`.
  - `getDecree(id)` – fetches decree (optionally with versions), serializes.
  - `createDecree(data, user)` – validates category exists via `decreeCategoryRepository`, creates decree with lifecycle `DRAFT`, possibly creates initial version, returns serialized decree.
  - `updateDecree(id, data)` – validates state (not archived), updates, and optionally creates a new version via `withMongoTransaction` to ensure atomicity.
  - `publishDecree(id, user)` – changes lifecycle to `PUBLISHED`, creates/updates a version publication status, and calls `notificationsService.notifyRole(RoleKey.PUBLIC, ...)` to fan out a notification.
  - `archiveDecree(id)`, `supersedeDecree(id, replacementId)` – change lifecycle accordingly.
  - `createAmendment(decreeId, data)` – creates a new draft version for an existing decree.
  - `listCategories`, `createCategory`, `updateCategory`, `deleteCategory` – thin wrappers around `decreeCategoryRepository`.
  - `getSettings(tenantId)`, `updateSettings(tenantId, data)` – uses `deptUploadSettingsRepository` and `serializeDeptUploadSettings`.
  - All methods handle `NotFoundError`, `ConflictError`, `BadRequestError` appropriately and log via `getLogger`.

## Libraries used
- **mongoose** – implicit (for transactions and model operations).
- **../../config/logger.js** – `getLogger`.
- **../../core/database/mongo-session.js** – `withMongoTransaction` for atomic operations.
- **../shared/constants/api.js** – `API_VERSION`.
- **../shared/enums/decree-lifecycle.js** – `DecreeLifecycle`.
- **../shared/http/index.js** – `BadRequestError`, `ConflictError`, `NotFoundError` (re‑exported from app-error).
- **../shared/query/pagination.js** – `toOffsetLimit`.
- **../../../database/repositories/decree-category.repository.js** – `decreeCategoryRepository`.
- **../../../database/repositories/decree.repository.js** – `decreeRepository`.
- **../../../database/repositories/decree-version.repository.js** – `decreeVersionRepository`.
- **../../../database/repositories/user.repository.js** – `userRepository`.
- **../../../database/repositories/dept-upload-settings.repository.js** – `deptUploadSettingsRepository`.
- **./decree-upload.constants.js** – completeness constants.
- **./serializers/*.js** – decree, category, version, settings serializers.
- **../shared/enums/roles.js** – `RoleKey`.
- **../notifications/notifications.service.js** – `notificationsService`.

## Logic implemented
1. `computeMetadataCompleteness(decree, version)`:
   - Counts how many keys from `DECREE_COMPLETENESS_ROOT_KEYS` are present and non‑empty in `decree`.
   - Counts how many keys from `DECREE_COMPLETENESS_VERSION_KEYS` are present in `version`.
   - Returns a percentage.
2. `publishDecree(id, user)`:
   - Uses `withMongoTransaction` to atomically:
     - Fetch decree, verify it’s in draft/reviewed state (else throw `ConflictError`).
     - Set `decree.lifecycle = DecreeLifecycle.PUBLISHED`, `decree.publishedAt = new Date()`.
     - Find the current draft version and set its `publication` to `PUBLISHED`.
   - Outside transaction, calls `notificationsService.notifyRole(RoleKey.PUBLIC, { title, body, data: { decreeId: id } })`.
3. `createDecree`:
   - Validates category existence; if not found, throws `NotFoundError`.
   - Calls `decreeRepository.create({ ...data, lifecycle: DecreeLifecycle.DRAFT, createdBy: user._id })`.
   - Also creates initial version via `decreeVersionRepository.create`. Both wrapped in transaction.
4. `updateSettings(tenantId, data)`:
   - Iterates over data entries, upserts each key/value pair.
   - Returns the full settings object after update.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Decree upload department APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
