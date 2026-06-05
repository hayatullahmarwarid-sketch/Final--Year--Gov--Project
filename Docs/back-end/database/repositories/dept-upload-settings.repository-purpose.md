<!-- purpose-doc: normalized -->
# Department Upload Settings Repository (`dept-upload-settings.repository.js`)

## Scenario
Each department has custom settings for the decree upload module. The repository reads and writes those settings as key‑value pairs, and provides a function to generate default settings for new departments.

## What it does
Extends `BaseRepository` with `DeptUploadSettingsModel`. Exports:
- `defaultDeptUploadSettings()` – returns an object of default setting keys/values.
- `getSettings(tenantId)` – returns all settings for a tenant, merging with defaults.
- `updateSetting(tenantId, key, value)` – upserts a single setting.

## Libraries used
- (none beyond model and base).

## Logic implemented
1. `defaultDeptUploadSettings()` defines a static object.
2. `getSettings` calls `this.find({ tenantId })` and overlays defaults.
3. `updateSetting` uses `this.updateOne({ tenantId, key }, { value }, { upsert: true })`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Direct: Department decree upload portal and related APIs.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
