<!-- purpose-doc: normalized -->
# Generate Architecture Docs (`generate-architecture-docs.mjs`)

## Scenario

A maintainer runs **Node tooling** locally (maintenance, codegen, or environment setup). This script executes in the developer shell, not on end-user devices.

## What it does

The file may register effects at load time, re-export from another path, or use patterns outside a simple `export` line scan; reading the full source is required for exact exports.

Path in repo: `scripts/generate-architecture-docs.mjs`. Together, these exports and any side effects at import time define how the rest of the project interacts with `generate-architecture-docs.mjs`.

## Libraries used

- **node:fs** – third-party dependency for this module.
- **node:path** – third-party dependency for this module.
- **node:url** – third-party dependency for this module.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Job or cron wiring schedules background execution or processes queued payloads.
3. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
