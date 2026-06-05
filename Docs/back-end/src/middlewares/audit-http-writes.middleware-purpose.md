<!-- purpose-doc: normalized -->
# Audit HTTP Writes Middleware (`audit-http-writes.middleware.js`)

## Scenario

Operators need a coarse compliance trail for mutating HTTP requests without requiring every controller to manually invoke an audit helper. This middleware listens for the Express response `finish` event and delegates one summarized audit row per successful pipeline completion (unless the path is noise such as health probes).

## What it does

Exports `auditHttpWritesMiddleware()` returning Express middleware. For requests whose method is not `GET`, `HEAD`, or `OPTIONS`, it subscribes to `res.on('finish')` and, when the path is not in a skip list, calls `auditService.logHttpWrite(req, res.statusCode)` if MongoDB is still connected.

## Libraries used

- **`mongoose`** — Checks `mongoose.connection.readyState` so late `finish` events during teardown tests do not throw when Mongo is closed.
- **`auditService`** (`../services/audit/auditService.js`) — Persists the blanket `http.write` audit row with coarse routing metadata derived internally from `req`.
- **`getLogger`** (`../config/logger.js`) — Logs failures from `logHttpWrite` at debug level without failing the HTTP response.

## Logic implemented

1. Exported middleware runs for every request after it is mounted in [`back-end/src/app.js`](../../../../back-end/src/app.js) (before routers).
2. If `req.method` is in `SKIP_METHODS` (`GET`, `HEAD`, `OPTIONS`), call `next()` and return (no listener).
3. Register `res.on('finish', ...)`.
4. Inside the handler, if `shouldSkipAuditPath(req)` returns true (health/metrics/static patterns), return early.
5. If Mongo is not in state `1` (connected), return early to avoid `MongoClientClosedError`.
6. Call `auditService.logHttpWrite(req, res.statusCode)`; on rejection, `getLogger().debug` the error.
7. Call `next()` immediately so the request continues through routing.

## Roles

- **public** — Indirect: write calls from public JWT sessions may generate audit rows if they mutate data.
- **inspector** — Indirect: field submission writes are auditable.
- **inspector_admin** — Indirect: staff CRUD is auditable.
- **decree_upload_department** — Indirect: decree lifecycle writes are auditable.
- **system_admin** — Indirect: platform operations are auditable.
