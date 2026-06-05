<!-- purpose-doc: normalized -->
# Files Routes (`files.routes.js`)

## Scenario
The API needs routes to list files, get file metadata, and possibly upload files. This file sets up those endpoints, applying validation middleware to ensure query and body parameters are correct. Authentication and authorization may be applied at a higher router level or inline; this file shows only validation and controller binding.

## What it does
Creates an Express `Router` with endpoints for stored files:

- **`GET /`** – list stored files. Validates the query with `listStoredFilesQuerySchema` and calls `filesController.listFiles`.
- **`GET /:fileId`** – get a single stored file’s metadata. Validates params with `storedFileIdParamsSchema` and calls `filesController.getFile`.
- **`POST /`** – (if file metadata can be created manually) validates body with `createStoredFileBodySchema` and calls `filesController.createFile`.
- **`PATCH /:fileId`** – (if metadata updatable) calls `filesController.updateFile`.
- **`DELETE /:fileId`** – (if soft‑delete supported) calls `filesController.deleteFile`.

The router is exported as `filesRouter` and mounted under e.g., `/api/v1/files` in the main application.

## Libraries used
- **express** – Router.
- **../shared/http/index.js** – `validateRequest` middleware.
- **./files.controller.js** – `filesController` instance.

## Logic implemented
1. Create router.
2. Define routes:
   ```js
   filesRouter.get('/', validateRequest({ query: listStoredFilesQuerySchema }), filesController.listFiles);
   filesRouter.get('/:fileId', validateRequest({ params: storedFileIdParamsSchema }), filesController.getFile);
   filesRouter.post('/', validateRequest({ body: createStoredFileBodySchema }), filesController.createFile);
   // etc.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
