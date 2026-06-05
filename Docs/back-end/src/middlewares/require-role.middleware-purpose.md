<!-- purpose-doc: normalized -->
# Require Role Middleware (Back‑Compat Re‑export) (`require-role.middleware.js`)

## Scenario
Older parts of the codebase import authorization functions from `require-role.middleware.js`. To avoid breaking those imports while consolidating the actual logic into `authorize.middleware.js`, this file exists solely as a barrel re‑export. New code should import directly from `authorize.middleware.js`.

## What it does
Re‑exports the same three items from `./authorize.middleware.js`:
- `authorize`
- `isRbacBypassed`
- `FRONTEND_ROLE_TO_ROLE_KEY`

No additional logic is defined here.

## Libraries used
- None (only re‑export).

## Logic implemented
1. `export { authorize, isRbacBypassed, FRONTEND_ROLE_TO_ROLE_KEY } from './authorize.middleware.js';`
2. Any existing code that does `import { authorize } from '../middlewares/require-role.middleware.js'` continues working.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
