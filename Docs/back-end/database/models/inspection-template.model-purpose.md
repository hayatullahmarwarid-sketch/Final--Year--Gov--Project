<!-- purpose-doc: normalized -->
# Inspection Template Model (`inspection-template.model.js`)

## Scenario
Admin creates templates that define the fields of an inspection form—each field has a name, type (text, select, photo, date), whether it’s required, and optionally a default value like a location. Templates are versioned and can be assigned to inspectors.

## What it does
Schema with `name`, `description`, `fields` (array of field definitions), `category`, `active` boolean. Applies `standardDomainPlugin`. Exported as `InspectionTemplateModel`.

## Libraries used
- **mongoose**.
- **./plugins/standard-domain.plugin.js**.

## Logic implemented
1. Fields:
   - `name`: String.
   - `description`: optional.
   - `fields`: [{
       `name`: String,
       `type`: enum,
       `required`: Boolean,
       `defaultValue`: Mixed,
       `options`: [String] (for select),
       `label`: String
     }]
   - `category`: optional.
   - `active`: Boolean, default true.
2. Index on `active + category`.
3. Plugin adds tenant scoping.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
