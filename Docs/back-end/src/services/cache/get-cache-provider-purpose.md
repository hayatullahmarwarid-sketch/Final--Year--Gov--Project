<!-- purpose-doc: normalized -->
# Get Cache Provider (`get-cache-provider.js`)

## Scenario

Infrastructure services (email, storage, cache, push, etc.) are invoked when domain logic or jobs need that capability.

## What it does

The file exports the following surface (representative `export` lines):

- `export function getCacheProvider() {`
- `export function resetCacheProviderForTests() {`

Path in repo: `back-end/src/services/cache/get-cache-provider.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `get-cache-provider.js`.

## Libraries used

- **../../config/redis.js** (`{ getRedis }`) – relative project import.
- **./InMemoryLruCacheProvider.js** (`{ InMemoryLruCacheProvider }`) – relative project import.
- **./RedisCacheProvider.js** (`{ RedisCacheProvider }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
