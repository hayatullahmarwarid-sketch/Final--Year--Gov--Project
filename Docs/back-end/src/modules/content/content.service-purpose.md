<!-- purpose-doc: normalized -->

---

### `content.service-purpose.md`
```markdown
# Content Service (`content.service.js`)

## Scenario
The business logic for static content and banners lives here. It abstracts the repositories and serializers, ensuring that data is validated, access controls are respected (e.g., only published pages are returned for public requests), and pagination defaults are applied. Controllers rely on this service without knowing about the database or serialisation details.

## What it does
Exports `ContentService` class with methods:

- `listPages({ offset, limit, status?, language? })` – uses `staticContentPageRepository` to fetch pages, filters by `status` (e.g., `PUBLISHED` for public), applies pagination via `toOffsetLimit`, and serialises each page with `serializeContentPage`.
- `getPageBySlug(slug, language?)` – fetches a single page by slug and optional language, throws `NotFoundError` if missing or not published.
- `createPage(data)` – calls the repository to create a page with `API_VERSION` context if needed.
- `updatePage(id, data)` – updates an existing page, verifies existence first.
- `deletePage(id)` – soft‑deletes the page via the repository.
- Similar methods for banners: `listBanners`, `createBanner`, `updateBanner`, `deleteBanner`, using `homepageBannerRepository` and `serializeHomepageBanner`.

It also uses `StaticPageStatus` to enforce that only published pages are returned publicly. The service uses `API_VERSION` if API versioning affects the output format.

## Libraries used
- **mongoose** – implicit (repository operations).
- **../shared/constants/api.js** – `API_VERSION`.
- **../../../database/repositories/static-content-page.repository.js** – `staticContentPageRepository`.
- **../../../database/repositories/homepage-banner.repository.js** – `homepageBannerRepository`.
- **./serializers/content-page.serializer.js** – `serializeContentPage`.
- **./serializers/homepage-banner.serializer.js** – `serializeHomepageBanner`.
- **../shared/query/pagination.js** – `toOffsetLimit`.
- **../../core/errors/app-error.js** – `NotFoundError`.
- **../shared/enums/static-page-status.js** – `StaticPageStatus`.

## Logic implemented
1. `listPages(options)`:
   - Apply `toOffsetLimit(options.page, options.pageSize)`.
   - Build filter: `{ deletedAt: null, status: StaticPageStatus.PUBLISHED }` (if not admin) plus optional `language`.
   - Call `staticContentPageRepository.find(filter, { sort, offset, limit })`.
   - Map results through `serializeContentPage`.
   - Return `{ items, total }`.
2. `getPageBySlug(slug, language)`:
   - Filter includes `{ slug, status: StaticPageStatus.PUBLISHED }`.
   - Call `staticContentPageRepository.findOne(filter)`.
   - If `null`, throw `NotFoundError`.
   - Return `serializeContentPage(page)`.
3. `createPage(data)`: simply `staticContentPageRepository.create(data)` and serialize.
4. `updatePage(id, data)`: find by ID, throw if not found, update, serialize.
5. `deletePage(id)`: soft‑delete via repository.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
