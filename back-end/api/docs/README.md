# API documentation

- **Repo index:** [`../../docs/api-backend.md`](../../docs/api-backend.md) — mount table, response envelope, auth flow, typing command.
- **OpenAPI sketch:** [`openapi.yaml`](./openapi.yaml) — partial path list and shared schemas; extend as contracts harden.
- **Executable samples:** [`samples.http`](./samples.http) — REST Client / IntelliJ style requests for local smoke tests.

## Conventions

- Base URL: `http://localhost:4000` (override in OpenAPI `servers` if needed).
- Version prefix: `/api/v1`.
- Correlation: responses include `X-Request-Id` (echo `X-Request-Id` on requests to trace logs).

Until real auth ships, some personas accept provisional headers (see **Future authentication integration** in [`../../README.md`](../../README.md)).
