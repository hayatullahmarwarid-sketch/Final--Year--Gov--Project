<!-- purpose-doc: normalized -->
# Logger Configuration (`logger.js`)

## Scenario
The back‑end produces logs for debugging, monitoring, and auditing. In production, logs are structured as JSON for ingestion into log aggregators (ELK, Datadog, etc.). In development, they are pretty‑printed for readability. The logger must respect the current environment (development, staging, production) and log level (trace, debug, info, warn, error, fatal). This module provides a single, pre‑configured logger instance that can be used anywhere without repeating setup.

## What it does
Exports a function `getLogger()` that returns a configured Pino logger instance. The configuration is derived from environment variables obtained via `getEnv()`:

- `NODE_ENV` or a dedicated `LOG_LEVEL` determines the minimum level (e.g., `'info'` in production, `'debug'` in development).
- In non‑production environments, it may enable `pino‑pretty` transport (though not imported, the pino instance can be configured with `transport`).
- It sets a base context (e.g., `{ app: 'backend' }`) and optionally adds request‑id serialisation.
- The logger instance is cached; repeated calls return the same instance.

Because it imports `getEnv`, it respects any environment‑specific logging settings.

## Libraries used
- **pino** – fast, low‑overhead logging library.
- **./env.js** – `getEnv()` to read `NODE_ENV`, `LOG_LEVEL`, maybe `LOG_PRETTY`.

## Logic implemented
1. When `getLogger()` is first called:
   - It reads `LOG_LEVEL` from `getEnv()` or defaults to `'info'`.
   - It creates a Pino logger with options:
     ```js
     pino({
       level: logLevel,
       ...(process.env.NODE_ENV !== 'production' && {
         transport: { target: 'pino-pretty', options: { colorize: true } },
       }),
     });

## Roles

- **public** — Indirect / shared: May apply if the module is used from public routes, auth flows, or shared layouts.
- **inspector** — Indirect / shared: Relevant when inspector mobile features or inspector APIs use this code.
- **inspector_admin** — Indirect / shared: Relevant when inspector-admin surfaces or APIs use this code.
- **decree_upload_department** — Indirect / shared: Relevant when decree upload portal features use this code.
- **system_admin** — Indirect / shared: Relevant for operational/admin tooling, audits, or platform configuration.
