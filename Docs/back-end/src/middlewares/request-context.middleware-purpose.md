<!-- purpose-doc: normalized -->
# Request Context Middleware (`request-context.middleware.js`)

## Scenario
To trace a request through logs, error reports, and audit records, every incoming HTTP request needs a unique identifier (request ID). This ID should be generated once, attached to the request object, and accessible to every downstream handler and service. It also should be returned in the response headers so the client can reference it when reporting issues.

## What it does
Exports two items:

- **`requestContextMiddleware()`** – Express middleware that generates a unique request ID using `newRequestId()` from the crypto‑random utility, attaches it to `req.requestId`, and sets the `X-Request-Id` response header. The middleware also may capture the request start time and other metadata.
- **`getRequestContext(req)`** – a helper function that extracts the request ID (and possibly other context) from the request object, for use in services and loggers that don’t have direct access to `req`.

## Libraries used
- **../utils/crypto-random.js** – `newRequestId()` to generate a unique, random request ID (e.g., a UUID or a short random string).

## Logic implemented
1. `requestContextMiddleware`:
   - Calls `newRequestId()` to create a unique ID.
   - Assigns it to `req.requestId = requestId`.
   - Sets `res.set('X-Request-Id', requestId)`.
   - Calls `next()`.
2. `getRequestContext(req)`:
   - Returns an object `{ requestId: req.requestId }` (or uses a continuation‑local storage mechanism if more advanced).
3. Other middleware (logger, error handler) read `req.requestId` to include it in logs.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
