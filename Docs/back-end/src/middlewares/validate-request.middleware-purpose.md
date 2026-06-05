<!-- purpose-doc: normalized -->
# Request Validation Middleware (`validate-request.middleware.js`)

## Scenario
Every endpoint expects specific request data—body fields, query parameters, path parameters—with defined types and constraints. Instead of writing ad‑hoc validation in each controller, this middleware uses Zod schemas to validate incoming requests and reports detailed, user‑friendly errors when the data is malformed. It ensures that controllers only receive clean, correctly‑shaped data.

## What it does
Exports `validateRequest(schemas)`, a middleware factory. The `schemas` parameter is an object with optional keys: `body`, `query`, `params`. Each key maps to a Zod schema. The middleware:

1. Parses the corresponding part of the request (`req.body`, `req.query`, `req.params`) with its schema.
2. If validation fails (Zod throws a `ZodError`), the middleware catches it and passes a `ValidationError` to the next error handler, with the formatted Zod issues as details.
3. If validation succeeds, the parsed (and possibly transformed) data replaces the request properties (e.g., `req.body = parsedBody`), and the request proceeds.

## Libraries used
- **zod** – schema parsing and validation.
- **../core/errors/app-error.js** – `ValidationError` for consistent error formatting.

## Logic implemented
1. The returned middleware function receives `(req, res, next)`.
2. It initialises an empty error collection.
3. If `schemas.body` is provided, it tries `schemas.body.parse(req.body)`. On success, `req.body = result`. On error, it collects the Zod issues.
4. Similarly for `schemas.query` and `schemas.params`.
5. If any errors were collected, it creates a `ValidationError` with a message like `'Validation failed'` and the combined Zod issues as `details`, and passes it to `next(err)`.
6. If all pass, `next()` is called.
7. The error handler later catches the `ValidationError` and responds with `422` and the details.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
