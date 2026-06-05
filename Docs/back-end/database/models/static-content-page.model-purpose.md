<!-- purpose-doc: normalized -->
# Static Content Page Model (`static-content-page.model.js`)

## Scenario
The app includes static content pages like “About”, “Terms of Service”, “Help”. Administrators can manage these pages’ content (title, body, language) via a CMS. This model stores the page data, language variants, and publication status.

## What it does
Schema with `slug`, `title`, `body`, `language` (optional), `status` (enum `STATIC_PAGE_STATUS_KEYS`), `updatedAt`. Applies `standardDomainPlugin`. Exported as `StaticContentPageModel`.

## Libraries used
- **mongoose**.
- **../../src/modules/shared/enums/static-page-status.js**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `slug`: String, unique.
   - `title`: String.
   - `body`: String (HTML or Markdown).
   - `language`: optional String.
   - `status`: enum – draft, published, archived.
   - `updatedAt`: Date.
2. Index on `slug + language`.
3. Plugin adds tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
