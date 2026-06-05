<!-- purpose-doc: normalized -->
# Content Routes (`content.routes.js`)

## Scenario
The API exposes endpoints under `/api/v1/content/` for content pages and banners. This file defines all the paths, applies validation middleware where needed, and binds the controller methods.

## What it does
Creates an Express `Router` and defines CRUD routes for two resources: content pages and homepage banners.

- **Content pages:**
  - `GET /pages` – list pages (public, maybe admin only). Uses `validateRequest` for pagination query schema.
  - `GET /pages/:slug` – get a page by slug (and optional `language` query).
  - `POST /pages` – create a page (admin only). Validates body with `createContentPageBodySchema`.
  - `PATCH /pages/:id` – update a page (admin only). Validates body and params.
  - `DELETE /pages/:id` – soft‑delete a page (admin only).

- **Homepage banners:**
  - `GET /banners` – list banners.
  - `POST /banners` – create a banner. Validates body.
  - `PATCH /banners/:id` – update a banner.
  - `DELETE /banners/:id` – soft‑delete a banner.

Authentication and authorization middleware (`authenticate`, `authorize`) may be applied at a higher level or directly on certain routes (not shown in imports, but can be mounted with prefixing or inline).

## Libraries used
- **express** – Router.
- **../shared/http/index.js** – `validateRequest` middleware.
- **./content.controller.js** – `contentController` instance.

## Logic implemented
1. The `contentRouter` is created.
2. For each route, the method, path, middleware chain, and controller method are specified, e.g.:
   ```js
   contentRouter.get('/pages', validateRequest(listContentPagesQuerySchema), contentController.listPages);
   contentRouter.post('/pages', authenticate, authorize(['admin']), validateRequest(createContentPageBodySchema), contentController.createPage);

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
