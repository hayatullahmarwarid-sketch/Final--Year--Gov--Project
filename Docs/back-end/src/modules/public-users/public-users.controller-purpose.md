<!-- purpose-doc: normalized -->
# Public Users Controller (`public-users.controller.js`)

## Scenario

A controller handles a specific HTTP action: it runs when a route delegates to it, validates input, calls services, and returns a response.

## What it does

The file exports the following surface (representative `export` lines):

- `export class PublicUsersController {`
- `export const publicUsersController = new PublicUsersController();`

Path in repo: `back-end/src/modules/public-users/public-users.controller.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `public-users.controller.js`.

## Libraries used

- **../shared/http/index.js** (`{ asyncHandler, sendPaginatedList, sendSuccess }`) – relative project import.
- **./public-users.service.js** (`{ publicUsersService }`) – relative project import.
- **./lib/require-public-user.js** (`{ requirePublicOwnerUserId }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Async route handlers are wrapped so thrown errors reach the global error middleware.
3. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
4. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Direct: Public HTTP surface for end users.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
