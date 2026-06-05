<!-- purpose-doc: normalized -->
# Public Users Routes (`public-users.routes.js`)

## Scenario

HTTP requests hit this router after the server maps a URL prefix here. It runs for each matching request (with middleware such as auth and validation applied upstream or inline).

## What it does

The file exports the following surface (representative `export` lines):

- `export const publicUsersRouter = Router();`

Path in repo: `back-end/src/modules/public-users/public-users.routes.js`. Together, these exports and any side effects at import time define how the rest of the project interacts with `public-users.routes.js`.

## Libraries used

- **express** – third-party dependency for this module.
- **../shared/http/index.js** (`{ validateRequest }`) – relative project import.
- **./middleware/public-user-context.middleware.js** (`{ publicUserContextMiddleware }`) – relative project import.
- **./public-users.controller.js** (`{ publicUsersController }`) – relative project import.

## Logic implemented

1. The module loads its imports and establishes any top-level constants or configuration.
2. Network calls request or mutate remote data; results update UI state or context.
3. Express routing maps HTTP methods and paths to handlers (often composed with `asyncHandler` and validation middleware).
4. Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.
5. Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.

## Roles

- **public** — Direct: Public HTTP surface for end users.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
