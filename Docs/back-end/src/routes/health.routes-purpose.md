<!-- purpose-doc: normalized -->
# Health Routes (`health.routes.js`)

## Scenario

Operations tooling, container orchestration, or a load balancer probe hits **liveness** or **readiness** routes while the API process runs. Liveness answers cheaply so flaky dependency checks do not restart the whole instance; readiness aggregates MongoDB (required), Redis (optional), and SMTP configuration status so traffic can be drained when backing services are down.

## What it does

Exports **`healthRouter`**, an Express `Router` with two GET endpoints:

- **`GET /`** — returns process uptime and a fixed “live” payload via `sendSuccess` (no Mongo check; avoids probe restart storms).
- **`GET /ready`** — calls `mongoReady()`, inspects optional Redis via `getRedis()`, labels SMTP with `isOutboundEmailConfigured()`, and returns `503` with `sendError` when Mongo is down or Redis is enabled but not ready.

## Libraries used

- **express** – third-party dependency for this module.
- **../../database/connection/mongoose.js** (`{ mongoReady }`) – relative project import.
- **../config/redis.js** (`{ getRedis }`) – relative project import.
- **../utils/api-response.js** (`{ sendSuccess, sendError }`) – relative project import.
- **../core/async-handler.js** (`{ asyncHandler }`) – relative project import.
- **../services/email/smtp-mailer.service.js** (`{ isOutboundEmailConfigured }`) – relative project import.
- **../core/errors/http-status.js** (`{ HttpStatus }`) – relative project import.

## Logic implemented

1. Build `healthRouter` with `Router()` and register both routes with `asyncHandler` so failures surface consistently.
2. **`GET /`** — respond with service name, `status: 'live'`, and rounded `process.uptime()` seconds.
3. **`GET /ready`** — read `mongoReady()`; derive Redis status (`disabled`, `up`, or `down`) when a Redis client exists; record SMTP as configured or disabled.
4. Compute **healthy** when Mongo is up and either Redis is absent/disabled or Redis reports `up`; otherwise respond with `NOT_READY` and HTTP 503 including check details.
5. Successful readiness returns the aggregated checks under `sendSuccess`.

## Roles

- **public** — Indirect: probes are usually unauthenticated infrastructure traffic, not end-user UI.
- **inspector** — Indirect: same as other roles; availability affects every client equally.
- **inspector_admin** — Indirect: same.
- **decree_upload_department** — Indirect: same.
- **system_admin** — Partially: operators rely on readiness semantics when diagnosing outages or deployments.
