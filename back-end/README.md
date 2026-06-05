# Sharia Decrees — API (Node.js + Express + MongoDB)

Production-oriented modular monolith for the Sharia Decrees platform. **JWT access tokens**, **opaque refresh tokens**, and **RBAC** (`authenticate` + `authorize`) protect `/api/v1` routes. Dev-only headers (`X-Public-User-Id`, `X-Inspector-User-Id`, …) remain for local integration but are **blocked in production** when env is configured correctly (see [`../docs/security-backend.md`](../docs/security-backend.md)).

## Requirements

- Node.js 20+
- MongoDB 6+ (local or managed)

## Quick start

```bash
cd back-end
cp .env.example .env
npm install
# Seeders are intentionally disabled by default and will refuse to run unless you
# explicitly opt in (dev-only): set ALLOW_DB_SEEDING=YES and do NOT use NODE_ENV=production.
# ALLOW_DB_SEEDING=YES npm run seed:roles
npm run dev
```

Health check: `GET http://localhost:4000/health`

Versioned API base: **`/api/v1`** (the mobile client and Postman collections should use this prefix).

Environment: primary database URL is **`MONGODB_URI`** (see [.env.example](.env.example)). Optional worker toggles: **`WORKER_CRON_ENABLED`**, **`AUDIT_LOG_RETENTION_DAYS`**.

## Scripts

| Script        | Purpose                          |
| ------------- | -------------------------------- |
| `npm run dev` | Watch mode server                |
| `npm start`   | Production-style start           |
| `npm test`    | Node test runner + `supertest`   |
| `npm run seed:roles` | Upserts canonical `Role` documents |

## Architecture

- **Routes** register HTTP paths only; they delegate to controllers.
- **Controllers** translate HTTP ↔ service calls; no Mongoose imports.
- **Services** own business rules and orchestrate repositories.
- **Repositories** encapsulate Mongoose queries and persistence details.
- **Serializers / DTO helpers** normalize API output (`src/core/dto`, per-module `*.serializer.js`).
- **Validation** uses Zod via `validateRequest` middleware.
- **Errors** funnel through `errorHandlerMiddleware` with stable JSON error envelopes.
- **Logging** uses `pino` + `pino-http` with request IDs from `requestContextMiddleware`.
- **Request context**: JWT resolution populates `req.user` for downstream controllers; legacy `req.context` fields may still exist on some paths — prefer `req.user` in new code.

## Adding a new domain module

1. Create `src/modules/<name>/` with `*.routes.js`, `*.controller.js`, `*.service.js`.
2. Add Mongoose models under `database/models/` and repositories under `database/repositories/`.
3. Register indexes in `database/indexes/registry.js`.
4. Mount the router in `src/routes/index.js` under `/api/v1/...`.
5. Extend `api/docs/openapi.yaml` and `api/contracts/` as the HTTP contract stabilizes.

## HTTP response contract

All JSON handlers use `sendSuccess`, `sendPaginatedList` / `sendPaginated`, or `sendError` from `src/utils/api-response.js` (re-exported in `src/modules/shared/http/index.js`).

- Success: `{ success: true, data, message?, meta? }` — paginated lists put `page`, `limit`, `total`, `totalPages` under `meta`.
- Client errors: thrown `AppError` subclasses (e.g. `ValidationError`, `UnauthorizedError`, `NotFoundError`) become `{ success: false, message, error: { code, message, details? } }` with the appropriate HTTP status.

## Modules (concise)

| Path prefix | Module folder | Responsibility |
|-------------|---------------|----------------|
| `/api/v1/notifications` | `notifications/` | Notification directory, public inbox, read/dismiss flows. |
| `/api/v1/super-admin` | `super-admin/` | Reserved super-admin surface (minimal today). |
| `/api/v1/system-admin` | `system-admin/` | Staff users, audit log listing, platform settings, system dashboard. |
| `/api/v1/decree-upload` | `decree-upload/` | Decree lifecycle for upload department: categories, decrees, versions, publish/supersede/amend. |
| `/api/v1/inspector-admin` | `inspector-admin/` | Inspection templates, assignments, submissions, exams, certificates (admin operations). |
| `/api/v1/inspectors` | `inspectors/` | Field inspector: assignments, drafts, submit, evidence refs, sync status. |
| `/api/v1/public` | `public-users/` | Public mobile API: decrees, bookmarks, exams, attempts, certificates, notifications, home. |
| `/api/v1/content` | `content/` | CMS-style static pages and homepage banners. |
| `/api/v1/files` | `files/` | Stored file metadata registration and listing (upload transport not wired yet). |
| `/api/v1/dashboards` | `dashboards/` | Role-scoped dashboard aggregates for each persona. |
| `/api/v1/search` | `search/` | Authenticated unified keyword search across public decrees + exams. |

Shared cross-cutting code lives in `src/modules/shared/` (query parsing, HTTP helpers, enums, serializers base). Pure workflows under `src/modules/*/…workflow.js` and `src/modules/inspections/` support services without exposing extra routes.

## Documentation (repo `docs/`)

Mirror of front-end engineering docs: [`../docs/api-backend.md`](../docs/api-backend.md), [`../docs/architecture-backend.md`](../docs/architecture-backend.md), [`../docs/database-backend.md`](../docs/database-backend.md), [`../docs/validation-backend.md`](../docs/validation-backend.md), [`../docs/security-backend.md`](../docs/security-backend.md), [`../docs/ci-and-release-backend.md`](../docs/ci-and-release-backend.md).

## Operational seams

1. Keep **`RBAC_ENFORCED=true`** in all shared environments; use `false` only on private developer machines when needed.
2. Retire dev headers (`X-Public-User-Id`, `X-Inspector-User-Id`, etc.) for production clients; tokens carry identity — see `DISABLE_DEV_AUTH_HEADERS` in `.env.example`.
3. Inspector / public contextual middleware files under `public-users/middleware/` and `inspectors/` document how user scope is resolved alongside JWTs.

## Layout

```
back-end/
  api/
    contracts/
    docs/
  database/
    connection/
    models/
    repositories/
    seeders/
    indexes/
  scripts/
  src/
    app.js
    server.js
    config/
    core/
    middlewares/
    modules/
    routes/
    utils/
```

## Environment

See `.env.example`. `MONGODB_URI` is required. `MAX_UPLOAD_BYTES` caps future multipart uploads (Multer wiring comes later).
