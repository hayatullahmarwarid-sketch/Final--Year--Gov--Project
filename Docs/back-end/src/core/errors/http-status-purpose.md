<!-- purpose-doc: normalized -->

---

### `http-status-purpose.md`
```markdown
# HTTP Status Constants (`http-status.js`)

## Scenario
Throughout the codebase, HTTP status codes are used in error classes, response utilities, and sometimes in redirect logic. Hard‑coding numbers like `404` or `200` is error‑prone and reduces readability. This module exports a frozen object that maps semantic names to their numeric codes, providing a single source of truth that is easy to import and use.

## What it does
Exports `HttpStatus`, an object containing the most common HTTP status codes as constants. For example:

```js
export const HttpStatus = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
});

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
