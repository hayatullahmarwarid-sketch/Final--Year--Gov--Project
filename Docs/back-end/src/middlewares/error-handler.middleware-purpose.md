<!-- purpose-doc: normalized -->
# Global Error Handler Middleware (`error-handler.middleware.js`)

## Scenario
When any route handler, service, or middleware throws an error, Express must respond with a consistent, informative JSON error body. This global error handler is the last safety net: it catches all errors, determines the appropriate HTTP status code and message, logs the error, reports critical ones to a telemetry service, optionally audits the failure, and sends a standardised error response to the client. It also handles Mongoose‑specific errors (validation, duplicate key) and Zod validation errors, converting them into the app’s error format.

## What it does
Exports `errorHandlerMiddleware(err, req, res, _next)`, a standard Express error‑handling middleware with four parameters. It:

1. Determines the status code and message:
   - If the error is an instance of `AppError` (e.g., `NotFoundError`, `ConflictError`), it uses its `statusCode` and `message`.
   - If the error is a Mongoose `ValidationError`, it maps individual field errors and returns a `422` status.
   - If the error is a Mongoose duplicate key error (`code 11000`), it returns a `409 Conflict`.
   - If the error is a Zod `ZodError` (from validation middleware), it returns a `422` with the formatted issues.
   - For unknown errors, it returns `500 Internal Server Error` and a generic message (in production) to avoid leaking details.
2. Logs the error using `getLogger()` with the request ID, method, URL, and stack trace.
3. Reports the error to a telemetry service (e.g., Sentry) via `getErrorReporter().captureException(err)` for non‑operational errors.
4. Audits the failed request if it was a write operation, using `auditService` and `emailFingerprint`.
5. Sends the response using `sendError(res, statusCode, message, details)`.

## Libraries used
- **mongoose** – to identify Mongoose error types (`ValidationError`, `MongoServerError` with `code 11000`).
- **zod** – to detect `ZodError` instances.
- **../core/errors/app-error.js** – `AppError` base class and specific subclasses.
- **../core/errors/http-status.js** – `HttpStatus` for status codes.
- **../config/logger.js** – `getLogger()` for logging.
- **../utils/api-response.js** – `sendError()` for formatted error responses.
- **../services/audit/auditService.js** – `auditService`, `emailFingerprint` for auditing.
- **../services/telemetry/get-error-reporter.js** – `getErrorReporter` for reporting to external service.

## Logic implemented
1. Set default status and message.
2. If `err instanceof AppError`, use its fields.
3. Else if `err.name === 'ValidationError'` (Mongoose), map errors and set status `422`.
4. Else if `err.code === 11000`, set status `409`, extract duplicate field.
5. Else if `err instanceof ZodError`, set status `422`, map Zod issues.
6. Else, set status `500` and generic message (in production).
7. Log the error at appropriate level (error for 500, warn for 4xx).
8. Report to telemetry if status ≥ 500 and error is not operational.
9. Audit if request was a write.
10. Send `sendError(res, statusCode, message, details)`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
