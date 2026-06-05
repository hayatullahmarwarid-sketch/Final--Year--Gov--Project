<!-- purpose-doc: normalized -->
# Authentication Middleware (`auth.middleware.js`)

## Scenario
Every protected route needs to verify that the request comes from a logged‑in user. This middleware reads the `Authorization: Bearer <token>` header, verifies the JWT, and attaches the decoded user payload (`req.user`) so that downstream handlers and middleware can use it. Optionally, it can also resolve the bearer token without enforcing presence, for routes that may behave differently for logged‑in vs anonymous users.

## What it does
Exports two functions:

- **`resolveBearerJwtMiddleware()`** – reads the Authorization header and, if present and valid, attaches `req.user`; otherwise just calls `next()`. Used on routes that are optionally authenticated.
- **`authenticate()`** – a strict middleware that reads the header, verifies the token using `verifyToken` from `../lib/auth.js`, and attaches `req.user`. If the token is missing or invalid, it throws an `UnauthorizedError`. Used on all protected routes.

## Libraries used
- **jsonwebtoken** – used internally by `verifyToken` (imported from auth lib).
- **../core/errors/app-error.js** – `UnauthorizedError` for when authentication fails.
- **../lib/auth.js** – `verifyToken` function that decodes and validates the JWT.

## Logic implemented
1. `authenticate` middleware:
   - Reads the `Authorization` header and extracts the token after `Bearer `.
   - If missing, throws `new UnauthorizedError('Missing authorization token')`.
   - Calls `verifyToken(token)` from the auth library, which verifies the JWT and returns the payload (or throws).
   - Attaches the payload to `req.user = payload` (including `userId`, `role`, `email`, etc.).
   - Calls `next()`.
2. `resolveBearerJwtMiddleware`:
   - If the header is present, calls `verifyToken` and attaches `req.user`.
   - If missing or invalid, just calls `next()` without error.
   - Useful for public endpoints that may show extra data to logged‑in users.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
