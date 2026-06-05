<!-- purpose-doc: normalized -->
# System Platform Settings Model (`system-platform-settings.model.js`)

## Scenario
System‑wide settings like “maintenance mode”, “max login attempts”, “notification throttling” are stored in a single document per tenant. The system admin settings screen reads and writes these values.

## What it does
Schema with a `key` (or `category`) and a `value` (Mixed). No plugin imports. Exported as `SystemPlatformSettingsModel`.

## Libraries used
- **mongoose**.

## Logic implemented
1. Fields:
   - `key`: String.
   - `value`: Mixed.
2. Unique index on `key`.
3. Simple key‑value store; may be seeded with defaults.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
