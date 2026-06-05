<!-- purpose-doc: normalized -->
# Content Page Serializer (`content-page.serializer.js`)

## Scenario
When the API returns a static content page (like “About Us” or “Terms of Service”), the internal database document may contain fields that shouldn’t be exposed—Mongoose metadata, tenant IDs, soft‑delete flags, or raw HTML that needs formatting. The serializer transforms the plain database object into a clean, consistent JSON shape suitable for the client. This ensures every content page endpoint returns the same fields in the same format.

## What it does
Exports `serializeContentPage`, a function created by the generic `createSerializer` factory. The factory takes a mapping callback that receives a plain object (the page document after `.toObject()` or `lean()`) and returns a new object with only the public fields. For a content page, this typically includes `id` (converted from `_id`), `slug`, `title`, `body` (the HTML or rich text content), `language`, `status`, `updatedAt`, and `createdAt`.

## Libraries used
- **../../shared/serialization/serializer.js** – `createSerializer` factory function.

## Logic implemented
1. `createSerializer` wraps the provided callback so that it handles common serialization tasks—renaming `_id` to `id`, stripping any fields listed in an exclusion list, and optionally formatting dates.
2. The callback passed to `createSerializer` for content pages specifies the public fields to extract:
   ```js
   (plain) => ({
     id: plain._id?.toString(),
     slug: plain.slug,
     title: plain.title,
     body: plain.body,
     language: plain.language,
     status: plain.status,
     updatedAt: plain.updatedAt?.toISOString(),
     createdAt: plain.createdAt?.toISOString(),
   })

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
