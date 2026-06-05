<!-- purpose-doc: normalized -->
# Cleanup Data (`cleanup-data.js`)

## Scenario

This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.

## What it does

The file may register effects at load time, re-export from another path, or use patterns outside a simple `export` line scan; reading the full source is required for exact exports.

Path in repo: `back-end/cleanup-data.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `cleanup-data.js`.

## Libraries used

- **dotenv** – third-party dependency for this module.
- **mongoose** – third-party dependency for this module.
- **node:fs** – third-party dependency for this module.
- **node:path** – third-party dependency for this module.
- **node:process** – third-party dependency for this module.
- **node:readline** – third-party dependency for this module.
- **./src/config/env.js** (`{ getEnv }`) – relative project import.
- **./src/services/storage/get-storage-provider.js** (`{ getStorageProvider }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
