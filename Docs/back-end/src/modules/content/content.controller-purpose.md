<!-- purpose-doc: normalized -->
# Content Controller (`content.controller.js`)

## Scenario
Administrators need to manage static content pages (e.g., “About”, “Help”) and homepage banners. They perform CRUD operations through the API: list pages or banners (with pagination), get a single page by slug, create, update, or delete. The controller translates HTTP requests into calls to the business‑logic service and formats the responses with appropriate status codes and serialised data.

## What it does
Exports a `ContentController` class and a singleton `contentController`. The class has methods corresponding to endpoints, each wrapped with `asyncHandler`. For example:

- `listPages(req, res)` – extracts pagination and filter query parameters, calls `contentService.listPages(...)`, and responds with a paginated list via `sendPaginatedList`.
- `getPageBySlug(req, res)` – calls `contentService.getPageBySlug(slug, language?)`, returns the page using `sendSuccess`.
- `createPage(req, res)` – calls `contentService.createPage(req.body)`, responds with status `201 Created`.
- `updatePage(req, res)` – calls `contentService.updatePage(id, req.body)`, returns the updated page.
- `deletePage(req, res)` – soft‑deletes the page, returns `204 No Content` or a success message.
- Similar methods for banners: `listBanners`, `createBanner`, `updateBanner`, `deleteBanner`.

## Libraries used
- **../shared/http/index.js** – `asyncHandler`, `HttpStatus`, `sendPaginatedList`, `sendSuccess`.
- **./content.service.js** – `contentService` with business logic.

## Logic implemented
1. Each method receives `req` and `res`, passes relevant data to the service, and sends back the result.
2. Example – `getPageBySlug`:
   - Extracts `slug` from `req.params` and `language` from `req.query`.
   - Calls `const page = await contentService.getPageBySlug(slug, language)`.
   - Sends `sendSuccess(res, HttpStatus.OK, serializeContentPage(page))`.
3. Example – `listBanners`:
   - Extracts `page`, `pageSize` from query.
   - Calls `const { items, total } = await contentService.listBanners({ offset, limit })`.
   - Sends `sendPaginatedList(res, items, total, page, pageSize)`.
4. Errors from the service (e.g., `NotFoundError`) propagate to the global error handler via `asyncHandler`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
