<!-- purpose-doc: normalized -->
# Decree Upload Validation Schemas (`decree-upload.validation.js`)

## Scenario
All decree upload endpoints require strict validation of input: categories need slugs and names, decrees need titles and categories, version numbers must be positive, lifecycle transitions must have valid reasons, and the fields must match the expected types. These Zod schemas define those rules, enabling the `validateRequest` middleware to reject malformed requests early.

## What it does
Exports several Zod schemas:

- **Param schemas**:
  - `categoryIdParamsSchema` – `{ categoryId: objectIdString }`.
  - `decreeIdParamsSchema` – `{ decreeId: objectIdString }`.
  - `decreeAndVersionParamsSchema` – `{ decreeId: objectIdString, versionId: objectIdString }`.

- **Category schemas**:
  - `listCategoriesQuerySchema` – extends list query with optional `search` string.
  - `createCategoryBodySchema` – `{ name: string, slug?: string, description?: string }`. Slug auto‑generated if absent, but must be valid if provided.
  - `patchCategoryBodySchema` – partial update of name, slug, description.

- **Decree schemas**:
  - `listDecreesQuerySchema` – extends list query with optional filters: `lifecycle` (from `DECREE_LIFECYCLE_KEYS`), `categoryId`, `search`.
  - `createDecreeBodySchema` – `{ title: string, body: string, categoryId: objectIdString, decreeNumber?: string }`.
  - `patchDecreeBodySchema` – partial update of fields.
  - `publishDecreeBodySchema`, `archiveDecreeBodySchema`, `supersedeDecreeBodySchema` – may include a reason or a replacement decree ID (as required).
  - `createAmendmentBodySchema` – `{ body: string, effectiveFrom?: string }`.
  - `abandonAmendmentDraftBodySchema` – maybe empty or with a reason.

- **Version schemas**:
  - `listVersionsQuerySchema` – optional `includeDrafts` boolean.

- **Settings schema**:
  - `patchDeptUploadSettingsBodySchema` – an array of `{ key: string, value: unknown }` pairs or a key‑value object.

- **Other**:
  - `nextDecreeNumberQuerySchema` – for auto‑generating the next decree number.

All schemas use `zod` and share helpers like `extendListQuery` for pagination.

## Libraries used
- **zod** – schema definition.
- **../shared/query/list-query.schema.js** – `extendListQuery`.
- **../shared/enums/decree-lifecycle.js** – `DECREE_LIFECYCLE_KEYS`.
- **../shared/enums/decree-version-publication.js** – `DECREE_VERSION_PUBLICATION_KEYS`.

## Logic implemented
1. Each schema is defined with appropriate `z.object({ ... })`, `.optional()`, and `.refine()` for business rules if needed.
2. Example – `createDecreeBodySchema`:
   ```js
   z.object({
     title: z.string().min(1).max(500),
     body: z.string().min(1),
     categoryId: objectIdString,
     decreeNumber: z.string().optional(),
     effectiveFrom: z.string().datetime().optional(),
   }).strict();

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Decree upload department APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
