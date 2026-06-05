<!-- purpose-doc: normalized -->

---

### `homepage-banner.serializer-purpose.md`
```markdown
# Homepage Banner Serializer (`homepage-banner.serializer.js`)

## Scenario
The public home screen displays promotional banners—images with titles and links. When the API returns these banners, it must exclude any internal fields (e.g., soft‑delete timestamps, tenant IDs) and present them in a consistent structure that the mobile app can directly use for rendering. This serializer defines that public shape.

## What it does
Exports `serializeHomepageBanner`, also built with `createSerializer`. It defines the public fields for a banner: `id`, `title`, `imageUrl`, `link` (the tap target), `order` (for sorting), and whether it is `active`.

## Libraries used
- **../../shared/serialization/serializer.js** – `createSerializer` factory.

## Logic implemented
1. The callback for banners selects the relevant fields:
   ```js
   (plain) => ({
     id: plain._id?.toString(),
     title: plain.title,
     imageUrl: plain.imageUrl,
     link: plain.link,
     order: plain.order,
     active: plain.active,
     createdAt: plain.createdAt?.toISOString(),
   })

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
