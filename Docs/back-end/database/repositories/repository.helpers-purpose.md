<!-- purpose-doc: normalized -->
# Repository Helpers (`repository.helpers.js`)

## Scenario
Repositories need to combine multiple filter objects into one query, and they need pagination helpers to convert `offset`/`limit` to the internal format. This file provides those utilities so that every repository uses the same approach.

## What it does
Exports two things:
- `toOffsetLimit(paginationObject)` – a re‑export from the shared pagination module.
- `mergeFilters(...parts)` – a function that takes multiple filter objects (or functions returning objects) and deeply merges them into a single Mongoose‑compatible query. Parts that are `undefined` or `null` are ignored, making it easy to conditionally add filters.

## Libraries used
- No external libraries; only internal re‑exports.

## Logic implemented
1. `mergeFilters` iterates over its arguments:
   - Skips falsy parts.
   - For each filter object, merges keys. If a key value is an Mongoose operator (like `$in`), it merges accordingly.
   - Returns the combined filter object.
2. `toOffsetLimit` simply maps `{ page, pageSize }` to `{ skip, limit }`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
