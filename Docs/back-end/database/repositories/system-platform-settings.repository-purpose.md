<!-- purpose-doc: normalized -->
# System Platform Settings Repository (`system-platform-settings.repository.js`)

## Scenario
Global platform settings are stored as key‑value pairs. The repository reads/writes these settings, and provides default values.

## What it does
Extends `BaseRepository` with `SystemPlatformSettingsModel`. Exports `defaultGlobalPlatformSettings()` for fallback. Likely methods:
- `get(key?)` – returns all settings or a single value, merged with defaults.
- `set(key, value)` – upserts a setting.

## Libraries used
- (none beyond model and base).

## Logic implemented
1. `defaultGlobalPlatformSettings()` defines a static object (e.g., maintenance mode: false).
2. `get`: fetches all settings for a tenant, overlays defaults.
3. `set`: `this.updateOne({ key }, { value }, { upsert: true })`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
