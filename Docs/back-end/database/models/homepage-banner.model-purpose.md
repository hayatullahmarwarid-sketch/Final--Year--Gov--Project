<!-- purpose-doc: normalized -->
# Homepage Banner Model (`homepage-banner.model.js`)

## Scenario
Administrators can manage banners that appear on the public user’s home screen—announcements, featured decrees, or links to important sections. The model stores the banner image URL, title, target link, and display order.

## What it does
Schema with `title`, `imageUrl`, `link`, `order`, `active` boolean. Applies `standardDomainPlugin`. Exported as `HomepageBannerModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `title`: String.
   - `imageUrl`: String.
   - `link`: String (URL).
   - `order`: Number (for sorting).
   - `active`: Boolean, default true.
2. Index on `active + order` for fast retrieval of active banners.
3. Plugin adds tenant and soft‑delete.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
