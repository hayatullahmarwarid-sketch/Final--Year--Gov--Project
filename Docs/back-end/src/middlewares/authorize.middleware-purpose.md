<!-- purpose-doc: normalized -->
# Authorization Middleware (`authorize.middleware.js`)

## Scenario
After authentication establishes *who* the user is, authorization checks *what they can do*. Different routes require different roles—only an inspector admin can create exams, only a department officer can upload decrees. This middleware accepts a list of allowed roles and checks if the authenticated user’s role is among them. It also supports a bypass flag for development environments.

## What it does
Exports three items:

- **`FRONTEND_ROLE_TO_ROLE_KEY`** – a frozen mapping from front‑end role identifiers to backend role keys (if they differ).
- **`isRbacBypassed()`** – returns `true` if RBAC enforcement is turned off (e.g., via an environment variable `BYPASS_RBAC=true`).
- **`authorize(allowedRoles)`** – a middleware factory that takes an array of allowed roles (using backend role keys). If RBAC is bypassed, it calls `next()` immediately. Otherwise, it checks `req.user.role` (set by `authenticate`). If the role is in the allowed list, it proceeds; if not, it throws a `ForbiddenError`. If `req.user` is missing entirely, it throws an `UnauthorizedError`.

## Libraries used
- **../core/errors/app-error.js** – `ForbiddenError`, `UnauthorizedError`.

## Logic implemented
1. `authorize(['inspector_admin', 'system_admin'])` returns a middleware function.
2. Inside that function:
   - If `isRbacBypassed()` is true, skip check (`next()`).
   - If `req.user` doesn’t exist, throw `new UnauthorizedError('Authentication required')`.
   - If `!allowedRoles.includes(req.user.role)`, throw `new ForbiddenError('Insufficient permissions')`.
   - Otherwise, `next()`.
3. `FRONTEND_ROLE_TO_ROLE_KEY` can be used by routes that receive a front‑end role and need to map it to the backend key.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
