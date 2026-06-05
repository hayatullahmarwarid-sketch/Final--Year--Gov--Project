<!-- purpose-doc: normalized -->
# Eslint Config (`eslint.config.js`)

## Scenario

This module runs whenever other code imports it or when the runtime loads it as part of the build graph.

## What it does

The module uses CommonJS exports:

- `module.exports = defineConfig([`

Path in repo: `eslint.config.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `eslint.config.js`.

## Libraries used

- **`eslint/config`** – CommonJS dependency.
- **`eslint-config-expo/flat`** – CommonJS dependency.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
