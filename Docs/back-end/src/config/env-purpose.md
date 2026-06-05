<!-- purpose-doc: normalized -->
# Environment Configuration (`env.js`)

## Scenario
Every deployment environment—local development, staging, production—has its own set of configuration values: database URIs, API secrets, email credentials, feature flags, and timeouts. Hard‑coding these values would break across environments and create security risks. This module centralises all environment‑specific settings by reading from `process.env` and validating them with a strict Zod schema. When any required variable is missing or malformed, the application fails fast at startup with a clear error, preventing mysterious runtime crashes.

## What it does
Exports a single function `getEnv()` that returns a frozen, typed configuration object. The first time it’s called, it:

1. Parses `process.env` using a Zod schema (e.g., `z.object({ MONGODB_URI: z.string().url(), JWT_SECRET: z.string().min(32), ... })`).
2. If validation fails, it throws an error listing all missing or invalid variables.
3. If successful, it caches the result (either in a module‑level variable or via Zod’s safeParse with a stored result) so subsequent calls return the same object without re‑parsing.
4. Returns the validated object, which contains properties like `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `REDIS_URL`, `SMTP_HOST`, etc.

This ensures that any module calling `getEnv()` receives a canonical, type‑safe configuration.

## Libraries used
- **zod** – for schema definition and validation of environment variables.

## Logic implemented
1. A Zod schema is defined (often called `envSchema`) describing all expected environment variables with their types and constraints.
2. When `getEnv()` is invoked:
   - It calls `envSchema.parse(process.env)` (or `safeParse` to handle errors gracefully).
   - If parsing fails, it logs the errors and throws a fatal exception (or returns them to the caller to decide).
   - On success, it stores the parsed object and returns it.
3. The function ensures immutability (with `Object.freeze` or by returning a constant reference).
4. Modules throughout the backend import `getEnv` and call it to get the configuration they need, e.g., `const { MONGODB_URI } = getEnv();`.

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
