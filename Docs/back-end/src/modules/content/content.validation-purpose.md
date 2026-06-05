<!-- purpose-doc: normalized -->
# Content Validation Schemas (`content.validation.js`)

## Scenario
Every create, update, and list request for content pages and banners must carry exactly the expected fields—no more, no less—with correct types (e.g., slugs must be strings, status must be an allowed value, IDs must be valid ObjectIds). These Zod schemas enforce those constraints, providing early, detailed error messages when a client sends malformed data.

## What it does
Exports multiple Zod schemas:

- **`listContentPagesQuerySchema`** – extends a base list‑query schema (`extendListQuery`) to allow filtering by `status`, `language`, and maybe `search` text.
- **`createContentPageBodySchema`** – validates the body for creating a page: `slug` (required string), `title` (required string), `body` (string), `language` (optional string), `status` (optional, from `STATIC_PAGE_STATUS_KEYS`).
- **`patchContentPageBodySchema`** – all fields optional, but must conform to types if present.
- **`contentPageIdParamSchema`** – validates `params` containing `id` as a valid ObjectId string (using `objectIdString` helper).
- **`getContentPageByIdQuerySchema`** – may include optional `language` query parameter.
- **`listHomepageBannersQuerySchema`** – similar pagination schema with optional `active` filter.
- **`createHomepageBannerBodySchema`** – requires `title`, `imageUrl`, `link` (optional), `order` (number), `active` (boolean, default true).
- **`patchHomepageBannerBodySchema`** – partial update for banners.
- **`homepageBannerIdParamSchema`** – validates `id` param as ObjectId.

All schemas use `zod` and shared helpers like `objectIdString` and `extendListQuery`.

## Libraries used
- **zod** – schema definition.
- **../shared/query/list-query.schema.js** – `extendListQuery` base schema (page, pageSize, sort).
- **../shared/validation/zod-helpers.js** – `objectIdString` helper for valid ObjectId regex.
- **../shared/enums/static-page-status.js** – `STATIC_PAGE_STATUS_KEYS` for status enum.

## Logic implemented
1. `extendListQuery` returns a base object with `page`, `pageSize`, `sort`; the content validation adds `status` (optional, enum), `language` (optional string), and `search` (optional string) on top.
2. Body schemas use `z.object({...})` with required fields, and `.strict()` may be applied to reject unknown fields.
3. Param schemas define `id: objectIdString` (a custom Zod schema that validates a 24‑hex‑character string).
4. These schemas are used by `validateRequest` in the routes to guard against bad input before reaching the controller.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
