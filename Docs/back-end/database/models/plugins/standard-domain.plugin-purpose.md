<!-- purpose-doc: normalized -->
# Standard Domain Plugin (`standard-domain.plugin.js`)

## Scenario
In a multi‑tenant application with soft‑delete requirements, many Mongoose schemas need consistent fields and indexes—a `tenantId` to scope data to a specific tenant, a `deletedAt` timestamp to mark records as soft‑deleted, and a standard index to support common listing queries. Manually adding these fields and indexes to every schema would be repetitive and error‑prone. This plugin automates the process, ensuring every schema that uses it gets those capabilities while avoiding duplicate definitions.

## What it does
The plugin exports a single function, `standardDomainPlugin`, that is applied to a Mongoose schema using `schema.plugin()`. When the plugin runs, it does the following:

1. **Adds multi‑tenant `tenantId`** – If the schema does not already define a `tenantId` path (to avoid duplicate path errors), the plugin adds a field `tenantId` of type `ObjectId` with a reference to `'Tenant'` and a required: `true` constraint (or may be optional depending on `options.withTenant`).

2. **Adds soft‑delete `deletedAt`** – Adds a `deletedAt` field of type `Date` with `default: null`. This allows queries to filter out soft‑deleted records by checking `deletedAt: null`.

3. **Adds a common list index** – Creates a compound index covering `tenantId` (if added) and `deletedAt`, ensuring that typical listing queries (e.g., “get all active records for tenant X”) are efficient. This index is likely defined with `background: true` for production safety.

4. **Options** – The plugin accepts an optional `options` object with `withTenant` property to control whether `tenantId` is added. If `withTenant` is `false`, the plugin skips the `tenantId` field (and its associated index).

By using this plugin, any model that needs multi‑tenancy and soft‑delete capabilities can get them with a single call, maintaining consistency across the codebase.

## Libraries used
- **mongoose** – the plugin’s parameters `schema` and `options` are standard Mongoose plugin arguments. The plugin itself has no imports, indicating it uses only built‑in Mongoose `Schema` methods (`schema.add()`, `schema.index()`, `schema.path()`).

## Logic implemented
1. When `standardDomainPlugin(schema, options)` is called (via `schema.plugin(standardDomainPlugin, { withTenant: true })`):
   - **Check for existing `tenantId`**: It checks if the schema already has a path named `tenantId` using `schema.path('tenantId')`. If not, and if `options.withTenant` is not `false`, it adds:
     ```js
     schema.add({
       tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }
     });

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
