<!-- purpose-doc: normalized -->
# App‑Error Hierarchy (`app-error.js`)

## Scenario
In a REST API, every layer—controllers, services, repositories—can encounter conditions that should result in specific HTTP error responses: a requested resource doesn’t exist (404), the client sent invalid data (400 or 422), the user isn’t authenticated (401), or they’re trying to access something they don’t have permission for (403). Using plain `Error` objects and checking messages in an error‑handling middleware is fragile. This module provides a clean hierarchy of error classes that carry an HTTP status code and a meaningful message, allowing the global error handler to map each error to the correct status code and response body without any guesswork. Services can simply `throw new NotFoundError('Decree not found')` and the error handler knows exactly how to respond.

## What it does
Exports a base class `AppError` and six specialised subclasses:

- **`AppError`** – extends `Error`; accepts a `message` and an HTTP `statusCode` from `HttpStatus` (or a numeric code), and optionally `isOperational` (true for expected errors that can be exposed to clients). It captures a stack trace.
- **`NotFoundError`** – defaults to `HttpStatus.NOT_FOUND` (404).
- **`ValidationError`** – defaults to `HttpStatus.UNPROCESSABLE_ENTITY` (422).
- **`BadRequestError`** – defaults to `HttpStatus.BAD_REQUEST` (400).
- **`ForbiddenError`** – defaults to `HttpStatus.FORBIDDEN` (403).
- **`ConflictError`** – defaults to `HttpStatus.CONFLICT` (409).
- **`UnauthorizedError`** – defaults to `HttpStatus.UNAUTHORIZED` (401).

Each subclass automatically sets `this.statusCode` and `this.name` to the class name, and can be used with just a message. They may also accept an optional second parameter for a custom status code if needed.

## Libraries used
- **./http-status.js** – `HttpStatus` object containing named HTTP status codes (e.g., `HttpStatus.NOT_FOUND = 404`).

## Logic implemented
1. `AppError` constructor:
   ```js
   constructor(message, statusCode, isOperational = true) {
     super(message);
     this.statusCode = statusCode;
     this.isOperational = isOperational;
     Error.captureStackTrace(this, this.constructor);
   }

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
