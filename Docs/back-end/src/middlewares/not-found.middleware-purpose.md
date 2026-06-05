<!-- purpose-doc: normalized -->
# Not‑Found Middleware (`not-found.middleware.js`)

## Scenario
When a client sends a request to a URL that doesn’t match any defined route, the server must respond with a clear `404 Not Found` error rather than silently returning nothing. This middleware runs after all other routes; if no handler matched, it throws a `NotFoundError`, which the global error handler then formats into a JSON response.

## What it does
Exports `notFoundMiddleware()`, which returns an Express middleware function. The middleware simply throws a `NotFoundError` with a message like `'Route not found'`. It is typically placed at the very end of the middleware stack (after all route definitions) so it only executes if no prior route or middleware sent a response.

## Libraries used
- **../core/errors/app-error.js** – `NotFoundError`.

## Logic implemented
1. The middleware is defined as:
   ```js
   (req, res, next) => {
     throw new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
   }

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
