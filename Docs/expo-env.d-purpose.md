<!-- purpose-doc: normalized -->
# Expo Env D (`expo-env.d.ts`)

## Scenario

This module runs whenever other code imports it or when the runtime loads it as part of the build graph.

## What it does

The file may register effects at load time, re-export from another path, or use patterns outside a simple `export` line scan; reading the full source is required for exact exports.

Path in repo: `expo-env.d.ts`. Together, these exports and any side effects at import time define how the rest of the project interacts with `expo-env.d.ts`.

## Libraries used

- **(none beyond language built-ins)** – the file only uses local control flow or relative imports not listed above.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
