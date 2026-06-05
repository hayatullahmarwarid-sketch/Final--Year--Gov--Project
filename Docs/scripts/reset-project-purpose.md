<!-- purpose-doc: normalized -->
# Reset Project (`reset-project.js`)

## Scenario

A maintainer runs **Node tooling** locally (maintenance, codegen, or environment setup). This script executes in the developer shell, not on end-user devices.

## What it does

The file exports the following surface (representative `export` lines):

- `export default function Index() {`
- `export default function RootLayout() {`

Path in repo: `scripts/reset-project.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `reset-project.js`.

## Libraries used

- **`fs`** – CommonJS dependency.
- **`path`** – CommonJS dependency.
- **`readline`** – CommonJS dependency.

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
