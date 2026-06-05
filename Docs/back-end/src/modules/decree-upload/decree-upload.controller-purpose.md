<!-- purpose-doc: normalized -->
# Decree Upload Controller (`decree-upload.controller.js`)

## Scenario
Department officers perform all decree management through the API: listing decrees (with pagination and filters), creating new decrees, updating metadata, publishing, archiving, managing categories, and viewing department settings. The controller acts as the HTTP‑aware layer that delegates to the `DecreeUploadService` and consistently formats responses.

## What it does
Exports a `DecreeUploadController` class and a singleton `decreeUploadController`. Methods likely include:

- **Decree CRUD**: `listDecrees`, `getDecree`, `createDecree`, `updateDecree`, `publishDecree`, `archiveDecree`, `supersedeDecree`.
- **Category CRUD**: `listCategories`, `createCategory`, `updateCategory`, `deleteCategory`.
- **Amendment workflows**: `createAmendment`, `abandonAmendmentDraft`.
- **Version history**: `listVersions`, `getVersion`.
- **Department settings**: `getSettings`, `updateSettings`.
- **Dashboard**: may use `dashboardsService` to get department dashboard data.

Each method:
1. Extracts validated parameters and body from the request.
2. Calls the corresponding `decreeUploadService` method.
3. On success, formats the response with `sendSuccess` or `sendPaginatedList`.
4. For write operations, may also call `auditService.log(...)` using the request context obtained via `getRequestContext(req)`.

## Libraries used
- **../shared/http/index.js** – `asyncHandler`, `HttpStatus`, `sendPaginatedList`, `sendSuccess`.
- **../../middlewares/request-context.middleware.js** – `getRequestContext` for audit logging.
- **../../services/audit/auditService.js** – `auditService` for logging actions.
- **../dashboards/dashboards.service.js** – `dashboardsService` (maybe for department dashboard).
- **./decree-upload.service.js** – `decreeUploadService` with the business logic.

## Logic implemented
1. Example – `createDecree(req, res)`:
   - Extracts body data (title, body, categoryId, etc.).
   - Calls `const decree = await decreeUploadService.createDecree(req.body, req.user)`.
   - Audits the action.
   - Sends `sendSuccess(res, HttpStatus.CREATED, serializeDecree(decree))`.
2. Example – `getSettings(req, res)`:
   - Calls `const settings = await decreeUploadService.getSettings(req.user.tenantId)`.
   - Sends `sendSuccess(res, HttpStatus.OK, serializeDeptUploadSettings(settings))`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Decree upload department APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
